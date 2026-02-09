import { getBackendClient } from '@/lib/backendClient';
import { Envelope, Transaction, Income, MonthlyBudget } from '@/contexts/BudgetContext';

const supabase = getBackendClient();

// Database types
interface DbEnvelope {
  id: string;
  user_id: string;
  household_id: string | null;
  name: string;
  icon: string;
  color: string;
  position: number;
  rollover: boolean;
  created_at: string;
}

interface DbEnvelopeAllocation {
  id: string;
  user_id: string;
  household_id: string | null;
  envelope_id: string;
  month_key: string;
  allocated: number;
  spent: number;
  created_at: string;
}

interface DbTransaction {
  id: string;
  user_id: string;
  household_id: string | null;
  envelope_id: string;
  amount: number;
  description: string;
  merchant: string | null;
  receipt_url: string | null;
  receipt_path: string | null;
  notes: string | null;
  date: string;
  created_at: string;
}

interface DbIncome {
  id: string;
  user_id: string;
  household_id: string | null;
  month_key: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
}

interface DbMonthlyBudget {
  id: string;
  user_id: string;
  household_id: string | null;
  month_key: string;
  to_be_budgeted: number;
  created_at: string;
}

// Context for queries - either household or user-based
interface QueryContext {
  userId: string;
  householdId?: string;
}

// Helper to build query with household or user filter
function addContextFilter<T extends { eq: (col: string, val: string) => T }>(
  query: T,
  ctx: QueryContext
): T {
  if (ctx.householdId) {
    return query.eq('household_id', ctx.householdId);
  }
  return query.eq('user_id', ctx.userId);
}

