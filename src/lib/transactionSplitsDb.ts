import { getBackendClient } from '@/lib/backendClient';

const supabase = getBackendClient();

/**
 * Adjust the `spent` column on envelope_allocations for a split transaction.
 * Uses atomic functions to prevent race conditions.
 * - The primary envelope already had its spent incremented by addTransactionDb
 * - This function: subtracts the full amount from primary, then adds each split amount atomically
 */
export async function adjustSpentForSplits(
  userId: string,
  householdId: string | null,
  monthKey: string,
  primaryEnvelopeId: string,
  primaryAmount: number,
  splits: SplitInput[]
): Promise<void> {
  // Subtract the full primary amount (it was over-charged by addTransactionDb)
  await supabase.rpc('decrement_spent_atomic', {
    p_envelope_id: primaryEnvelopeId,
    p_month_key: monthKey,
    p_amount: primaryAmount,
  });

  // Add each split amount atomically
  for (const split of splits) {
    await supabase.rpc('increment_spent_atomic', {
      p_envelope_id: split.envelopeId,
      p_month_key: monthKey,
      p_amount: split.amount,
    });
  }
}

export interface TransactionSplit {
  id: string;
  parentTransactionId: string;
  envelopeId: string;
  amount: number;
  percentage: number;
  createdAt: string;
}

export interface SplitInput {
  envelopeId: string;
  amount: number;
}

export async function createTransactionSplits(
  userId: string,
  householdId: string | null,
  parentTransactionId: string,
  totalAmount: number,
  splits: SplitInput[]
): Promise<void> {
  const rows = splits.map(s => ({
    parent_transaction_id: parentTransactionId,
    envelope_id: s.envelopeId,
    amount: s.amount,
    percentage: Math.round((s.amount / totalAmount) * 100),
    user_id: userId,
    household_id: householdId,
  }));

  const { error } = await supabase
    .from('transaction_splits')
    .insert(rows);

  if (error) throw error;

  // Mark the parent transaction as split
  await supabase
    .from('transactions')
    .update({ is_split: true })
    .eq('id', parentTransactionId);
}

export async function updateTransactionSplits(
  parentTransactionId: string,
  newTotalAmount: number,
  newSplits: SplitInput[],
  userId: string,
  householdId: string | null
): Promise<void> {
  // 1. Delete old splits
  await deleteSplitsForTransaction(parentTransactionId);

  // 2. Create new ones
  const rows = newSplits.map(s => ({
    parent_transaction_id: parentTransactionId,
    envelope_id: s.envelopeId,
    amount: s.amount,
    percentage: Math.round((s.amount / newTotalAmount) * 100),
    user_id: userId,
    household_id: householdId,
  }));

  const { error } = await supabase.from('transaction_splits').insert(rows);
  if (error) throw error;
}

export async function fetchSplitsForTransaction(
  transactionId: string
): Promise<TransactionSplit[]> {
  const { data, error } = await supabase
    .from('transaction_splits')
    .select('*')
    .eq('parent_transaction_id', transactionId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    parentTransactionId: row.parent_transaction_id,
    envelopeId: row.envelope_id,
    amount: row.amount,
    percentage: row.percentage,
    createdAt: row.created_at,
  }));
}

export async function fetchSplitsForTransactions(
  transactionIds: string[]
): Promise<Map<string, TransactionSplit[]>> {
  if (transactionIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('transaction_splits')
    .select('*')
    .in('parent_transaction_id', transactionIds)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const map = new Map<string, TransactionSplit[]>();
  for (const row of data || []) {
    const split: TransactionSplit = {
      id: row.id,
      parentTransactionId: row.parent_transaction_id,
      envelopeId: row.envelope_id,
      amount: row.amount,
      percentage: row.percentage,
      createdAt: row.created_at,
    };
    const existing = map.get(split.parentTransactionId) || [];
    existing.push(split);
    map.set(split.parentTransactionId, existing);
  }
  return map;
}

export async function deleteSplitsForTransaction(
  transactionId: string
): Promise<void> {
  const { error } = await supabase
    .from('transaction_splits')
    .delete()
    .eq('parent_transaction_id', transactionId);

  if (error) throw error;
}
