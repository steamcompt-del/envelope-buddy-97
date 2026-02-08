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
export async function addIncomeDb(ctx: QueryContext, monthKey: string, amount: number, description: string): Promise<string> {
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

export async function updateIncomeDb(ctx: QueryContext, monthKey: string, incomeId: string, newAmount: number, newDescription: string, oldAmount: number): Promise<void> {
  await supabase
    .from('incomes')
    .update({ amount: newAmount, description: newDescription })
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

export async function updateEnvelopeDb(envelopeId: string, updates: { name?: string; icon?: string; color?: string }): Promise<void> {
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
  receiptPath?: string
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

// Start new month - ensures allocations exist for the new month (duplicates envelopes as empty allocations)
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

  // 2) Ensure allocations exist for ALL envelopes in the new month
  let envelopesQuery = supabase.from('envelopes').select('id');
  if (ctx.householdId) {
    envelopesQuery = envelopesQuery.eq('household_id', ctx.householdId);
  } else {
    envelopesQuery = envelopesQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: envelopes } = await envelopesQuery;
  if (!envelopes || envelopes.length === 0) return nextMonthKey;

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

  const missingEnvelopeIds = envelopes
    .map(e => e.id)
    .filter(id => !existingSet.has(id));

  if (missingEnvelopeIds.length > 0) {
    await supabase.from('envelope_allocations').insert(
      missingEnvelopeIds.map(envelopeId => ({
        user_id: ctx.userId,
        household_id: ctx.householdId || null,
        envelope_id: envelopeId,
        month_key: nextMonthKey,
        allocated: 0,
        spent: 0,
      }))
    );
  }

  return nextMonthKey;
}

// Delete all data for a specific month (including envelopes)
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
    
    // Delete envelopes
    await supabase
      .from('envelopes')
      .delete()
      .eq('household_id', ctx.householdId);
    
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
    
    // Delete envelopes
    await supabase
      .from('envelopes')
      .delete()
      .eq('user_id', ctx.userId)
      .is('household_id', null);
    
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

// Helper
function getNextMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

// Export context type for use in other files
export type { QueryContext };