export async function fetchMonthData(ctx: QueryContext, monthKey: string): Promise<MonthlyBudget> {
  // Build base queries
  let monthlyBudgetQuery = supabase
    .from('monthly_budgets')
    .select('*')
    .eq('month_key', monthKey);
  
  let envelopesQuery = supabase
    .from('envelopes')
    .select('*')
    .order('position', { ascending: true });
  
  let allocationsQuery = supabase
    .from('envelope_allocations')
    .select('*')
    .eq('month_key', monthKey);
  
  let transactionsQuery = supabase
    .from('transactions')
    .select('*')
    .gte('date', `${monthKey}-01`)
    .lt('date', getNextMonthKey(monthKey) + '-01');
  
  let incomesQuery = supabase
    .from('incomes')
    .select('*')
    .eq('month_key', monthKey);

  // Apply context filter
  if (ctx.householdId) {
    monthlyBudgetQuery = monthlyBudgetQuery.eq('household_id', ctx.householdId);
    envelopesQuery = envelopesQuery.eq('household_id', ctx.householdId);
    allocationsQuery = allocationsQuery.eq('household_id', ctx.householdId);
    transactionsQuery = transactionsQuery.eq('household_id', ctx.householdId);
    incomesQuery = incomesQuery.eq('household_id', ctx.householdId);
  } else {
    monthlyBudgetQuery = monthlyBudgetQuery.eq('user_id', ctx.userId).is('household_id', null);
    envelopesQuery = envelopesQuery.eq('user_id', ctx.userId).is('household_id', null);
    allocationsQuery = allocationsQuery.eq('user_id', ctx.userId).is('household_id', null);
    transactionsQuery = transactionsQuery.eq('user_id', ctx.userId).is('household_id', null);
    incomesQuery = incomesQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  // Execute all queries
  const [
    { data: monthlyBudget },
    { data: envelopes },
    { data: allocations },
    { data: transactions },
    { data: incomes },
  ] = await Promise.all([
    monthlyBudgetQuery.single(),
    envelopesQuery,
    allocationsQuery,
    transactionsQuery,
    incomesQuery,
  ]);

  // Map allocations by envelope_id
  const allocationMap = new Map((allocations || []).map(a => [a.envelope_id, a]));

  // Build envelope list - ONLY include envelopes that have an allocation for this month
  const envelopeList: Envelope[] = (envelopes || [])
    .filter((env: DbEnvelope) => allocationMap.has(env.id))
    .map((env: DbEnvelope) => {
      const allocation = allocationMap.get(env.id)!;
      return {
        id: env.id,
        name: env.name,
        icon: env.icon,
        color: env.color,
        allocated: Number(allocation.allocated),
        spent: Number(allocation.spent),
        rollover: env.rollover,
      };
    });

  // Build transaction list
  const transactionList: Transaction[] = (transactions || []).map((t: DbTransaction) => ({
    id: t.id,
    envelopeId: t.envelope_id,
    amount: Number(t.amount),
    description: t.description,
    date: t.date,
    createdAt: t.created_at,
    merchant: t.merchant || undefined,
    receiptUrl: t.receipt_url || undefined,
    receiptPath: t.receipt_path || undefined,
    notes: t.notes || undefined,
  }));

  // Build income list
  const incomeList: Income[] = (incomes || []).map((i: DbIncome) => ({
    id: i.id,
    amount: Number(i.amount),
    description: i.description,
    date: i.date,
  }));

  return {
    monthKey,
    toBeBudgeted: monthlyBudget ? Number(monthlyBudget.to_be_budgeted) : 0,
    envelopes: envelopeList,
    transactions: transactionList,
    incomes: incomeList,
  };
}

export async function fetchAvailableMonths(ctx: QueryContext): Promise<string[]> {
  let query = supabase
    .from('monthly_budgets')
    .select('month_key')
    .order('month_key', { ascending: false });

  if (ctx.householdId) {
    query = query.eq('household_id', ctx.householdId);
  } else {
    query = query.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data } = await query;
  return (data || []).map((m: { month_key: string }) => m.month_key);
}

export async function ensureMonthExists(ctx: QueryContext, monthKey: string): Promise<void> {
  let query = supabase
    .from('monthly_budgets')
    .select('id')
    .eq('month_key', monthKey);

  if (ctx.householdId) {
    query = query.eq('household_id', ctx.householdId);
  } else {
    query = query.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: existing } = await query.single();

  if (!existing) {
    await supabase.from('monthly_budgets').insert({
      user_id: ctx.userId,
      household_id: ctx.householdId || null,
      month_key: monthKey,
      to_be_budgeted: 0,
    });
  }
}

// Income operations
export async function addIncomeDb(ctx: QueryContext, monthKey: string, amount: number, description: string, date?: Date): Promise<string> {
  // Ensure monthly_budgets entry exists first
  await ensureMonthExists(ctx, monthKey);

  // Insert income
  const { data: income, error: incomeError } = await supabase
    .from('incomes')
    .insert({
      user_id: ctx.userId,
      household_id: ctx.householdId || null,
      month_key: monthKey,
      amount,
      description,
      date: date ? date.toISOString() : new Date().toISOString(),
    })
    .select('id')
    .single();

  if (incomeError) throw incomeError;

  // Update toBeBudgeted - now we're sure the entry exists
  let budgetQuery = supabase
    .from('monthly_budgets')
    .select('to_be_budgeted, id')
    .eq('month_key', monthKey);

  if (ctx.householdId) {
    budgetQuery = budgetQuery.eq('household_id', ctx.householdId);
  } else {
    budgetQuery = budgetQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: current, error: selectError } = await budgetQuery.single();

  if (selectError) {
    console.error('Error fetching monthly_budgets:', selectError);
    throw selectError;
  }

  if (current) {
    const { error: updateError } = await supabase
      .from('monthly_budgets')
      .update({ to_be_budgeted: (Number(current.to_be_budgeted) || 0) + amount })
      .eq('id', current.id);
    
    if (updateError) {
      console.error('Error updating to_be_budgeted:', updateError);
      throw updateError;
    }
  }

  return income.id;
}

export async function updateIncomeDb(ctx: QueryContext, monthKey: string, incomeId: string, newAmount: number, newDescription: string, oldAmount: number, newDate?: Date): Promise<void> {
  await supabase
    .from('incomes')
    .update({ 
      amount: newAmount, 
      description: newDescription,
      date: newDate ? newDate.toISOString() : undefined,
    })
    .eq('id', incomeId);

  const diff = newAmount - oldAmount;
  if (diff !== 0) {
    let budgetQuery = supabase
      .from('monthly_budgets')
      .select('to_be_budgeted, id')
      .eq('month_key', monthKey);

    if (ctx.householdId) {
      budgetQuery = budgetQuery.eq('household_id', ctx.householdId);
    } else {
      budgetQuery = budgetQuery.eq('user_id', ctx.userId).is('household_id', null);
    }

    const { data: current } = await budgetQuery.single();

    if (current) {
      await supabase
        .from('monthly_budgets')
        .update({ to_be_budgeted: (Number(current.to_be_budgeted) || 0) + diff })
        .eq('id', current.id);
    }
  }
}

export async function deleteIncomeDb(ctx: QueryContext, monthKey: string, incomeId: string, amount: number): Promise<void> {
  await supabase.from('incomes').delete().eq('id', incomeId);

  let budgetQuery = supabase
    .from('monthly_budgets')
    .select('to_be_budgeted, id')
    .eq('month_key', monthKey);

  if (ctx.householdId) {
    budgetQuery = budgetQuery.eq('household_id', ctx.householdId);
  } else {
    budgetQuery = budgetQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: current } = await budgetQuery.single();

  if (current) {
    await supabase
      .from('monthly_budgets')
      .update({ to_be_budgeted: Math.max(0, (Number(current.to_be_budgeted) || 0) - amount) })
      .eq('id', current.id);
  }
}

// Envelope operations
export async function createEnvelopeDb(ctx: QueryContext, monthKey: string, name: string, icon: string, color: string): Promise<string> {
  // Get max position
  let posQuery = supabase
    .from('envelopes')
    .select('position')
    .order('position', { ascending: false })
    .limit(1);

  if (ctx.householdId) {
    posQuery = posQuery.eq('household_id', ctx.householdId);
  } else {
    posQuery = posQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: maxPositionData } = await posQuery.single();
  const newPosition = (maxPositionData?.position ?? -1) + 1;

  const { data: envelope, error } = await supabase
    .from('envelopes')
    .insert({ 
      user_id: ctx.userId, 
      household_id: ctx.householdId || null,
      name, 
      icon, 
      color, 
      position: newPosition 
    })
    .select('id')
    .single();

  if (error) throw error;

  // Create allocation for current month
  await supabase.from('envelope_allocations').insert({
    user_id: ctx.userId,
    household_id: ctx.householdId || null,
    envelope_id: envelope.id,
    month_key: monthKey,
    allocated: 0,
    spent: 0,
  });

  return envelope.id;
}

export async function reorderEnvelopesDb(ctx: QueryContext, orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('envelopes')
      .update({ position: index })
      .eq('id', id)
  );

  await Promise.all(updates);
}

