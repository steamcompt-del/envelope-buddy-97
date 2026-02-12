import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    console.log(`[${now.toISOString()}] Processing savings auto-contributions for ${currentMonthKey}`);

    // Fetch active auto-contribute goals (not paused)
    const { data: goals, error: goalsError } = await supabase
      .from("savings_goals")
      .select("*, envelopes(user_id, household_id, name)")
      .eq("auto_contribute", true)
      .eq("is_paused", false);

    if (goalsError) throw goalsError;

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const results: any[] = [];

    for (const goal of goals || []) {
      try {
        const envelope = goal.envelopes;
        if (!envelope) {
          console.warn(`Goal ${goal.id}: envelope not found, skipping`);
          continue;
        }

        const userId = envelope.user_id;
        const hId = envelope.household_id;

        // === IDEMPOTENCY CHECK ===
        // Check if we already processed this goal this month
        const { data: existingHistory, error: historyError } = await supabase
          .from("auto_allocation_history")
          .select("id")
          .eq("envelope_id", goal.envelope_id)
          .eq("month_key", currentMonthKey)
          .eq("status", "success")
          .limit(1);

        if (historyError) {
          console.error(`Error checking history for goal ${goal.id}:`, historyError);
        }

        if (existingHistory && existingHistory.length > 0) {
          console.log(`⏭️ Goal ${goal.id} already processed this month, skipping`);
          skippedCount++;
          results.push({
            goalId: goal.id,
            goalName: goal.name || envelope.name,
            status: "skipped",
            reason: "already_processed_this_month",
          });
          continue;
        }

        // Calculate contribution amount
        let contributionAmount = 0;

        if (goal.monthly_contribution && goal.monthly_contribution > 0) {
          contributionAmount = Number(goal.monthly_contribution);
        } else if (goal.contribution_percentage && goal.contribution_percentage > 0) {
          // Get current budget to calculate percentage
          let budgetQuery = supabase
            .from("monthly_budgets")
            .select("to_be_budgeted")
            .eq("month_key", currentMonthKey);

          if (hId) {
            budgetQuery = budgetQuery.eq("household_id", hId);
          } else {
            budgetQuery = budgetQuery.eq("user_id", userId).is("household_id", null);
          }

          const { data: budget } = await budgetQuery.maybeSingle();
          if (budget && Number(budget.to_be_budgeted) > 0) {
            contributionAmount = Math.round(
              (Number(budget.to_be_budgeted) * goal.contribution_percentage) / 100 * 100
            ) / 100;
          }
        }

        if (contributionAmount <= 0) continue;

        // === CHECK IF TARGET ALREADY REACHED ===
        const { data: allocations } = await supabase
          .from("envelope_allocations")
          .select("allocated, spent")
          .eq("envelope_id", goal.envelope_id);

        const currentSaved = (allocations || []).reduce(
          (sum: number, a: any) => sum + (Number(a.allocated) - Number(a.spent)),
          0
        );

        if (goal.target_amount > 0 && currentSaved >= Number(goal.target_amount)) {
          console.log(`✅ Goal ${goal.id} already reached target (${currentSaved}/${goal.target_amount}), skipping`);
          skippedCount++;
          results.push({
            goalId: goal.id,
            goalName: goal.name || envelope.name,
            status: "skipped",
            reason: "target_reached",
          });
          continue;
        }

        // Cap at remaining amount needed
        if (goal.target_amount > 0) {
          const remaining = Number(goal.target_amount) - currentSaved;
          contributionAmount = Math.min(contributionAmount, remaining);
        }

        // === CHECK AVAILABLE BUDGET (re-read for freshness) ===
        let currentBudgetQuery = supabase
          .from("monthly_budgets")
          .select("to_be_budgeted, id")
          .eq("month_key", currentMonthKey);

        if (hId) {
          currentBudgetQuery = currentBudgetQuery.eq("household_id", hId);
        } else {
          currentBudgetQuery = currentBudgetQuery.eq("user_id", userId).is("household_id", null);
        }

        const { data: currentBudget } = await currentBudgetQuery.maybeSingle();

        if (!currentBudget || Number(currentBudget.to_be_budgeted) <= 0) {
          console.log(`Insufficient funds for goal ${goal.id}: budget=${currentBudget?.to_be_budgeted ?? 0}`);
          results.push({
            goalId: goal.id,
            goalName: goal.name || envelope.name,
            status: "skipped",
            reason: "insufficient_funds",
          });
          continue;
        }

        // Cap contribution to available budget
        contributionAmount = Math.min(contributionAmount, Number(currentBudget.to_be_budgeted));
        if (contributionAmount <= 0) continue;

        // === STEP 1: Allocate to envelope FIRST (atomic RPC) ===
        const { error: allocError } = await supabase.rpc("adjust_allocation_atomic", {
          p_envelope_id: goal.envelope_id,
          p_month_key: currentMonthKey,
          p_amount: contributionAmount,
        });

        if (allocError) {
          console.error(`Failed to allocate to envelope ${goal.envelope_id}:`, allocError);
          errorCount++;
          results.push({
            goalId: goal.id,
            goalName: goal.name || envelope.name,
            status: "error",
            error: `Allocation failed: ${allocError.message}`,
          });

          // Log error to history
          await supabase.from("auto_allocation_history").insert({
            user_id: userId,
            household_id: hId,
            month_key: currentMonthKey,
            goal_name: goal.name || envelope.name,
            envelope_id: goal.envelope_id,
            amount: 0,
            priority: goal.priority,
            status: "error",
            error_message: `Allocation failed: ${allocError.message}`,
          });
          continue;
        }

        // === STEP 2: Deduct from budget (atomic RPC) ===
        const { error: budgetError } = await supabase.rpc("adjust_to_be_budgeted", {
          p_month_key: currentMonthKey,
          p_household_id: hId || null,
          p_user_id: userId,
          p_amount: -contributionAmount,
        });

        if (budgetError) {
          console.error(`Failed to deduct budget, rolling back allocation:`, budgetError);
          // Rollback allocation
          await supabase.rpc("adjust_allocation_atomic", {
            p_envelope_id: goal.envelope_id,
            p_month_key: currentMonthKey,
            p_amount: -contributionAmount,
          });
          errorCount++;
          results.push({
            goalId: goal.id,
            goalName: goal.name || envelope.name,
            status: "error",
            error: `Budget deduction failed: ${budgetError.message}`,
          });

          await supabase.from("auto_allocation_history").insert({
            user_id: userId,
            household_id: hId,
            month_key: currentMonthKey,
            goal_name: goal.name || envelope.name,
            envelope_id: goal.envelope_id,
            amount: 0,
            priority: goal.priority,
            status: "error",
            error_message: `Budget deduction failed (allocation rolled back): ${budgetError.message}`,
          });
          continue;
        }

        // === SUCCESS: Log to history ===
        await supabase.from("auto_allocation_history").insert({
          user_id: userId,
          household_id: hId,
          month_key: currentMonthKey,
          goal_name: goal.name || envelope.name,
          envelope_id: goal.envelope_id,
          amount: contributionAmount,
          priority: goal.priority,
          status: "success",
        });

        // Log activity for households
        if (hId) {
          await supabase.from("activity_log").insert({
            household_id: hId,
            user_id: userId,
            action: "allocation_made",
            entity_type: "envelope",
            entity_id: goal.envelope_id,
            details: {
              amount: contributionAmount,
              auto_contribution: true,
              savings_goal_id: goal.id,
              envelope_name: envelope.name,
            },
          });
        }

        processedCount++;
        const goalName = goal.name || envelope.name;
        console.log(`✅ Contributed ${contributionAmount}€ to goal ${goal.id} (${goalName})`);
        results.push({
          goalId: goal.id,
          goalName,
          amount: contributionAmount,
          status: "success",
        });
      } catch (error) {
        console.error(`Error processing goal ${goal.id}:`, error);
        errorCount++;
        results.push({
          goalId: goal.id,
          status: "error",
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedCount} auto-contributions, ${skippedCount} skipped`,
        processed: processedCount,
        skipped: skippedCount,
        errors: errorCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
