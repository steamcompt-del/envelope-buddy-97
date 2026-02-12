import { getBackendClient } from '@/lib/backendClient';
import { Envelope, Transaction, Income, MonthlyBudget } from '@/contexts/BudgetContext';
import { checkCelebrationThreshold } from '@/lib/savingsGoalsDb';

const supabase = getBackendClient();

// Database types
interface DbEnvelope {
  id: string;
  user_id: string;
  household_id: string | null;
  name: string;
  icon: string;
  color: string;
  category: string;
  position: number;
  rollover: boolean;
  rollover_strategy: string;
  rollover_percentage: number | null;
  max_rollover_amount: number | null;
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
  is_split: boolean;
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
        category: (env.category as Envelope['category']) || 'essentiels',
        allocated: Number(allocation.allocated),
        spent: Number(allocation.spent),
        rollover: env.rollover,
        rolloverStrategy: (env.rollover_strategy as Envelope['rolloverStrategy']) || 'full',
        rolloverPercentage: env.rollover_percentage ?? undefined,
        maxRolloverAmount: env.max_rollover_amount != null ? Number(env.max_rollover_amount) : undefined,
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
    isSplit: t.is_split || false,
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

  // Update toBeBudgeted atomically (prevents race conditions with multiple household members)
  await supabase.rpc('adjust_to_be_budgeted', {
    p_month_key: monthKey,
    p_household_id: ctx.householdId || null,
    p_user_id: ctx.userId,
    p_amount: amount,
  });

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
    await supabase.rpc('adjust_to_be_budgeted', {
      p_month_key: monthKey,
      p_household_id: ctx.householdId || null,
      p_user_id: ctx.userId,
      p_amount: diff,
    });
  }
}

export async function deleteIncomeDb(ctx: QueryContext, monthKey: string, incomeId: string, amount: number): Promise<void> {
  // Step 1: Adjust balance FIRST (reversible if delete fails since income still exists)
  const { error: rpcError } = await supabase.rpc('adjust_to_be_budgeted', {
    p_month_key: monthKey,
    p_household_id: ctx.householdId || null,
    p_user_id: ctx.userId,
    p_amount: -amount,
  });
  if (rpcError) throw new Error(`Failed to adjust balance: ${rpcError.message}`);

  // Step 2: Delete income record
  const { error: deleteError } = await supabase.from('incomes').delete().eq('id', incomeId);
  if (deleteError) {
    // Rollback: restore the balance we just decremented
    await supabase.rpc('adjust_to_be_budgeted', {
      p_month_key: monthKey,
      p_household_id: ctx.householdId || null,
      p_user_id: ctx.userId,
      p_amount: amount,
    });
    throw new Error(`Failed to delete income: ${deleteError.message}`);
  }
}