export async function updateEnvelopeDb(envelopeId: string, updates: { name?: string; icon?: string; color?: string; rollover?: boolean }): Promise<void> {
  await supabase.from('envelopes').update(updates).eq('id', envelopeId);
}

export async function deleteEnvelopeDb(ctx: QueryContext, monthKey: string, envelopeId: string, allocated: number): Promise<void> {
  // Refund allocated amount
  if (allocated > 0) {
    let budgetQuery = supabase
      .from('monthly_budgets')
      .select('to_be_budgeted, id')
      .eq('month_key', monthKey);

    if (ctx.householdId) {
      budgetQuery = budgetQuery.eq('household_id', ctx.householdId);
    } else {
      budgetQuery = budgetQuery.eq('user_id', ctx.userId).is('household_id', null);
    }

    const { data: current } = await budgetQuery.single();

    if (current) {
      await supabase
        .from('monthly_budgets')
        .update({ to_be_budgeted: (Number(current.to_be_budgeted) || 0) + allocated })
        .eq('id', current.id);
    }
  }

  await supabase.from('envelopes').delete().eq('id', envelopeId);
}

export async function allocateToEnvelopeDb(ctx: QueryContext, monthKey: string, envelopeId: string, amount: number): Promise<void> {
  // Deduct from toBeBudgeted
  let budgetQuery = supabase
    .from('monthly_budgets')
    .select('to_be_budgeted, id')
    .eq('month_key', monthKey);

  if (ctx.householdId) {
    budgetQuery = budgetQuery.eq('household_id', ctx.householdId);
  } else {
    budgetQuery = budgetQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: current } = await budgetQuery.single();

  if (current) {
    await supabase
      .from('monthly_budgets')
      .update({ to_be_budgeted: (Number(current.to_be_budgeted) || 0) - amount })
      .eq('id', current.id);
  }

  // Add to envelope allocation
  const { data: allocation } = await supabase
    .from('envelope_allocations')
    .select('id, allocated')
    .eq('envelope_id', envelopeId)
    .eq('month_key', monthKey)
    .single();

  if (allocation) {
    await supabase
      .from('envelope_allocations')
      .update({ allocated: Number(allocation.allocated) + amount })
      .eq('id', allocation.id);
  } else {
    await supabase.from('envelope_allocations').insert({
      user_id: ctx.userId,
      household_id: ctx.householdId || null,
      envelope_id: envelopeId,
      month_key: monthKey,
      allocated: amount,
      spent: 0,
    });
  }
}

