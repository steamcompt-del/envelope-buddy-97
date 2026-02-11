import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RecurringTransaction {
  id: string;
  user_id: string;
  household_id: string | null;
  envelope_id: string;
  amount: number;
  description: string;
  merchant: string | null;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
  next_due_date: string;
  is_active: boolean;
}

function calculateNextDueDate(currentDate: Date, frequency: string): Date {
  const next = new Date(currentDate);
  switch (frequency) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0];
    const currentMonthKey = getMonthKey(today);

    console.log(`[${new Date().toISOString()}] Processing recurring transactions for ${today}`);

    // Fetch all active recurring transactions that are due
    const { data: dueRecurring, error: fetchError } = await supabase
      .from("recurring_transactions")
      .select("*")
      .eq("is_active", true)
      .lte("next_due_date", today);

    if (fetchError) throw fetchError;

    console.log(`Found ${dueRecurring?.length || 0} due recurring transactions`);

    let processedCount = 0;
    let errorCount = 0;
    const results: any[] = [];

    for (const recurring of (dueRecurring || []) as RecurringTransaction[]) {
      try {
        console.log(`Processing: ${recurring.description} (${recurring.amount}€)`);

        // 1. Create the transaction
        const { data: transaction, error: txError } = await supabase
          .from("transactions")
          .insert({
            user_id: recurring.user_id,
            household_id: recurring.household_id,
            envelope_id: recurring.envelope_id,
            amount: recurring.amount,
            description: recurring.description,
            merchant: recurring.merchant,
            date: today,
          })
          .select("id")
          .single();

        if (txError) throw txError;
        console.log(`✅ Transaction created: ${transaction.id}`);

        // 2. Update envelope_allocations spent
        const { data: allocation } = await supabase
          .from("envelope_allocations")
          .select("id, spent")
          .eq("envelope_id", recurring.envelope_id)
          .eq("month_key", currentMonthKey)
          .maybeSingle();

        if (allocation) {
          await supabase
            .from("envelope_allocations")
            .update({ spent: Number(allocation.spent) + recurring.amount })
            .eq("id", allocation.id);
        } else {
          // Create allocation if it doesn't exist
          await supabase.from("envelope_allocations").insert({
            user_id: recurring.user_id,
            household_id: recurring.household_id,
            envelope_id: recurring.envelope_id,
            month_key: currentMonthKey,
            allocated: 0,
            spent: recurring.amount,
          });
        }

        // 3. Calculate and update next due date
        const currentDue = new Date(recurring.next_due_date);
        const nextDue = calculateNextDueDate(currentDue, recurring.frequency);
        const nextDueStr = nextDue.toISOString().split("T")[0];

        await supabase
          .from("recurring_transactions")
          .update({
            next_due_date: nextDueStr,
            updated_at: new Date().toISOString(),
          })
          .eq("id", recurring.id);

        console.log(`✅ Next due date updated to: ${nextDueStr}`);

        // 4. Log activity (only if household_id exists, since activity_log requires it)
        if (recurring.household_id) {
          await supabase.from("activity_log").insert({
            household_id: recurring.household_id,
            user_id: recurring.user_id,
            action: "expense_added",
            entity_type: "transaction",
            entity_id: transaction.id,
            details: {
              amount: recurring.amount,
              description: recurring.description,
              auto_applied: true,
              recurring_id: recurring.id,
            },
          });
        }

        processedCount++;
        results.push({
          recurring_id: recurring.id,
          transaction_id: transaction.id,
          description: recurring.description,
          amount: recurring.amount,
          next_due_date: nextDueStr,
          status: "success",
        });
      } catch (error) {
        console.error(`Error processing recurring ${recurring.id}:`, error);
        errorCount++;
        results.push({
          recurring_id: recurring.id,
          description: recurring.description,
          status: "error",
          error: error.message,
        });
      }
    }

    const summary = {
      date: today,
      total_due: dueRecurring?.length || 0,
      processed: processedCount,
      errors: errorCount,
      results,
    };

    console.log("Processing complete:", JSON.stringify(summary));

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