// Envelope operations
export async function createEnvelopeDb(ctx: QueryContext, monthKey: string, name: string, icon: string, color: string, category?: string): Promise<string> {
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

  // Auto-enable rollover for savings envelopes
  const resolvedCategory = category || (icon === 'PiggyBank' ? 'epargne' : 'essentiels');
  const shouldRollover = resolvedCategory === 'epargne';

  const { data: envelope, error } = await supabase
    .from('envelopes')
    .insert({ 
      user_id: ctx.userId, 
      household_id: ctx.householdId || null,
      name, 
      icon, 
      color, 
      position: newPosition,
      rollover: shouldRollover,
      category: resolvedCategory,
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

export async function updateEnvelopeDb(envelopeId: string, updates: { name?: string; icon?: string; color?: string; category?: string; rollover?: boolean; rolloverStrategy?: string; rolloverPercentage?: number | null; maxRolloverAmount?: number | null }): Promise<void> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
  if (updates.color !== undefined) dbUpdates.color = updates.color;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.rollover !== undefined) dbUpdates.rollover = updates.rollover;
  if (updates.rolloverStrategy !== undefined) dbUpdates.rollover_strategy = updates.rolloverStrategy;
  if (updates.rolloverPercentage !== undefined) dbUpdates.rollover_percentage = updates.rolloverPercentage;
  if (updates.maxRolloverAmount !== undefined) dbUpdates.max_rollover_amount = updates.maxRolloverAmount;
  await supabase.from('envelopes').update(dbUpdates).eq('id', envelopeId);
}

export async function deleteEnvelopeDb(ctx: QueryContext, monthKey: string, envelopeId: string, allocated: number, refundToBudget: boolean = true): Promise<void> {
  // Check if there are active recurring transactions
  const { data: activeRecurring } = await supabase
    .from('recurring_transactions')
    .select('id, description, is_active')
    .eq('envelope_id', envelopeId)
    .eq('is_active', true)
    .maybeSingle();

  if (activeRecurring) {
    throw new Error(
      `Impossible de supprimer : l'enveloppe a une dépense récurrente active (${activeRecurring.description}). Désactivez-la d'abord.`
    );
  }

  // Check if there's a savings goal with funds
  const { data: savingsGoal } = await supabase
    .from('savings_goals')
    .select('id, name, target_amount')
    .eq('envelope_id', envelopeId)
    .maybeSingle();

  if (savingsGoal && allocated > 0) {
    const goalName = savingsGoal.name || 'cet objectif';
    throw new Error(
      `Impossible de supprimer : l'objectif "${goalName}" contient ${allocated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} d'épargne. Transférez d'abord les fonds ou supprimez l'objectif.`
    );
  }

  // Refund allocated amount atomically (only if requested)
  if (refundToBudget && allocated > 0) {
    await supabase.rpc('adjust_to_be_budgeted', {
      p_month_key: monthKey,
      p_household_id: ctx.householdId || null,
      p_user_id: ctx.userId,
      p_amount: allocated,
    });
  }

  await supabase.from('envelopes').delete().eq('id', envelopeId);
}

export async function allocateToEnvelopeDb(ctx: QueryContext, monthKey: string, envelopeId: string, amount: number): Promise<void> {
  // Deduct from toBeBudgeted atomically
  await supabase.rpc('adjust_to_be_budgeted', {
    p_month_key: monthKey,
    p_household_id: ctx.householdId || null,
    p_user_id: ctx.userId,
    p_amount: -amount,
  });

  // Add to envelope allocation atomically
  const { data: allocation } = await supabase
    .from('envelope_allocations')
    .select('id')
    .eq('envelope_id', envelopeId)
    .eq('month_key', monthKey)
    .maybeSingle();

  if (allocation) {
    await supabase.rpc('adjust_allocation_atomic', {
      p_envelope_id: envelopeId,
      p_month_key: monthKey,
      p_amount: amount,
    });
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

// Allocate to an envelope WITHOUT impacting toBeBudgeted (for existing savings / initial balances)
export async function allocateInitialBalanceDb(ctx: QueryContext, monthKey: string, envelopeId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  await ensureMonthExists(ctx, monthKey);

  // Only update envelope allocation atomically, do NOT touch to_be_budgeted
  const { data: allocation } = await supabase
    .from('envelope_allocations')
    .select('id')
    .eq('envelope_id', envelopeId)
    .eq('month_key', monthKey)
    .maybeSingle();

  if (allocation) {
    await supabase.rpc('adjust_allocation_atomic', {
      p_envelope_id: envelopeId,
      p_month_key: monthKey,
      p_amount: amount,
    });
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
  // Step 1: Decrease envelope allocation first
  const { error: allocError } = await supabase.rpc('adjust_allocation_atomic', {
    p_envelope_id: envelopeId,
    p_month_key: monthKey,
    p_amount: -amount,
  });
  if (allocError) throw new Error(`Failed to deallocate from envelope: ${allocError.message}`);

  // Step 2: Add back to toBeBudgeted
  const { error: budgetError } = await supabase.rpc('adjust_to_be_budgeted', {
    p_month_key: monthKey,
    p_household_id: ctx.householdId || null,
    p_user_id: ctx.userId,
    p_amount: amount,
  });
  if (budgetError) {
    // Rollback: restore the envelope allocation
    await supabase.rpc('adjust_allocation_atomic', {
      p_envelope_id: envelopeId,
      p_month_key: monthKey,
      p_amount: amount,
    });
    throw new Error(`Failed to adjust budget balance: ${budgetError.message}`);
  }
}

export async function transferBetweenEnvelopesDb(ctx: QueryContext, monthKey: string, fromId: string, toId: string, amount: number): Promise<void> {
  // Guard: same envelope
  if (fromId === toId) throw new Error('Cannot transfer to the same envelope');
  // Guard: invalid amount
  if (amount <= 0) throw new Error('Transfer amount must be positive');

  // Decrease source atomically
  await supabase.rpc('adjust_allocation_atomic', {
    p_envelope_id: fromId,
    p_month_key: monthKey,
    p_amount: -amount,
  });

  // Ensure target allocation exists, then increase atomically
  // Use upsert to avoid race condition on concurrent inserts
  await supabase
    .from('envelope_allocations')
    .upsert(
      {
        user_id: ctx.userId,
        household_id: ctx.householdId || null,
        envelope_id: toId,
        month_key: monthKey,
        allocated: 0,
        spent: 0,
      },
      { onConflict: 'envelope_id,month_key', ignoreDuplicates: true }
    );

  await supabase.rpc('adjust_allocation_atomic', {
    p_envelope_id: toId,
    p_month_key: monthKey,
    p_amount: amount,
  });
}

// Transaction operations
// Valide qu'une date est cohérente avec le month_key
function validateTransactionDate(date: string, monthKey: string): boolean {
  const txDate = new Date(date);
  if (isNaN(txDate.getTime())) return false;
  
  // Vérifier que la date n'est pas dans le futur (tolérance 1 jour)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (txDate > tomorrow) return false;
  
  return true;
}

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
  // Validation du montant
  if (amount <= 0) {
    throw new Error(`Invalid amount: ${amount}. Amount must be positive.`);
  }
  if (amount > 1000000) {
    throw new Error(`Amount too large: ${amount}. Please verify.`);
  }
  
  // Validation de la date
  const transactionDate = date || new Date().toISOString().split('T')[0];
  if (!validateTransactionDate(transactionDate, monthKey)) {
    throw new Error(`Invalid date: ${transactionDate}. Date cannot be in the future.`);
  }

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
      date: transactionDate,
    })
    .select('id')
    .single();

  if (error) throw error;

  // Update spent atomically (prevents race conditions)
  await supabase.rpc('increment_spent_atomic', {
    p_envelope_id: envelopeId,
    p_month_key: monthKey,
    p_amount: amount,
  });

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
  // Validation du montant
  if (updates.amount !== undefined) {
    if (updates.amount <= 0) throw new Error(`Invalid amount: ${updates.amount}`);
    if (updates.amount > 1000000) throw new Error(`Amount too large: ${updates.amount}`);
  }
  if (updates.date && !validateTransactionDate(updates.date, monthKey)) {
    throw new Error(`Invalid date: ${updates.date}`);
  }

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
      if (diff > 0) {
        await supabase.rpc('increment_spent_atomic', {
          p_envelope_id: oldEnvelopeId,
          p_month_key: monthKey,
          p_amount: diff,
        });
      } else {
        await supabase.rpc('decrement_spent_atomic', {
          p_envelope_id: oldEnvelopeId,
          p_month_key: monthKey,
          p_amount: Math.abs(diff),
        });
      }
    }
  } else {
    // Decrement old envelope
    await supabase.rpc('decrement_spent_atomic', {
      p_envelope_id: oldEnvelopeId,
      p_month_key: monthKey,
      p_amount: oldAmount,
    });

    // Increment new envelope
    await supabase.rpc('increment_spent_atomic', {
      p_envelope_id: newEnvelopeId,
      p_month_key: monthKey,
      p_amount: newAmount,
    });
  }
}