export async function deallocateFromEnvelopeDb(ctx: QueryContext, monthKey: string, envelopeId: string, amount: number): Promise<void> {
  // Add back to toBeBudgeted
  let budgetQuery = supabase
    .from('monthly_budgets')
    .select('to_be_budgeted, id')
    .eq('month_key', monthKey);

  if (ctx.householdId) {
    budgetQuery = budgetQuery.eq('household_id', ctx.householdId);
  } else {
    budgetQuery = budgetQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: current } = await budgetQuery.single();

  if (current) {
    await supabase
      .from('monthly_budgets')
      .update({ to_be_budgeted: (Number(current.to_be_budgeted) || 0) + amount })
      .eq('id', current.id);
  }

  const { data: allocation } = await supabase
    .from('envelope_allocations')
    .select('id, allocated')
    .eq('envelope_id', envelopeId)
    .eq('month_key', monthKey)
    .single();

  if (allocation) {
    await supabase
      .from('envelope_allocations')
      .update({ allocated: Math.max(0, Number(allocation.allocated) - amount) })
      .eq('id', allocation.id);
  }
}

export async function transferBetweenEnvelopesDb(ctx: QueryContext, monthKey: string, fromId: string, toId: string, amount: number): Promise<void> {
  const { data: fromAlloc } = await supabase
    .from('envelope_allocations')
    .select('id, allocated')
    .eq('envelope_id', fromId)
    .eq('month_key', monthKey)
    .single();

  const { data: toAlloc } = await supabase
    .from('envelope_allocations')
    .select('id, allocated')
    .eq('envelope_id', toId)
    .eq('month_key', monthKey)
    .single();

  if (fromAlloc) {
    await supabase
      .from('envelope_allocations')
      .update({ allocated: Math.max(0, Number(fromAlloc.allocated) - amount) })
      .eq('id', fromAlloc.id);
  }

  if (toAlloc) {
    await supabase
      .from('envelope_allocations')
      .update({ allocated: Number(toAlloc.allocated) + amount })
      .eq('id', toAlloc.id);
  } else {
    await supabase.from('envelope_allocations').insert({
      user_id: ctx.userId,
      household_id: ctx.householdId || null,
      envelope_id: toId,
      month_key: monthKey,
      allocated: amount,
      spent: 0,
    });
  }
}

