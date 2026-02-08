import { getBackendClient } from '@/lib/backendClient';
import { Envelope, Transaction, Income, MonthlyBudget } from '@/contexts/BudgetContext';

const supabase = getBackendClient();

// Database types
interface DbEnvelope {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

interface DbEnvelopeAllocation {
  id: string;
  user_id: string;
  envelope_id: string;
  month_key: string;
  allocated: number;
  spent: number;
  created_at: string;
}

interface DbTransaction {
  id: string;
  user_id: string;
  envelope_id: string;
  amount: number;
  description: string;
  merchant: string | null;
  receipt_url: string | null;
  receipt_path: string | null;
  date: string;
  created_at: string;
}

interface DbIncome {
  id: string;
  user_id: string;
  month_key: string;
  amount: number;
  description: string;
  date: string;
  created_at: string;
}

interface DbMonthlyBudget {
  id: string;
  user_id: string;
  month_key: string;
  to_be_budgeted: number;
  created_at: string;
}

export async function fetchMonthData(userId: string, monthKey: string): Promise<MonthlyBudget> {
  // Fetch monthly budget
  const { data: monthlyBudget } = await supabase
    .from('monthly_budgets')
    .select('*')
    .eq('user_id', userId)
    .eq('month_key', monthKey)
    .single();

  // Fetch all envelopes
  const { data: envelopes } = await supabase
    .from('envelopes')
    .select('*')
    .eq('user_id', userId);

  // Fetch allocations for this month
  const { data: allocations } = await supabase
    .from('envelope_allocations')
    .select('*')
    .eq('user_id', userId)
    .eq('month_key', monthKey);

  // Fetch transactions for this month
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', `${monthKey}-01`)
    .lt('date', getNextMonthKey(monthKey) + '-01');

  // Fetch incomes for this month
  const { data: incomes } = await supabase
    .from('incomes')
    .select('*')
    .eq('user_id', userId)
    .eq('month_key', monthKey);

  // Map allocations by envelope_id
  const allocationMap = new Map((allocations || []).map(a => [a.envelope_id, a]));

  // Build envelope list with allocations
  const envelopeList: Envelope[] = (envelopes || []).map((env: DbEnvelope) => {
    const allocation = allocationMap.get(env.id);
    return {
      id: env.id,
      name: env.name,
      icon: env.icon,
      color: env.color,
      allocated: allocation ? Number(allocation.allocated) : 0,
      spent: allocation ? Number(allocation.spent) : 0,
    };
  });

  // Build transaction list
  const transactionList: Transaction[] = (transactions || []).map((t: DbTransaction) => ({
    id: t.id,
    envelopeId: t.envelope_id,
    amount: Number(t.amount),
    description: t.description,
    date: t.date,
    merchant: t.merchant || undefined,
    receiptUrl: t.receipt_url || undefined,
    receiptPath: t.receipt_path || undefined,
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

export async function fetchAvailableMonths(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('monthly_budgets')
    .select('month_key')
    .eq('user_id', userId)
    .order('month_key', { ascending: false });

  return (data || []).map((m: { month_key: string }) => m.month_key);
}

export async function ensureMonthExists(userId: string, monthKey: string): Promise<void> {
  const { data: existing } = await supabase
    .from('monthly_budgets')
    .select('id')
    .eq('user_id', userId)
    .eq('month_key', monthKey)
    .single();

  if (!existing) {
    await supabase.from('monthly_budgets').insert({
      user_id: userId,
      month_key: monthKey,
      to_be_budgeted: 0,
    });
  }
}

// Income operations
export async function addIncomeDb(userId: string, monthKey: string, amount: number, description: string): Promise<string> {
  // Insert income
  const { data: income, error: incomeError } = await supabase
    .from('incomes')
    .insert({
      user_id: userId,
      month_key: monthKey,
      amount,
      description,
    })
    .select('id')
    .single();

  if (incomeError) throw incomeError;

  // Update toBeBudgeted
  const { data: current } = await supabase
    .from('monthly_budgets')
    .select('to_be_budgeted')
    .eq('user_id', userId)
    .eq('month_key', monthKey)
    .single();

  await supabase
    .from('monthly_budgets')
    .upsert({
      user_id: userId,
      month_key: monthKey,
      to_be_budgeted: (Number(current?.to_be_budgeted) || 0) + amount,
    });

  return income.id;
}

export async function updateIncomeDb(userId: string, monthKey: string, incomeId: string, newAmount: number, newDescription: string, oldAmount: number): Promise<void> {
  await supabase
    .from('incomes')
    .update({ amount: newAmount, description: newDescription })
    .eq('id', incomeId);

  const diff = newAmount - oldAmount;
  if (diff !== 0) {
    const { data: current } = await supabase
      .from('monthly_budgets')
      .select('to_be_budgeted')
      .eq('user_id', userId)
      .eq('month_key', monthKey)
      .single();

    await supabase
      .from('monthly_budgets')
      .update({ to_be_budgeted: (Number(current?.to_be_budgeted) || 0) + diff })
      .eq('user_id', userId)
      .eq('month_key', monthKey);
  }
}

export async function deleteIncomeDb(userId: string, monthKey: string, incomeId: string, amount: number): Promise<void> {
  await supabase.from('incomes').delete().eq('id', incomeId);

  const { data: current } = await supabase
    .from('monthly_budgets')
    .select('to_be_budgeted')
    .eq('user_id', userId)
    .eq('month_key', monthKey)
    .single();

  await supabase
    .from('monthly_budgets')
    .update({ to_be_budgeted: Math.max(0, (Number(current?.to_be_budgeted) || 0) - amount) })
    .eq('user_id', userId)
    .eq('month_key', monthKey);
}

// Envelope operations
export async function createEnvelopeDb(userId: string, monthKey: string, name: string, icon: string, color: string): Promise<string> {
  const { data: envelope, error } = await supabase
    .from('envelopes')
    .insert({ user_id: userId, name, icon, color })
    .select('id')
    .single();

  if (error) throw error;

  // Create allocation for current month
  await supabase.from('envelope_allocations').insert({
    user_id: userId,
    envelope_id: envelope.id,
    month_key: monthKey,
    allocated: 0,
    spent: 0,
  });

  return envelope.id;
}

export async function updateEnvelopeDb(envelopeId: string, updates: { name?: string; icon?: string; color?: string }): Promise<void> {
  await supabase.from('envelopes').update(updates).eq('id', envelopeId);
}

export async function deleteEnvelopeDb(userId: string, monthKey: string, envelopeId: string, allocated: number): Promise<void> {
  // Refund allocated amount to toBeBudgeted
  if (allocated > 0) {
    const { data: current } = await supabase
      .from('monthly_budgets')
      .select('to_be_budgeted')
      .eq('user_id', userId)
      .eq('month_key', monthKey)
      .single();

    await supabase
      .from('monthly_budgets')
      .update({ to_be_budgeted: (Number(current?.to_be_budgeted) || 0) + allocated })
      .eq('user_id', userId)
      .eq('month_key', monthKey);
  }

  // Delete envelope (cascades to allocations and transactions)
  await supabase.from('envelopes').delete().eq('id', envelopeId);
}

export async function allocateToEnvelopeDb(userId: string, monthKey: string, envelopeId: string, amount: number): Promise<void> {
  // Deduct from toBeBudgeted
  const { data: current } = await supabase
    .from('monthly_budgets')
    .select('to_be_budgeted')
    .eq('user_id', userId)
    .eq('month_key', monthKey)
    .single();

  await supabase
    .from('monthly_budgets')
    .update({ to_be_budgeted: (Number(current?.to_be_budgeted) || 0) - amount })
    .eq('user_id', userId)
    .eq('month_key', monthKey);

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
      user_id: userId,
      envelope_id: envelopeId,
      month_key: monthKey,
      allocated: amount,
      spent: 0,
    });
  }
}

export async function deallocateFromEnvelopeDb(userId: string, monthKey: string, envelopeId: string, amount: number): Promise<void> {
  // Add back to toBeBudgeted
  const { data: current } = await supabase
    .from('monthly_budgets')
    .select('to_be_budgeted')
    .eq('user_id', userId)
    .eq('month_key', monthKey)
    .single();

  await supabase
    .from('monthly_budgets')
    .update({ to_be_budgeted: (Number(current?.to_be_budgeted) || 0) + amount })
    .eq('user_id', userId)
    .eq('month_key', monthKey);

  // Remove from envelope allocation
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

export async function transferBetweenEnvelopesDb(userId: string, monthKey: string, fromId: string, toId: string, amount: number): Promise<void> {
  // Get allocations
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
      user_id: userId,
      envelope_id: toId,
      month_key: monthKey,
      allocated: amount,
      spent: 0,
    });
  }
}

