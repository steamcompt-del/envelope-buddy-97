import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    console.log(`[${now.toISOString()}] Processing savings auto-contributions for ${currentMonthKey}`);

    // Fetch active auto-contribute goals
    const { data: goals, error: goalsError } = await supabase
      .from('savings_goals')
      .select('*, envelopes(user_id, household_id, name)')
      .eq('auto_contribute', true)
      .eq('is_paused', false);

    if (goalsError) throw goalsError;

    let processedCount = 0;
    let errorCount = 0;

    for (const goal of goals || []) {
      try {
        const envelope = goal.envelopes;
        if (!envelope) continue;

        let contributionAmount = 0;

        if (goal.monthly_contribution && goal.monthly_contribution > 0) {
          contributionAmount = goal.monthly_contribution;
        } else if (goal.contribution_percentage && goal.contribution_percentage > 0) {
          const { data: budget } = await supabase
            .from('monthly_budgets')
            .select('to_be_budgeted')
            .eq('month_key', currentMonthKey)
            .eq(envelope.household_id ? 'household_id' : 'user_id',
                envelope.household_id || envelope.user_id)
            .single();

          if (budget && budget.to_be_budgeted > 0) {
            contributionAmount = (budget.to_be_budgeted * goal.contribution_percentage) / 100;
          }
        }

        if (contributionAmount <= 0) continue;

        // Check current allocation vs target
        const { data: allocations } = await supabase
          .from('envelope_allocations')
          .select('allocated, spent')
          .eq('envelope_id', goal.envelope_id);

        const currentSaved = (allocations || []).reduce((sum: number, a: any) => 
          sum + (Number(a.allocated) - Number(a.spent)), 0);

        if (goal.target_amount > 0 && currentSaved >= goal.target_amount) {
          console.log(`Goal ${goal.id} already reached target, skipping`);
          continue;
        }

        // Cap at remaining amount
        if (goal.target_amount > 0) {
          const remaining = goal.target_amount - currentSaved;
          contributionAmount = Math.min(contributionAmount, remaining);
        }

        // Check available budget
        const { data: currentBudget } = await supabase
          .from('monthly_budgets')
          .select('to_be_budgeted, id')
          .eq('month_key', currentMonthKey)
          .eq(envelope.household_id ? 'household_id' : 'user_id',
              envelope.household_id || envelope.user_id)
          .single();

        if (!currentBudget || currentBudget.to_be_budgeted < contributionAmount) {
          console.log(`Insufficient funds for goal ${goal.id}`);
          continue;
        }

        // Deduct from to_be_budgeted
        await supabase
          .from('monthly_budgets')
          .update({ to_be_budgeted: currentBudget.to_be_budgeted - contributionAmount })
          .eq('id', currentBudget.id);

        // Add to envelope allocation
        const { data: allocation } = await supabase
          .from('envelope_allocations')
          .select('id, allocated')
          .eq('envelope_id', goal.envelope_id)
          .eq('month_key', currentMonthKey)
          .maybeSingle();

        if (allocation) {
          await supabase
            .from('envelope_allocations')
            .update({ allocated: allocation.allocated + contributionAmount })
            .eq('id', allocation.id);
        } else {
          await supabase
            .from('envelope_allocations')
            .insert({
              user_id: envelope.user_id,
              household_id: envelope.household_id,
              envelope_id: goal.envelope_id,
              month_key: currentMonthKey,
              allocated: contributionAmount,
              spent: 0,
            });
        }

        // Log activity
        if (envelope.household_id) {
          await supabase
            .from('activity_log')
            .insert({
              household_id: envelope.household_id,
              user_id: envelope.user_id,
              action: 'allocation_made',
              entity_type: 'envelope',
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
        console.log(`✅ Contributed ${contributionAmount}€ to goal ${goal.id} (${envelope.name})`);
      } catch (error) {
        console.error(`Error processing goal ${goal.id}:`, error);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedCount} auto-contributions`,
        errors: errorCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