// Transaction operations
export async function addTransactionDb(
  ctx: QueryContext,
  monthKey: string,
  envelopeId: string,
  amount: number,
  description: string,
  merchant?: string,
  receiptUrl?: string,
  receiptPath?: string,
  date?: string
): Promise<string> {
  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert({
      user_id: ctx.userId,
      household_id: ctx.householdId || null,
      envelope_id: envelopeId,
      amount,
      description,
      merchant: merchant || null,
      receipt_url: receiptUrl || null,
      receipt_path: receiptPath || null,
      date: date || new Date().toISOString().split('T')[0],
    })
    .select('id')
    .single();

  if (error) throw error;

  // Update spent in allocation
  const { data: allocation } = await supabase
    .from('envelope_allocations')
    .select('id, spent')
    .eq('envelope_id', envelopeId)
    .eq('month_key', monthKey)
    .single();

  if (allocation) {
    await supabase
      .from('envelope_allocations')
      .update({ spent: Number(allocation.spent) + amount })
      .eq('id', allocation.id);
  } else {
    await supabase.from('envelope_allocations').insert({
      user_id: ctx.userId,
      household_id: ctx.householdId || null,
      envelope_id: envelopeId,
      month_key: monthKey,
      allocated: 0,
      spent: amount,
    });
  }

  return transaction.id;
}

export async function updateTransactionDb(
  ctx: QueryContext,
  monthKey: string,
  transactionId: string,
  oldEnvelopeId: string,
  oldAmount: number,
  updates: { amount?: number; description?: string; merchant?: string; envelopeId?: string; receiptUrl?: string; receiptPath?: string; notes?: string; date?: string }
): Promise<void> {
  const newAmount = updates.amount ?? oldAmount;
  const newEnvelopeId = updates.envelopeId ?? oldEnvelopeId;

  await supabase
    .from('transactions')
    .update({
      amount: updates.amount,
      description: updates.description,
      merchant: updates.merchant,
      envelope_id: updates.envelopeId,
      receipt_url: updates.receiptUrl,
      receipt_path: updates.receiptPath,
      notes: updates.notes,
      date: updates.date,
    })
    .eq('id', transactionId);

  if (oldEnvelopeId === newEnvelopeId) {
    const diff = newAmount - oldAmount;
    if (diff !== 0) {
      const { data: allocation } = await supabase
        .from('envelope_allocations')
        .select('id, spent')
        .eq('envelope_id', oldEnvelopeId)
        .eq('month_key', monthKey)
        .single();

      if (allocation) {
        await supabase
          .from('envelope_allocations')
          .update({ spent: Number(allocation.spent) + diff })
          .eq('id', allocation.id);
      }
    }
  } else {
    const { data: oldAlloc } = await supabase
      .from('envelope_allocations')
      .select('id, spent')
      .eq('envelope_id', oldEnvelopeId)
      .eq('month_key', monthKey)
      .single();

    if (oldAlloc) {
      await supabase
        .from('envelope_allocations')
        .update({ spent: Math.max(0, Number(oldAlloc.spent) - oldAmount) })
        .eq('id', oldAlloc.id);
    }

    const { data: newAlloc } = await supabase
      .from('envelope_allocations')
      .select('id, spent')
      .eq('envelope_id', newEnvelopeId)
      .eq('month_key', monthKey)
      .single();

    if (newAlloc) {
      await supabase
        .from('envelope_allocations')
        .update({ spent: Number(newAlloc.spent) + newAmount })
        .eq('id', newAlloc.id);
    } else {
      await supabase.from('envelope_allocations').insert({
        user_id: ctx.userId,
        household_id: ctx.householdId || null,
        envelope_id: newEnvelopeId,
        month_key: monthKey,
        allocated: 0,
        spent: newAmount,
      });
    }
  }
}

export async function deleteTransactionDb(ctx: QueryContext, monthKey: string, transactionId: string, envelopeId: string, amount: number): Promise<void> {
  await supabase.from('transactions').delete().eq('id', transactionId);

  const { data: allocation } = await supabase
    .from('envelope_allocations')
    .select('id, spent')
    .eq('envelope_id', envelopeId)
    .eq('month_key', monthKey)
    .single();

  if (allocation) {
    await supabase
      .from('envelope_allocations')
      .update({ spent: Math.max(0, Number(allocation.spent) - amount) })
      .eq('id', allocation.id);
  }
}