// Transaction operations
export async function addTransactionDb(
  userId: string,
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
      user_id: userId,
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
      user_id: userId,
      envelope_id: envelopeId,
      month_key: monthKey,
      allocated: 0,
      spent: amount,
    });
  }

  return transaction.id;
}

export async function updateTransactionDb(
  userId: string,
  monthKey: string,
  transactionId: string,
  oldEnvelopeId: string,
  oldAmount: number,
  updates: { amount?: number; description?: string; merchant?: string; envelopeId?: string; receiptUrl?: string; receiptPath?: string }
): Promise<void> {
  const newAmount = updates.amount ?? oldAmount;
  const newEnvelopeId = updates.envelopeId ?? oldEnvelopeId;

  // Update transaction
  await supabase
    .from('transactions')
    .update({
      amount: updates.amount,
      description: updates.description,
      merchant: updates.merchant,
      envelope_id: updates.envelopeId,
      receipt_url: updates.receiptUrl,
      receipt_path: updates.receiptPath,
    })
    .eq('id', transactionId);

  // Update spent amounts
  if (oldEnvelopeId === newEnvelopeId) {
    // Same envelope, just update the amount diff
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
    // Different envelopes, update both
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
        user_id: userId,
        envelope_id: newEnvelopeId,
        month_key: monthKey,
        allocated: 0,
        spent: newAmount,
      });
    }
  }
}