export async function deleteTransactionDb(ctx: QueryContext, monthKey: string, transactionId: string, envelopeId: string, amount: number): Promise<void> {
  await supabase.from('transactions').delete().eq('id', transactionId);

  await supabase.rpc('decrement_spent_atomic', {
    p_envelope_id: envelopeId,
    p_month_key: monthKey,
    p_amount: amount,
  });
}

// Supprime une transaction avec nettoyage complet (splits, receipts, storage)
export async function deleteTransactionCompleteDb(
  ctx: QueryContext,
  monthKey: string,
  transactionId: string
): Promise<void> {
  // 1. Récupérer la transaction avec ses splits
  const { data: transaction } = await supabase
    .from('transactions')
    .select('*, transaction_splits(*)')
    .eq('id', transactionId)
    .single();

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  // 2. Si transaction splittée, ajuster le spent de TOUS les splits
  if (transaction.is_split && transaction.transaction_splits?.length > 0) {
    for (const split of transaction.transaction_splits) {
      await supabase.rpc('decrement_spent_atomic', {
        p_envelope_id: split.envelope_id,
        p_month_key: monthKey,
        p_amount: split.amount,
      });
    }

    // Supprimer les splits
    await supabase
      .from('transaction_splits')
      .delete()
      .eq('parent_transaction_id', transactionId);
  } else {
    // Transaction normale : ajuster le spent de l'enveloppe
    await supabase.rpc('decrement_spent_atomic', {
      p_envelope_id: transaction.envelope_id,
      p_month_key: monthKey,
      p_amount: transaction.amount,
    });
  }

  // 3. Récupérer et supprimer les receipts
  const { data: receipts } = await supabase
    .from('receipts')
    .select('path')
    .eq('transaction_id', transactionId);

  if (receipts && receipts.length > 0) {
    const paths = receipts.map(r => r.path).filter(Boolean);
    if (paths.length > 0) {
      // Scénario 6: Cascade resilience - storage delete failure should not block transaction deletion
      try {
        await supabase.storage.from('receipts').remove(paths);
      } catch (storageErr) {
        console.warn('Failed to delete receipt files from storage (orphaned files may remain):', storageErr);
      }
    }
    
    // receipt_items seront supprimés par CASCADE sur receipt_id
    await supabase
      .from('receipts')
      .delete()
      .eq('transaction_id', transactionId);
  }

  // 4. Supprimer la transaction
  await supabase.from('transactions').delete().eq('id', transactionId);
}

// Start new month - ensures allocations exist for the new month
// Only envelopes that have allocations in the CURRENT month are duplicated to the new month
// Envelopes with rollover=true carry over their net balance (allocated - spent)
// The rollover is capped at the savings goal target if one exists
export interface RolloverCelebration {
  envelopeName: string;
  goalName: string | null;
  threshold: number;
}