// Start new month - ensures allocations exist for the new month
// Only envelopes that have allocations in the CURRENT month are duplicated to the new month
// Envelopes with rollover=true carry over their net balance (allocated - spent)
// The rollover is capped at the savings goal target if one exists
export async function startNewMonthDb(ctx: QueryContext, currentMonthKey: string): Promise<string> {
  const [year, month] = currentMonthKey.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;

  // 1) Ensure monthly budget row exists
  let existsQuery = supabase
    .from('monthly_budgets')
    .select('id')
    .eq('month_key', nextMonthKey);

  if (ctx.householdId) {
    existsQuery = existsQuery.eq('household_id', ctx.householdId);
  } else {
    existsQuery = existsQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: existing } = await existsQuery.single();

  if (!existing) {
    await supabase.from('monthly_budgets').insert({
      user_id: ctx.userId,
      household_id: ctx.householdId || null,
      month_key: nextMonthKey,
      to_be_budgeted: 0,
    });
  }

  // 2) Fetch ONLY envelopes that have an allocation in the CURRENT month (not all envelopes)
  let currentAllocsQuery = supabase
    .from('envelope_allocations')
    .select('envelope_id, allocated, spent')
    .eq('month_key', currentMonthKey);

  if (ctx.householdId) {
    currentAllocsQuery = currentAllocsQuery.eq('household_id', ctx.householdId);
  } else {
    currentAllocsQuery = currentAllocsQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: currentAllocs } = await currentAllocsQuery;
  if (!currentAllocs || currentAllocs.length === 0) return nextMonthKey;

  // Get envelope IDs from current month allocations
  const currentMonthEnvelopeIds = currentAllocs.map(a => a.envelope_id);

  // 3) Fetch envelope details (rollover flag) only for envelopes that exist in current month
  const { data: envelopes } = await supabase
    .from('envelopes')
    .select('id, rollover')
    .in('id', currentMonthEnvelopeIds);

  if (!envelopes || envelopes.length === 0) return nextMonthKey;

  // Create maps for easy lookup
  const envelopeMap = new Map(envelopes.map(e => [e.id, e]));
  const currentAllocMap = new Map(currentAllocs.map(a => [a.envelope_id, { 
    allocated: Number(a.allocated), 
    spent: Number(a.spent) 
  }]));

  // 4) Fetch savings goals to check target amounts
  let goalsQuery = supabase
    .from('savings_goals')
    .select('envelope_id, target_amount');

  if (ctx.householdId) {
    goalsQuery = goalsQuery.eq('household_id', ctx.householdId);
  } else {
    goalsQuery = goalsQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: savingsGoals } = await goalsQuery;
  const goalsMap = new Map((savingsGoals || []).map(g => [g.envelope_id, Number(g.target_amount)]));

  // 5) Check existing allocations for next month to avoid duplicates
  let existingAllocsQuery = supabase
    .from('envelope_allocations')
    .select('envelope_id')
    .eq('month_key', nextMonthKey);

  if (ctx.householdId) {
    existingAllocsQuery = existingAllocsQuery.eq('household_id', ctx.householdId);
  } else {
    existingAllocsQuery = existingAllocsQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: existingAllocs } = await existingAllocsQuery;
  const existingSet = new Set((existingAllocs || []).map(a => a.envelope_id));

  // 6) Create allocations only for envelopes that:
  // - Have an allocation in the current month
  // - Don't already have an allocation in the next month
  const missingEnvelopeIds = currentMonthEnvelopeIds.filter(id => !existingSet.has(id));

  if (missingEnvelopeIds.length > 0) {
    const allocationsToInsert = missingEnvelopeIds.map(envelopeId => {
      const envelope = envelopeMap.get(envelopeId);
      const hasRollover = envelope?.rollover === true;
      const allocData = currentAllocMap.get(envelopeId) || { allocated: 0, spent: 0 };
      const targetAmount = goalsMap.get(envelopeId) || 0;
      
      // Calculate net balance (allocated - spent)
      let carryOverAmount = 0;
      if (hasRollover) {
        const netBalance = Math.max(0, allocData.allocated - allocData.spent);
        
        if (targetAmount > 0) {
          // Cap the rollover at the target amount
          carryOverAmount = Math.min(netBalance, targetAmount);
        } else {
          // No target, carry over the full net balance
          carryOverAmount = netBalance;
        }
      }

      return {
        user_id: ctx.userId,
        household_id: ctx.householdId || null,
        envelope_id: envelopeId,
        month_key: nextMonthKey,
        allocated: carryOverAmount,
        spent: 0,
      };
    });

    await supabase.from('envelope_allocations').insert(allocationsToInsert);
  }

  return nextMonthKey;
}