export async function deleteTransactionDb(userId: string, monthKey: string, transactionId: string, envelopeId: string, amount: number): Promise<void> {
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

// Start new month
export async function startNewMonthDb(userId: string, currentMonthKey: string): Promise<string> {
  const [year, month] = currentMonthKey.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;

  // Check if next month exists
  const { data: existing } = await supabase
    .from('monthly_budgets')
    .select('id')
    .eq('user_id', userId)
    .eq('month_key', nextMonthKey)
    .single();

  if (!existing) {
    // Create new month
    await supabase.from('monthly_budgets').insert({
      user_id: userId,
      month_key: nextMonthKey,
      to_be_budgeted: 0,
    });

    // Get current month allocations to copy
    const { data: currentAllocations } = await supabase
      .from('envelope_allocations')
      .select('envelope_id, allocated')
      .eq('user_id', userId)
      .eq('month_key', currentMonthKey);

    // Create allocations for new month with same allocated amounts
    if (currentAllocations && currentAllocations.length > 0) {
      const newAllocations = currentAllocations.map(a => ({
        user_id: userId,
        envelope_id: a.envelope_id,
        month_key: nextMonthKey,
        allocated: a.allocated,
        spent: 0,
      }));

      await supabase.from('envelope_allocations').insert(newAllocations);
    }
  }

  return nextMonthKey;
}

// Helper
function getNextMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}
