import { getBackendClient } from '@/lib/backendClient';

const supabase = getBackendClient();

/**
 * Adjust the `spent` column on envelope_allocations for a split transaction.
 * - Subtracts `totalAmount` from the primary envelope (which was fully charged by addTransactionDb)
 * - Adds each split's amount to its respective envelope
 */
export async function adjustSpentForSplits(
  userId: string,
  householdId: string | null,
  monthKey: string,
  primaryEnvelopeId: string,
  totalAmount: number,
  splits: SplitInput[]
): Promise<void> {
  // 1. Subtract full amount from primary envelope (it was over-charged)
  const { data: primaryAlloc } = await supabase
    .from('envelope_allocations')
    .select('id, spent')
    .eq('envelope_id', primaryEnvelopeId)
    .eq('month_key', monthKey)
    .single();

  if (primaryAlloc) {
    const primarySplitAmount = splits.find(s => s.envelopeId === primaryEnvelopeId)?.amount ?? 0;
    // Set spent to (current - total + primarySplitAmount) i.e. remove full, add back split portion
    await supabase
      .from('envelope_allocations')
      .update({ spent: Number(primaryAlloc.spent) - totalAmount + primarySplitAmount })
      .eq('id', primaryAlloc.id);
  }

  // 2. Add split amounts to secondary envelopes
  for (const split of splits) {
    if (split.envelopeId === primaryEnvelopeId) continue; // already handled above

    const { data: alloc } = await supabase
      .from('envelope_allocations')
      .select('id, spent')
      .eq('envelope_id', split.envelopeId)
      .eq('month_key', monthKey)
      .single();

    if (alloc) {
      await supabase
        .from('envelope_allocations')
        .update({ spent: Number(alloc.spent) + split.amount })
        .eq('id', alloc.id);
    } else {
      await supabase.from('envelope_allocations').insert({
        user_id: userId,
        household_id: householdId,
        envelope_id: split.envelopeId,
        month_key: monthKey,
        allocated: 0,
        spent: split.amount,
      });
    }
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