// Delete all data for a specific month (transactions, incomes, allocations, but NOT envelopes)
export async function deleteMonthDataDb(ctx: QueryContext, monthKey: string): Promise<void> {
  if (ctx.householdId) {
    // Delete transactions for this month
    await supabase
      .from('transactions')
      .delete()
      .eq('household_id', ctx.householdId)
      .gte('date', `${monthKey}-01`)
      .lt('date', getNextMonthKey(monthKey) + '-01');
    
    // Delete incomes for this month
    await supabase
      .from('incomes')
      .delete()
      .eq('household_id', ctx.householdId)
      .eq('month_key', monthKey);
    
    // Delete allocations for this month
    await supabase
      .from('envelope_allocations')
      .delete()
      .eq('household_id', ctx.householdId)
      .eq('month_key', monthKey);
    
    // Delete monthly budget for this month
    await supabase
      .from('monthly_budgets')
      .delete()
      .eq('household_id', ctx.householdId)
      .eq('month_key', monthKey);
  } else {
    // Delete transactions for this month
    await supabase
      .from('transactions')
      .delete()
      .eq('user_id', ctx.userId)
      .is('household_id', null)
      .gte('date', `${monthKey}-01`)
      .lt('date', getNextMonthKey(monthKey) + '-01');
    
    // Delete incomes for this month
    await supabase
      .from('incomes')
      .delete()
      .eq('user_id', ctx.userId)
      .is('household_id', null)
      .eq('month_key', monthKey);
    
    // Delete allocations for this month
    await supabase
      .from('envelope_allocations')
      .delete()
      .eq('user_id', ctx.userId)
      .is('household_id', null)
      .eq('month_key', monthKey);
    
    // Delete monthly budget for this month
    await supabase
      .from('monthly_budgets')
      .delete()
      .eq('user_id', ctx.userId)
      .is('household_id', null)
      .eq('month_key', monthKey);
  }
}

// Delete all user/household data
export async function deleteAllUserDataDb(ctx: QueryContext): Promise<void> {
  if (ctx.householdId) {
    await supabase.from('transactions').delete().eq('household_id', ctx.householdId);
    await supabase.from('incomes').delete().eq('household_id', ctx.householdId);
    await supabase.from('envelope_allocations').delete().eq('household_id', ctx.householdId);
    await supabase.from('envelopes').delete().eq('household_id', ctx.householdId);
    await supabase.from('monthly_budgets').delete().eq('household_id', ctx.householdId);
  } else {
    await supabase.from('transactions').delete().eq('user_id', ctx.userId).is('household_id', null);
    await supabase.from('incomes').delete().eq('user_id', ctx.userId).is('household_id', null);
    await supabase.from('envelope_allocations').delete().eq('user_id', ctx.userId).is('household_id', null);
    await supabase.from('envelopes').delete().eq('user_id', ctx.userId).is('household_id', null);
    await supabase.from('monthly_budgets').delete().eq('user_id', ctx.userId).is('household_id', null);
  }
}

