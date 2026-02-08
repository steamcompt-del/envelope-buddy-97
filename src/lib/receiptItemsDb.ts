/**
 * Database operations for receipt items (detailed line items)
 */

import { getBackendClient } from '@/lib/backendClient';

export interface ReceiptItem {
  id: string;
  receiptId: string;
  name: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number;
  createdAt: string;
}

interface DbReceiptItem {
  id: string;
  receipt_id: string;
  user_id: string;
  household_id: string | null;
  name: string;
  quantity: number;
  unit_price: number | null;
  total_price: number;
  created_at: string;
}

const supabase = getBackendClient();

/**
 * Fetch all items for a receipt
 */
export async function fetchItemsForReceipt(receiptId: string): Promise<ReceiptItem[]> {
  const { data, error } = await supabase
    .from('receipt_items')
    .select('*')
    .eq('receipt_id', receiptId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching receipt items:', error);
    return [];
  }

  return (data || []).map((item: DbReceiptItem) => ({
    id: item.id,
    receiptId: item.receipt_id,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    totalPrice: item.total_price,
    createdAt: item.created_at,
  }));
}

/**
 * Fetch items for multiple receipts at once
 */
export async function fetchItemsForReceipts(receiptIds: string[]): Promise<Map<string, ReceiptItem[]>> {
  if (receiptIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('receipt_items')
    .select('*')
    .in('receipt_id', receiptIds)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching receipt items:', error);
    return new Map();
  }

  const map = new Map<string, ReceiptItem[]>();
  
  for (const item of (data || []) as DbReceiptItem[]) {
    const receiptItem: ReceiptItem = {
      id: item.id,
      receiptId: item.receipt_id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      createdAt: item.created_at,
    };
    
    const existing = map.get(item.receipt_id) || [];
    existing.push(receiptItem);
    map.set(item.receipt_id, existing);
  }

  return map;
}

export interface CreateReceiptItemInput {
  name: string;
  quantity?: number;
  unitPrice?: number | null;
  totalPrice: number;
}

/**
 * Add items to a receipt
 */
export async function addReceiptItems(
  userId: string,
  receiptId: string,
  householdId: string | null,
  items: CreateReceiptItemInput[]
): Promise<ReceiptItem[]> {
  if (items.length === 0) return [];

  const insertData = items.map((item) => ({
    user_id: userId,
    receipt_id: receiptId,
    household_id: householdId,
    name: item.name,
    quantity: item.quantity ?? 1,
    unit_price: item.unitPrice ?? null,
    total_price: item.totalPrice,
  }));

  const { data, error } = await supabase
    .from('receipt_items')
    .insert(insertData)
    .select();

  if (error) throw error;

  return (data || []).map((item: DbReceiptItem) => ({
    id: item.id,
    receiptId: item.receipt_id,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    totalPrice: item.total_price,
    createdAt: item.created_at,
  }));
}

/**
 * Delete all items for a receipt
 */
export async function deleteReceiptItems(receiptId: string): Promise<void> {
  const { error } = await supabase
    .from('receipt_items')
    .delete()
    .eq('receipt_id', receiptId);

  if (error) throw error;
}

/**
 * Update a single item
 */
export async function updateReceiptItem(
  itemId: string,
  updates: Partial<Omit<CreateReceiptItemInput, 'totalPrice'> & { totalPrice?: number }>
): Promise<void> {
  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
  if (updates.unitPrice !== undefined) updateData.unit_price = updates.unitPrice;
  if (updates.totalPrice !== undefined) updateData.total_price = updates.totalPrice;

  const { error } = await supabase
    .from('receipt_items')
    .update(updateData)
    .eq('id', itemId);

  if (error) throw error;
}

/**
 * Delete a single item
 */
export async function deleteReceiptItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('receipt_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}
