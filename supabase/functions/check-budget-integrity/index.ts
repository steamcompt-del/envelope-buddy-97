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

    const { userId, householdId, monthKey, fix = false } = await req.json();

    console.log(`[Integrity Check] Checking ${monthKey} for user/household: ${userId || householdId}`);

    // Fetch total incomes
    let incomeQuery = supabase
      .from('incomes')
      .select('amount')
      .eq('month_key', monthKey);

    if (householdId) {
      incomeQuery = incomeQuery.eq('household_id', householdId);
    } else {
      incomeQuery = incomeQuery.eq('user_id', userId).is('household_id', null);
    }

    const { data: incomes, error: incomeError } = await incomeQuery;
    if (incomeError) throw incomeError;

    const totalIncomes = (incomes || []).reduce((sum: number, inc: any) => sum + Number(inc.amount), 0);

    // Fetch total allocations
    let allocQuery = supabase
      .from('envelope_allocations')
      .select('allocated')
      .eq('month_key', monthKey);

    if (householdId) {
      allocQuery = allocQuery.eq('household_id', householdId);
    } else {
      allocQuery = allocQuery.eq('user_id', userId).is('household_id', null);
    }

    const { data: allocations, error: allocError } = await allocQuery;
    if (allocError) throw allocError;

    const totalAllocations = (allocations || []).reduce((sum: number, alloc: any) => sum + Number(alloc.allocated), 0);

    // Fetch current to_be_budgeted
    let budgetQuery = supabase
      .from('monthly_budgets')
      .select('id, to_be_budgeted')
      .eq('month_key', monthKey);

    if (householdId) {
      budgetQuery = budgetQuery.eq('household_id', householdId);
    } else {
      budgetQuery = budgetQuery.eq('user_id', userId).is('household_id', null);
    }

    const { data: budgets, error: budgetError } = await budgetQuery.maybeSingle();
    if (budgetError) throw budgetError;

    const storedToBeBudgeted = budgets ? Number(budgets.to_be_budgeted) : 0;
    const calculatedToBeBudgeted = totalIncomes - totalAllocations;
    const discrepancy = Math.abs(storedToBeBudgeted - calculatedToBeBudgeted);

    const isValid = discrepancy < 0.005; // Allow tiny floating point differences

    let result = {
      isValid,
      totalIncomes,
      totalAllocations,
      storedToBeBudgeted,
      calculatedToBeBudgeted,
      discrepancy,
      message: isValid ? 'Budget intègre ✓' : `Incohérence détectée : ${discrepancy.toFixed(2)}€ de différence`,
      fixed: false,
    };

    // Fix if requested and not valid
    if (!isValid && fix && budgets) {
      const { error: updateError } = await supabase
        .from('monthly_budgets')
        .update({ to_be_budgeted: calculatedToBeBudgeted })
        .eq('id', budgets.id);

      if (updateError) throw updateError;

      result.fixed = true;
      result.isValid = true;
      result.message = 'Budget corrigé ✓';
      console.log(`✓ Budget corrected for ${monthKey}: ${storedToBeBudgeted}€ → ${calculatedToBeBudgeted}€`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Integrity check error:', error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