// Copy envelopes to a specific target month
// ONLY envelopes with rollover=true are copied (per user requirement)
// The rollover is capped at the savings goal target if one exists
export async function copyEnvelopesToMonthDb(ctx: QueryContext, sourceMonthKey: string, targetMonthKey: string): Promise<void> {
  // 1) Ensure target monthly budget row exists
  let existsQuery = supabase
    .from('monthly_budgets')
    .select('id')
    .eq('month_key', targetMonthKey);

  if (ctx.householdId) {
    existsQuery = existsQuery.eq('household_id', ctx.householdId);
  } else {
    existsQuery = existsQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: existing } = await existsQuery.single();

  if (!existing) {
    await supabase.from('monthly_budgets').insert({
      user_id: ctx.userId,
      household_id: ctx.householdId || null,
      month_key: targetMonthKey,
      to_be_budgeted: 0,
    });
  }

  // 2) Fetch ONLY envelopes with rollover enabled (per user requirement)
  let envelopesQuery = supabase
    .from('envelopes')
    .select('id, rollover')
    .eq('rollover', true);
    
  if (ctx.householdId) {
    envelopesQuery = envelopesQuery.eq('household_id', ctx.householdId);
  } else {
    envelopesQuery = envelopesQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: envelopes } = await envelopesQuery;
  if (!envelopes || envelopes.length === 0) return;

  // 3) Fetch source month allocations (to carry over for rollover envelopes)
  let sourceAllocsQuery = supabase
    .from('envelope_allocations')
    .select('envelope_id, allocated, spent')
    .eq('month_key', sourceMonthKey);

  if (ctx.householdId) {
    sourceAllocsQuery = sourceAllocsQuery.eq('household_id', ctx.householdId);
  } else {
    sourceAllocsQuery = sourceAllocsQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: sourceAllocs } = await sourceAllocsQuery;
  const sourceAllocMap = new Map((sourceAllocs || []).map(a => [a.envelope_id, {
    allocated: Number(a.allocated),
    spent: Number(a.spent),
  }]));

  // 4) Fetch savings goals
  let goalsQuery = supabase
    .from('savings_goals')
    .select('envelope_id, target_amount');

  if (ctx.householdId) {
    goalsQuery = goalsQuery.eq('household_id', ctx.householdId);
  } else {
    goalsQuery = goalsQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: savingsGoals } = await goalsQuery;
  const goalsMap = new Map((savingsGoals || []).map(g => [g.envelope_id, Number(g.target_amount)]));

  // 5) Check existing allocations for target month
  let existingAllocsQuery = supabase
    .from('envelope_allocations')
    .select('envelope_id')
    .eq('month_key', targetMonthKey);

  if (ctx.householdId) {
    existingAllocsQuery = existingAllocsQuery.eq('household_id', ctx.householdId);
  } else {
    existingAllocsQuery = existingAllocsQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: existingAllocs } = await existingAllocsQuery;
  const existingSet = new Set((existingAllocs || []).map(a => a.envelope_id));

  // 6) Create allocations ONLY for rollover envelopes that don't already exist in target month
  const missingEnvelopes = envelopes.filter(e => !existingSet.has(e.id));

  if (missingEnvelopes.length > 0) {
    const allocationsToInsert = missingEnvelopes.map(envelope => {
      const sourceData = sourceAllocMap.get(envelope.id) || { allocated: 0, spent: 0 };
      const targetAmount = goalsMap.get(envelope.id) || 0;
      
      // Calculate net balance to carry over
      const netBalance = Math.max(0, sourceData.allocated - sourceData.spent);
      
      let carryOverAmount = netBalance;
      if (targetAmount > 0) {
        // Cap the rollover at the target amount
        carryOverAmount = Math.min(netBalance, targetAmount);
      }

      return {
        user_id: ctx.userId,
        household_id: ctx.householdId || null,
        envelope_id: envelope.id,
        month_key: targetMonthKey,
        allocated: carryOverAmount,
        spent: 0,
      };
    });

    await supabase.from('envelope_allocations').insert(allocationsToInsert);
  }
}

// Helper
function getNextMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

// Export context type for use in other files
export type { QueryContext };