export interface PendingRecurringInfo {
  envelopeId: string;
  envelopeName: string;
  pendingAmount: number;
  pendingCount: number;
}

export interface StartNewMonthResult {
  nextMonthKey: string;
  overdrafts?: Array<{ envelopeId: string; envelopeName: string; overdraftAmount: number }>;
  celebrations?: RolloverCelebration[];
  alreadyRolledOver?: boolean;
  pendingRecurring?: PendingRecurringInfo[];
}

// Check if a rollover has already been performed for a given source→target
async function checkExistingRollover(ctx: QueryContext, sourceMonthKey: string, targetMonthKey: string): Promise<boolean> {
  let query = supabase
    .from('rollover_history')
    .select('id')
    .eq('source_month_key', sourceMonthKey)
    .eq('target_month_key', targetMonthKey)
    .limit(1);

  if (ctx.householdId) {
    query = query.eq('household_id', ctx.householdId);
  } else {
    query = query.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data } = await query;
  return (data && data.length > 0) || false;
}

// Fetch pending recurring transactions for envelopes in a given month
async function fetchPendingRecurring(ctx: QueryContext, sourceMonthKey: string, envelopeIds: string[]): Promise<PendingRecurringInfo[]> {
  if (envelopeIds.length === 0) return [];

  // Get the end of the source month
  const [year, month] = sourceMonthKey.split('-').map(Number);
  const endOfMonth = new Date(year, month, 0); // last day of month
  const today = new Date();
  
  // Only look at recurring transactions due between now and end of month
  if (today > endOfMonth) return [];

  let query = supabase
    .from('recurring_transactions')
    .select('id, envelope_id, amount, description, next_due_date')
    .eq('is_active', true)
    .in('envelope_id', envelopeIds)
    .lte('next_due_date', endOfMonth.toISOString().split('T')[0])
    .gte('next_due_date', today.toISOString().split('T')[0]);

  if (ctx.householdId) {
    query = query.eq('household_id', ctx.householdId);
  } else {
    query = query.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data } = await query;
  if (!data || data.length === 0) return [];

  // Group by envelope
  const grouped = new Map<string, { amount: number; count: number }>();
  for (const rec of data) {
    const existing = grouped.get(rec.envelope_id) || { amount: 0, count: 0 };
    existing.amount += Number(rec.amount);
    existing.count += 1;
    grouped.set(rec.envelope_id, existing);
  }

  // We need envelope names - fetch from envelopes table
  const { data: envelopes } = await supabase
    .from('envelopes')
    .select('id, name')
    .in('id', Array.from(grouped.keys()));

  const nameMap = new Map((envelopes || []).map(e => [e.id, e.name]));

  return Array.from(grouped.entries()).map(([envId, info]) => ({
    envelopeId: envId,
    envelopeName: nameMap.get(envId) || 'Inconnu',
    pendingAmount: info.amount,
    pendingCount: info.count,
  }));
}

