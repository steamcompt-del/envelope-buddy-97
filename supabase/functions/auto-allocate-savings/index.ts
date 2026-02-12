import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRIORITY_ORDER = ["essential", "high", "medium", "low"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get the user from auth header if called by a user, or process all users if called by cron
    const authHeader = req.headers.get("Authorization");
    let targetUserId: string | null = null;

    if (authHeader && authHeader !== `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
      targetUserId = user?.id || null;
    }

    // Parse optional body
    let householdId: string | null = null;
    let monthKey: string | null = null;
    try {
      const body = await req.json();
      householdId = body.householdId || null;
      monthKey = body.monthKey || null;
    } catch {
      // No body provided
    }

    if (!monthKey) {
      const now = new Date();
      monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    // Fetch active savings goals with auto_contribute enabled (not paused)
    let goalsQuery = supabase
      .from("savings_goals")
      .select("*, envelopes!inner(id, name)")
      .eq("auto_contribute", true)
      .eq("is_paused", false);

    if (targetUserId) {
      goalsQuery = goalsQuery.eq("user_id", targetUserId);
    }
    if (householdId) {
      goalsQuery = goalsQuery.eq("household_id", householdId);
    }

    const { data: goals, error: goalsError } = await goalsQuery;
    if (goalsError) throw goalsError;
    if (!goals || goals.length === 0) {
      return new Response(
        JSON.stringify({ message: "Aucun objectif avec contribution automatique", allocated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sort goals by priority
    goals.sort((a: any, b: any) => {
      return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority);
    });

    // Group by user+household to process each budget independently
    const groupKey = (g: any) => `${g.user_id}__${g.household_id || "personal"}`;
    const grouped: Record<string, any[]> = {};
    for (const goal of goals) {
      const key = groupKey(goal);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(goal);
    }

    let totalAllocated = 0;
    const results: any[] = [];

    for (const [_key, userGoals] of Object.entries(grouped)) {
      const userId = userGoals[0].user_id;
      const hId = userGoals[0].household_id;

      // Get current budget for this month
      let budgetQuery = supabase
        .from("monthly_budgets")
        .select("*")
        .eq("month_key", monthKey)
        .eq("user_id", userId);

      if (hId) {
        budgetQuery = budgetQuery.eq("household_id", hId);
      } else {
        budgetQuery = budgetQuery.is("household_id", null);
      }

      const { data: budgets, error: budgetError } = await budgetQuery;
      if (budgetError) {
        console.error(`Error fetching budget for user ${userId}:`, budgetError);
        results.push({
          goalName: "—",
          amount: 0,
          priority: "error",
          error: `Impossible de récupérer le budget : ${budgetError.message}`,
        });
        await supabase.from("auto_allocation_history").insert({
          user_id: userId, household_id: hId, month_key: monthKey!,
          goal_name: "—", envelope_id: null, amount: 0, priority: "error",
          status: "error", error_message: budgetError.message,
        });
        continue;
      }
      if (!budgets || budgets.length === 0) {
        console.warn(`No budget found for user ${userId}, month ${monthKey}`);
        continue;
      }

      let availableBudget = Number(budgets[0].to_be_budgeted);
      if (availableBudget <= 0) {
        results.push({
          goalName: "—",
          amount: 0,
          priority: "info",
          skipped: true,
          reason: `Budget insuffisant (${availableBudget.toFixed(2)}€)`,
        });
        continue;
      }

      for (const goal of userGoals) {
        if (availableBudget <= 0) break;

        const goalName = goal.name || (goal.envelopes as any)?.name || "Objectif";

        // === IDEMPOTENCY CHECK ===
        const { data: existingAlloc } = await supabase
          .from("auto_allocation_history")
          .select("id")
          .eq("envelope_id", goal.envelope_id)
          .eq("month_key", monthKey)
          .eq("status", "success")
          .limit(1);

        if (existingAlloc && existingAlloc.length > 0) {
          console.log(`⏭️ Goal "${goalName}" already auto-allocated this month, skipping`);
          results.push({ goalName, amount: 0, priority: goal.priority, skipped: true, reason: "already_processed" });
          continue;
        }

        // Calculate current saved amount from envelope allocations
        const { data: allocs, error: allocError } = await supabase
          .from("envelope_allocations")
          .select("allocated, spent")
          .eq("envelope_id", goal.envelope_id);

        if (allocError) {
          console.error(`Error fetching allocations for envelope ${goal.envelope_id}:`, allocError);
          results.push({ goalName, amount: 0, priority: goal.priority, error: allocError.message });
          continue;
        }

        const currentSaved = (allocs || []).reduce(
          (sum: number, a: any) => sum + (Number(a.allocated) - Number(a.spent)),
          0
        );

        // === TARGET REACHED CHECK ===
        const remaining = Number(goal.target_amount) - currentSaved;
        if (remaining <= 0) {
          console.log(`✅ Goal "${goalName}" already reached target, skipping`);
          results.push({ goalName, amount: 0, priority: goal.priority, skipped: true, reason: "target_reached" });
          continue;
        }

        let contribution = 0;
        if (goal.monthly_contribution) {
          contribution = Math.min(Number(goal.monthly_contribution), remaining, availableBudget);
        } else if (goal.contribution_percentage) {
          contribution = Math.min(
            Math.round((availableBudget * goal.contribution_percentage) / 100 * 100) / 100,
            remaining,
            availableBudget
          );
        }

        if (contribution <= 0) continue;

        // === STEP 1: Allocate to envelope (atomic RPC) ===
        const { error: rpcAllocError } = await supabase.rpc("adjust_allocation_atomic", {
          p_envelope_id: goal.envelope_id,
          p_month_key: monthKey,
          p_amount: contribution,
        });

        if (rpcAllocError) {
          console.error(`Failed to allocate to ${goal.envelope_id}:`, rpcAllocError);
          results.push({ goalName, amount: 0, priority: goal.priority, error: rpcAllocError.message });
          await supabase.from("auto_allocation_history").insert({
            user_id: userId, household_id: hId, month_key: monthKey!,
            goal_name: goalName, envelope_id: goal.envelope_id,
            amount: 0, priority: goal.priority,
            status: "error", error_message: `Allocation RPC failed: ${rpcAllocError.message}`,
          });
          continue;
        }

        // === STEP 2: Deduct from budget (atomic RPC) ===
        const { error: rpcBudgetError } = await supabase.rpc("adjust_to_be_budgeted", {
          p_month_key: monthKey,
          p_household_id: hId || null,
          p_user_id: userId,
          p_amount: -contribution,
        });

        if (rpcBudgetError) {
          console.error(`Failed to deduct budget, rolling back allocation:`, rpcBudgetError);
          // Rollback allocation
          await supabase.rpc("adjust_allocation_atomic", {
            p_envelope_id: goal.envelope_id,
            p_month_key: monthKey,
            p_amount: -contribution,
          });
          results.push({ goalName, amount: 0, priority: goal.priority, error: rpcBudgetError.message });
          await supabase.from("auto_allocation_history").insert({
            user_id: userId, household_id: hId, month_key: monthKey!,
            goal_name: goalName, envelope_id: goal.envelope_id,
            amount: 0, priority: goal.priority,
            status: "error", error_message: `Budget RPC failed (allocation rolled back): ${rpcBudgetError.message}`,
          });
          continue;
        }

        availableBudget -= contribution;
        totalAllocated += contribution;

        results.push({ goalName, amount: contribution, priority: goal.priority });

        // Log to history table
        await supabase.from("auto_allocation_history").insert({
          user_id: userId,
          household_id: hId,
          month_key: monthKey,
          goal_name: goalName,
          envelope_id: goal.envelope_id,
          amount: contribution,
          priority: goal.priority,
          status: "success",
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `✨ ${totalAllocated.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} automatiquement alloués à vos objectifs`,
        totalAllocated,
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in auto-allocate-savings:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
