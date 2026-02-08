/**
 * Database operations for receipts (multiple per transaction)
 */

import { getBackendClient } from '@/lib/backendClient';

export interface Receipt {
  id: string;
  transactionId: string;
  url: string;
  path: string;
  fileName?: string;
  createdAt: string;
}

interface DbReceipt {
  id: string;
  transaction_id: string;
  user_id: string;
  url: string;
  path: string;
  file_name: string | null;
  created_at: string;
}

const supabase = getBackendClient();

/**
 * Fetch all receipts for a transaction
 */
export async function fetchReceiptsForTransaction(transactionId: string): Promise<Receipt[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching receipts:', error);
    return [];
  }

  return (data || []).map((r: DbReceipt) => ({
    id: r.id,
    transactionId: r.transaction_id,
    url: r.url,
    path: r.path,
    fileName: r.file_name || undefined,
    createdAt: r.created_at,
  }));
}

/**
 * Add a receipt to a transaction
 */
export async function addReceiptDb(
  userId: string,
  transactionId: string,
  url: string,
  path: string,
  fileName?: string
): Promise<Receipt> {
  const { data, error } = await supabase
    .from('receipts')
    .insert({
      user_id: userId,
      transaction_id: transactionId,
      url,
      path,
      file_name: fileName || null,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    transactionId: data.transaction_id,
    url: data.url,
    path: data.path,
    fileName: data.file_name || undefined,
    createdAt: data.created_at,
  };
}

/**
 * Delete a receipt
 */
export async function deleteReceiptDb(receiptId: string): Promise<void> {
  const { error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', receiptId);

  if (error) throw error;
}

/**
 * Fetch all receipts for multiple transactions at once
 */
export async function fetchReceiptsForTransactions(transactionIds: string[]): Promise<Map<string, Receipt[]>> {
  if (transactionIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .in('transaction_id', transactionIds)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching receipts:', error);
    return new Map();
  }

  const map = new Map<string, Receipt[]>();
  
  for (const r of (data || []) as DbReceipt[]) {
    const receipt: Receipt = {
      id: r.id,
      transactionId: r.transaction_id,
      url: r.url,
      path: r.path,
      fileName: r.file_name || undefined,
      createdAt: r.created_at,
    };
    
    const existing = map.get(r.transaction_id) || [];
    existing.push(receipt);
    map.set(r.transaction_id, existing);
  }

  return map;
}