export async function startNewMonthDb(ctx: QueryContext, currentMonthKey: string, forceOverwrite = false): Promise<StartNewMonthResult> {
  const [year, month] = currentMonthKey.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;

  // 0) Idempotency check: prevent double rollover (Bug #1)
  if (!forceOverwrite) {
    const alreadyDone = await checkExistingRollover(ctx, currentMonthKey, nextMonthKey);
    if (alreadyDone) {
      return { nextMonthKey, alreadyRolledOver: true };
    }
  }

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
  if (!currentAllocs || currentAllocs.length === 0) return { nextMonthKey };

  // Get envelope IDs from current month allocations
  const currentMonthEnvelopeIds = currentAllocs.map(a => a.envelope_id);

  // 3) Fetch envelope details only for envelopes that exist in current month
  const { data: envelopes } = await supabase
    .from('envelopes')
    .select('id, name, rollover, rollover_strategy, rollover_percentage, max_rollover_amount')
    .in('id', currentMonthEnvelopeIds);

  if (!envelopes || envelopes.length === 0) return { nextMonthKey };

  // Create maps for easy lookup
  const envelopeMap = new Map(envelopes.map(e => [e.id, e]));
  const currentAllocMap = new Map(currentAllocs.map(a => [a.envelope_id, { 
    allocated: Number(a.allocated), 
    spent: Number(a.spent) 
  }]));

  // 4) Fetch savings goals to check target amounts and celebrations
  let goalsQuery = supabase
    .from('savings_goals')
    .select('envelope_id, target_amount, name, celebration_threshold');

  if (ctx.householdId) {
    goalsQuery = goalsQuery.eq('household_id', ctx.householdId);
  } else {
    goalsQuery = goalsQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: savingsGoals } = await goalsQuery;
  const goalsMap = new Map((savingsGoals || []).map(g => [g.envelope_id, {
    target_amount: Number(g.target_amount),
    name: g.name,
    celebration_threshold: g.celebration_threshold || [100],
  }]));

  // 5) Check existing allocations for next month
  let existingAllocsQuery = supabase
    .from('envelope_allocations')
    .select('envelope_id, allocated')
    .eq('month_key', nextMonthKey);

  if (ctx.householdId) {
    existingAllocsQuery = existingAllocsQuery.eq('household_id', ctx.householdId);
  } else {
    existingAllocsQuery = existingAllocsQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: existingAllocs } = await existingAllocsQuery;
  const existingAllocsMap = new Map((existingAllocs || []).map(a => [a.envelope_id, Number(a.allocated)]));

  // 6) Track overdrafts
  const overdrafts: Array<{ envelopeId: string; envelopeName: string; overdraftAmount: number }> = [];

  // 7) Process allocations: insert new ones and update existing ones for rollover envelopes
  const allocationsToInsert: {
    user_id: string;
    household_id: string | null;
    envelope_id: string;
    month_key: string;
    allocated: number;
    spent: number;
  }[] = [];
  
  const allocationsToUpdate: { envelopeId: string; carryOverAmount: number }[] = [];
  const rolloverHistoryEntries: { envelope_id: string; envelope_name: string; amount: number; strategy: string }[] = [];

  for (const envelopeId of currentMonthEnvelopeIds) {
    const envelope = envelopeMap.get(envelopeId);
    
    // Protection: skip deleted envelopes (Bug #7)
    if (!envelope) {
      console.warn(`Envelope ${envelopeId} was deleted, skipping rollover`);
      continue;
    }

    const hasRollover = envelope.rollover === true;
    const allocData = currentAllocMap.get(envelopeId) || { allocated: 0, spent: 0 };
    const goalData = goalsMap.get(envelopeId);
    const targetAmount = goalData?.target_amount || 0;
    
    // Track overdrafts (Bug #2)
    const rawBalance = allocData.allocated - allocData.spent;
    if (rawBalance < 0) {
      overdrafts.push({
        envelopeId,
        envelopeName: envelope.name || 'Inconnu',
        overdraftAmount: Math.abs(rawBalance),
      });
    }
    
    let carryOverAmount = 0;
    if (hasRollover) {
      const netBalance = Math.max(0, rawBalance);
      const strategy = (envelope as any)?.rollover_strategy || 'full';
      const percentage = (envelope as any)?.rollover_percentage;
      const maxAmount = (envelope as any)?.max_rollover_amount != null ? Number((envelope as any).max_rollover_amount) : undefined;
      carryOverAmount = applyRolloverStrategy(netBalance, strategy, percentage, maxAmount, targetAmount);
      
      if (carryOverAmount > 0) {
        rolloverHistoryEntries.push({
          envelope_id: envelopeId,
          envelope_name: envelope.name || 'Inconnu',
          amount: carryOverAmount,
          strategy: strategy,
        });
      }
    }

    const existingAllocation = existingAllocsMap.get(envelopeId);
    
    if (existingAllocation === undefined) {
      // No allocation exists for this envelope in the next month - insert new
      allocationsToInsert.push({
        user_id: ctx.userId,
        household_id: ctx.householdId || null,
        envelope_id: envelopeId,
        month_key: nextMonthKey,
        allocated: carryOverAmount,
        spent: 0,
      });
    } else if (hasRollover && carryOverAmount > 0) {
      // FIX Bug #1: ADD to existing allocation instead of replacing
      allocationsToUpdate.push({ envelopeId, carryOverAmount });
    }
  }

  // Insert new allocations
  if (allocationsToInsert.length > 0) {
    await supabase.from('envelope_allocations').insert(allocationsToInsert);
  }

  // Update existing allocations atomically using RPC (Bug #2: concurrency fix)
  for (const { envelopeId, carryOverAmount } of allocationsToUpdate) {
    await supabase.rpc('adjust_allocation_atomic', {
      p_envelope_id: envelopeId,
      p_month_key: nextMonthKey,
      p_amount: carryOverAmount,
    });
  }

  // Log rollover history (Amélioration #4)
  if (rolloverHistoryEntries.length > 0) {
    await supabase.from('rollover_history').insert(
      rolloverHistoryEntries.map(entry => ({
        household_id: ctx.householdId || null,
        user_id: ctx.userId,
        envelope_id: entry.envelope_id,
        envelope_name: entry.envelope_name,
        source_month_key: currentMonthKey,
        target_month_key: nextMonthKey,
        amount: entry.amount,
        strategy: entry.strategy,
      }))
    );
  }

  // Check for savings goal celebrations triggered by rollover
  const celebrations: RolloverCelebration[] = [];
  for (const envelopeId of currentMonthEnvelopeIds) {
    const envelope = envelopeMap.get(envelopeId);
    if (!envelope) continue;
    const goalData = goalsMap.get(envelopeId);
    if (!goalData || goalData.target_amount <= 0) continue;
    
    const allocData = currentAllocMap.get(envelopeId) || { allocated: 0, spent: 0 };
    const previousAmount = Math.max(0, allocData.allocated - allocData.spent);
    
    // Find carry over amount for this envelope
    const inserted = allocationsToInsert.find(a => a.envelope_id === envelopeId);
    const updated = allocationsToUpdate.find(a => a.envelopeId === envelopeId);
    const carryOver = inserted?.allocated || updated?.carryOverAmount || 0;
    if (carryOver <= 0) continue;
    
    // In the new month, the new amount IS the carryOver (fresh month)
    const newAmount = carryOver;
    
    const celebration = checkCelebrationThreshold(
      previousAmount,
      previousAmount + carryOver, // total after rollover
      goalData.target_amount,
      goalData.celebration_threshold
    );
    
    if (celebration) {
      celebrations.push({
        envelopeName: envelope.name || 'Inconnu',
        goalName: goalData.name,
        threshold: celebration.threshold,
      });
    }
  }

  // Fetch pending recurring transactions (Bug #5)
  const rolloverEnvelopeIds = currentMonthEnvelopeIds.filter(id => {
    const env = envelopeMap.get(id);
    return env?.rollover;
  });
  const pendingRecurring = await fetchPendingRecurring(ctx, currentMonthKey, rolloverEnvelopeIds);

  return { 
    nextMonthKey, 
    overdrafts: overdrafts.length > 0 ? overdrafts : undefined,
    celebrations: celebrations.length > 0 ? celebrations : undefined,
    pendingRecurring: pendingRecurring.length > 0 ? pendingRecurring : undefined,
  };
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

// Helper: apply rollover strategy to compute carry-over amount
function applyRolloverStrategy(
  netBalance: number, 
  strategy: string, 
  percentage: number | null | undefined, 
  maxAmount: number | undefined, 
  targetAmount: number
): number {
  if (netBalance <= 0) return 0;
  let amount = netBalance;
  switch (strategy) {
    case 'none': return 0;
    case 'percentage': amount = netBalance * ((percentage ?? 100) / 100); break;
    case 'capped': amount = maxAmount != null ? Math.min(netBalance, maxAmount) : netBalance; break;
    case 'full': default: amount = netBalance; break;
  }
  if (targetAmount > 0) amount = Math.min(amount, targetAmount);
  return Math.round(amount * 100) / 100;
}

// Copy envelopes to a specific target month
// ONLY envelopes with rollover=true are copied
export async function copyEnvelopesToMonthDb(ctx: QueryContext, sourceMonthKey: string, targetMonthKey: string, forceOverwrite = false): Promise<{ count: number; total: number; overdrafts?: Array<{ envelopeId: string; envelopeName: string; overdraftAmount: number }>; celebrations?: RolloverCelebration[]; alreadyRolledOver?: boolean; pendingRecurring?: PendingRecurringInfo[] }> {
  // 0) Idempotency check (Bug #1: double rollover)
  if (!forceOverwrite) {
    const alreadyDone = await checkExistingRollover(ctx, sourceMonthKey, targetMonthKey);
    if (alreadyDone) {
      return { count: 0, total: 0, alreadyRolledOver: true };
    }
  }

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

  // 2) Fetch ONLY envelopes with rollover enabled
  let envelopesQuery = supabase
    .from('envelopes')
    .select('id, name, rollover, rollover_strategy, rollover_percentage, max_rollover_amount')
    .eq('rollover', true);
    
  if (ctx.householdId) {
    envelopesQuery = envelopesQuery.eq('household_id', ctx.householdId);
  } else {
    envelopesQuery = envelopesQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: envelopes } = await envelopesQuery;
  if (!envelopes || envelopes.length === 0) return { count: 0, total: 0 };

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
  let goalsQuery2 = supabase
    .from('savings_goals')
    .select('envelope_id, target_amount, name, celebration_threshold');

  if (ctx.householdId) {
    goalsQuery2 = goalsQuery2.eq('household_id', ctx.householdId);
  } else {
    goalsQuery2 = goalsQuery2.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: savingsGoals2 } = await goalsQuery2;
  const goalsMap2 = new Map((savingsGoals2 || []).map(g => [g.envelope_id, {
    target_amount: Number(g.target_amount),
    name: g.name,
    celebration_threshold: g.celebration_threshold || [100],
  }]));

  // 5) Check existing allocations for target month
  let existingAllocsQuery = supabase
    .from('envelope_allocations')
    .select('envelope_id, allocated')
    .eq('month_key', targetMonthKey);

  if (ctx.householdId) {
    existingAllocsQuery = existingAllocsQuery.eq('household_id', ctx.householdId);
  } else {
    existingAllocsQuery = existingAllocsQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: existingAllocs } = await existingAllocsQuery;
  const existingAllocsMap = new Map((existingAllocs || []).map(a => [a.envelope_id, a.allocated]));

  // 6) Process allocations: insert new ones and update existing ones
  const allocationsToInsert: {
    user_id: string;
    household_id: string | null;
    envelope_id: string;
    month_key: string;
    allocated: number;
    spent: number;
  }[] = [];
  
  const allocationsToUpdate: { envelopeId: string; carryOverAmount: number }[] = [];

  let totalCarryOver = 0;
  let rolloverCount = 0;
  const overdrafts: Array<{ envelopeId: string; envelopeName: string; overdraftAmount: number }> = [];

  for (const envelope of envelopes) {
    const sourceData = sourceAllocMap.get(envelope.id) || { allocated: 0, spent: 0 };
    const goalData2 = goalsMap2.get(envelope.id);
    const targetAmount = goalData2?.target_amount || 0;
    
    // Calculate net balance to carry over using strategy
    const rawBalance = sourceData.allocated - sourceData.spent;
    
    // Track overdrafts
    if (rawBalance < 0) {
      overdrafts.push({
        envelopeId: envelope.id,
        envelopeName: envelope.name || 'Inconnu',
        overdraftAmount: Math.abs(rawBalance),
      });
    }
    
    const netBalance = Math.max(0, rawBalance);
    const strategy = (envelope as any).rollover_strategy || 'full';
    const percentage = (envelope as any).rollover_percentage;
    const maxAmount = (envelope as any).max_rollover_amount != null ? Number((envelope as any).max_rollover_amount) : undefined;
    
    const carryOverAmount = applyRolloverStrategy(netBalance, strategy, percentage, maxAmount, targetAmount);

    if (carryOverAmount > 0) {
      totalCarryOver += carryOverAmount;
      rolloverCount++;
    }

    const existingAllocation = existingAllocsMap.get(envelope.id);
    
    if (existingAllocation === undefined) {
      allocationsToInsert.push({
        user_id: ctx.userId,
        household_id: ctx.householdId || null,
        envelope_id: envelope.id,
        month_key: targetMonthKey,
        allocated: carryOverAmount,
        spent: 0,
      });
    } else if (carryOverAmount > 0) {
      // FIX Bug #1: ADD to existing allocation instead of replacing
      allocationsToUpdate.push({ envelopeId: envelope.id, carryOverAmount });
    }
  }

  // Insert new allocations
  if (allocationsToInsert.length > 0) {
    await supabase.from('envelope_allocations').insert(allocationsToInsert);
  }

  // Update existing allocations atomically using RPC (Bug #2: concurrency fix)
  for (const { envelopeId, carryOverAmount } of allocationsToUpdate) {
    await supabase.rpc('adjust_allocation_atomic', {
      p_envelope_id: envelopeId,
      p_month_key: targetMonthKey,
      p_amount: carryOverAmount,
    });
  }

  // Log rollover history
  const rolloverHistoryEntries = envelopes
    .filter(env => {
      const sourceData = sourceAllocMap.get(env.id) || { allocated: 0, spent: 0 };
      const netBalance = Math.max(0, sourceData.allocated - sourceData.spent);
      return netBalance > 0;
    })
    .map(env => {
      const sourceData = sourceAllocMap.get(env.id) || { allocated: 0, spent: 0 };
      const targetAmount = goalsMap2.get(env.id)?.target_amount || 0;
      const netBalance = Math.max(0, sourceData.allocated - sourceData.spent);
      const strategy = (env as any).rollover_strategy || 'full';
      const percentage = (env as any).rollover_percentage;
      const maxAmount = (env as any).max_rollover_amount != null ? Number((env as any).max_rollover_amount) : undefined;
      const amount = applyRolloverStrategy(netBalance, strategy, percentage, maxAmount, targetAmount);
      return amount > 0 ? {
        household_id: ctx.householdId || null,
        user_id: ctx.userId,
        envelope_id: env.id,
        envelope_name: env.name || 'Inconnu',
        source_month_key: sourceMonthKey,
        target_month_key: targetMonthKey,
        amount,
        strategy,
      } : null;
    })
    .filter(Boolean);

  if (rolloverHistoryEntries.length > 0) {
    await supabase.from('rollover_history').insert(rolloverHistoryEntries);
  }

  // Check for savings goal celebrations triggered by rollover
  const celebrations2: RolloverCelebration[] = [];
  for (const envelope of envelopes) {
    const goalData2 = goalsMap2.get(envelope.id);
    if (!goalData2 || goalData2.target_amount <= 0) continue;
    
    const sourceData = sourceAllocMap.get(envelope.id) || { allocated: 0, spent: 0 };
    const previousAmount = Math.max(0, sourceData.allocated - sourceData.spent);
    
    const inserted = allocationsToInsert.find(a => a.envelope_id === envelope.id);
    const updated = allocationsToUpdate.find(a => a.envelopeId === envelope.id);
    const carryOver = inserted?.allocated || updated?.carryOverAmount || 0;
    if (carryOver <= 0) continue;
    
    const celebration = checkCelebrationThreshold(
      previousAmount,
      previousAmount + carryOver,
      goalData2.target_amount,
      goalData2.celebration_threshold
    );
    
    if (celebration) {
      celebrations2.push({
        envelopeName: envelope.name || 'Inconnu',
        goalName: goalData2.name,
        threshold: celebration.threshold,
      });
    }
  }

  // Fetch pending recurring transactions (Bug #5)
  const rolloverEnvelopeIds = envelopes.map(e => e.id);
  const pendingRecurring = await fetchPendingRecurring(ctx, sourceMonthKey, rolloverEnvelopeIds);

  return { count: rolloverCount, total: totalCarryOver, overdrafts: overdrafts.length > 0 ? overdrafts : undefined, celebrations: celebrations2.length > 0 ? celebrations2 : undefined, pendingRecurring: pendingRecurring.length > 0 ? pendingRecurring : undefined };
}

// Helper
function getNextMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

/**
 * Budget Integrity Check
 * Verifies and corrects inconsistencies between:
 * - Total incomes for the month
 * - Total allocations for the month
 * - Stored "to_be_budgeted" value
 */
export interface IntegrityCheckResult {
  isValid: boolean;
  totalIncomes: number;
  totalAllocations: number;
  storedToBeBudgeted: number;
  calculatedToBeBudgeted: number;
  discrepancy: number;
  message: string;
}

export async function checkBudgetIntegrity(
  ctx: QueryContext,
  monthKey: string
): Promise<IntegrityCheckResult> {
  // Fetch total incomes
  let incomeQuery = supabase
    .from('incomes')
    .select('amount')
    .eq('month_key', monthKey);

  if (ctx.householdId) {
    incomeQuery = incomeQuery.eq('household_id', ctx.householdId);
  } else {
    incomeQuery = incomeQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: incomes, error: incomeError } = await incomeQuery;
  if (incomeError) throw incomeError;

  const totalIncomes = (incomes || []).reduce((sum, inc) => sum + Number(inc.amount), 0);

  // Fetch total allocations
  let allocQuery = supabase
    .from('envelope_allocations')
    .select('allocated')
    .eq('month_key', monthKey);

  if (ctx.householdId) {
    allocQuery = allocQuery.eq('household_id', ctx.householdId);
  } else {
    allocQuery = allocQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: allocations, error: allocError } = await allocQuery;
  if (allocError) throw allocError;

  const totalAllocations = (allocations || []).reduce((sum, alloc) => sum + Number(alloc.allocated), 0);

  // Fetch current to_be_budgeted
  let budgetQuery = supabase
    .from('monthly_budgets')
    .select('to_be_budgeted')
    .eq('month_key', monthKey);

  if (ctx.householdId) {
    budgetQuery = budgetQuery.eq('household_id', ctx.householdId);
  } else {
    budgetQuery = budgetQuery.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data: budgets, error: budgetError } = await budgetQuery.maybeSingle();
  if (budgetError) throw budgetError;

  const storedToBeBudgeted = budgets ? Number(budgets.to_be_budgeted) : 0;
  const calculatedToBeBudgeted = totalIncomes - totalAllocations;
  const discrepancy = Math.abs(storedToBeBudgeted - calculatedToBeBudgeted);

  const isValid = discrepancy < 0.005; // Allow tiny floating point differences

  let message = '';
  if (isValid) {
    message = 'Budget intègre ✓';
  } else {
    message = `Incohérence détectée : ${discrepancy.toFixed(2)}€ de différence`;
  }

  return {
    isValid,
    totalIncomes,
    totalAllocations,
    storedToBeBudgeted,
    calculatedToBeBudgeted,
    discrepancy,
    message,
  };
}

/**
 * Corrects budget integrity by recalculating to_be_budgeted
 * from actual incomes and allocations
 */
export async function fixBudgetIntegrity(
  ctx: QueryContext,
  monthKey: string
): Promise<IntegrityCheckResult> {
  // Run integrity check to get calculated value
  const checkResult = await checkBudgetIntegrity(ctx, monthKey);

  if (!checkResult.isValid) {
    // Update the to_be_budgeted value
    let updateQuery = supabase
      .from('monthly_budgets')
      .update({ to_be_budgeted: checkResult.calculatedToBeBudgeted })
      .eq('month_key', monthKey);

    if (ctx.householdId) {
      updateQuery = updateQuery.eq('household_id', ctx.householdId);
    } else {
      updateQuery = updateQuery.eq('user_id', ctx.userId).is('household_id', null);
    }

    const { error } = await updateQuery;
    if (error) throw error;

    console.log(
      `✓ Budget corrected for ${monthKey}: ${checkResult.storedToBeBudgeted}€ → ${checkResult.calculatedToBeBudgeted}€`
    );
  }

  return checkResult;
}

// Export context type for use in other files
export type { QueryContext };
