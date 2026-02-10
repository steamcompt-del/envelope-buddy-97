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

    // Fetch active savings goals with auto_contribute enabled
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

    for (const [key, userGoals] of Object.entries(grouped)) {
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

      const { data: budgets } = await budgetQuery;
      if (!budgets || budgets.length === 0) continue;

      let availableBudget = Number(budgets[0].to_be_budgeted);
      if (availableBudget <= 0) continue;

      for (const goal of userGoals) {
        if (availableBudget <= 0) break;

        const remaining = Number(goal.target_amount) - Number(goal.current_amount);
        if (remaining <= 0) continue;

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

        // Allocate to the envelope
        let allocQuery = supabase
          .from("envelope_allocations")
          .select("*")
          .eq("envelope_id", goal.envelope_id)
          .eq("month_key", monthKey);

        if (hId) {
          allocQuery = allocQuery.eq("household_id", hId);
        } else {
          allocQuery = allocQuery.is("household_id", null);
        }

        const { data: allocs } = await allocQuery;

        if (allocs && allocs.length > 0) {
          await supabase
            .from("envelope_allocations")
            .update({ allocated: Number(allocs[0].allocated) + contribution })
            .eq("id", allocs[0].id);
        } else {
          await supabase
            .from("envelope_allocations")
            .insert({
              envelope_id: goal.envelope_id,
              month_key: monthKey,
              user_id: userId,
              household_id: hId,
              allocated: contribution,
              spent: 0,
            });
        }

        // Update budget
        await supabase
          .from("monthly_budgets")
          .update({ to_be_budgeted: availableBudget - contribution })
          .eq("id", budgets[0].id);

        // Update savings goal current_amount
        await supabase
          .from("savings_goals")
          .update({ current_amount: Number(goal.current_amount) + contribution })
          .eq("id", goal.id);

        availableBudget -= contribution;
        totalAllocated += contribution;

        results.push({
          goalName: goal.name || (goal.envelopes as any)?.name || "Objectif",
          amount: contribution,
          priority: goal.priority,
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
