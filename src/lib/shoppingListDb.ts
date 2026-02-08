/**
 * Database operations for shopping list
 */

import { getBackendClient } from '@/lib/backendClient';

export interface ShoppingItem {
  id: string;
  userId: string;
  householdId: string | null;
  name: string;
  quantity: number;
  estimatedPrice: number | null;
  envelopeId: string | null;
  isChecked: boolean;
  suggestedFromHistory: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DbShoppingItem {
  id: string;
  user_id: string;
  household_id: string | null;
  name: string;
  quantity: number;
  estimated_price: number | null;
  envelope_id: string | null;
  is_checked: boolean;
  suggested_from_history: boolean;
  created_at: string;
  updated_at: string;
}

const mapDbToShoppingItem = (item: DbShoppingItem): ShoppingItem => ({
  id: item.id,
  userId: item.user_id,
  householdId: item.household_id,
  name: item.name,
  quantity: item.quantity,
  estimatedPrice: item.estimated_price,
  envelopeId: item.envelope_id,
  isChecked: item.is_checked,
  suggestedFromHistory: item.suggested_from_history,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
});

/**
 * Fetch all shopping list items for the household
 */
export async function fetchShoppingList(householdId: string | null): Promise<ShoppingItem[]> {
  const supabase = getBackendClient();
  
  let query = supabase
    .from('shopping_list')
    .select('*')
    .order('is_checked', { ascending: true })
    .order('created_at', { ascending: false });

  if (householdId) {
    query = query.eq('household_id', householdId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching shopping list:', error);
    return [];
  }

  return (data || []).map((item: DbShoppingItem) => mapDbToShoppingItem(item));
}

export interface CreateShoppingItemInput {
  name: string;
  quantity?: number;
  estimatedPrice?: number | null;
  envelopeId?: string | null;
  suggestedFromHistory?: boolean;
}

/**
 * Add a new item to the shopping list
 */
export async function addShoppingItem(
  userId: string,
  householdId: string | null,
  item: CreateShoppingItemInput
): Promise<ShoppingItem | null> {
  const supabase = getBackendClient();

  const { data, error } = await supabase
    .from('shopping_list')
    .insert({
      user_id: userId,
      household_id: householdId,
      name: item.name,
      quantity: item.quantity ?? 1,
      estimated_price: item.estimatedPrice ?? null,
      envelope_id: item.envelopeId ?? null,
      suggested_from_history: item.suggestedFromHistory ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding shopping item:', error);
    throw error;
  }

  return mapDbToShoppingItem(data);
}

/**
 * Update a shopping item
 */
export async function updateShoppingItem(
  itemId: string,
  updates: Partial<{
    name: string;
    quantity: number;
    estimatedPrice: number | null;
    envelopeId: string | null;
    isChecked: boolean;
  }>
): Promise<void> {
  const supabase = getBackendClient();

  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
  if (updates.estimatedPrice !== undefined) updateData.estimated_price = updates.estimatedPrice;
  if (updates.envelopeId !== undefined) updateData.envelope_id = updates.envelopeId;
  if (updates.isChecked !== undefined) updateData.is_checked = updates.isChecked;

  const { error } = await supabase
    .from('shopping_list')
    .update(updateData)
    .eq('id', itemId);

  if (error) throw error;
}

/**
 * Delete a shopping item
 */
export async function deleteShoppingItem(itemId: string): Promise<void> {
  const supabase = getBackendClient();

  const { error } = await supabase
    .from('shopping_list')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

/**
 * Clear all checked items
 */
export async function clearCheckedItems(householdId: string | null): Promise<void> {
  const supabase = getBackendClient();

  let query = supabase
    .from('shopping_list')
    .delete()
    .eq('is_checked', true);

  if (householdId) {
    query = query.eq('household_id', householdId);
  }

  const { error } = await query;
  if (error) throw error;
}

/**
 * Get frequently purchased items from receipt history
 */
export async function getFrequentItems(householdId: string | null, limit = 10): Promise<Array<{ name: string; count: number; avgPrice: number }>> {
  const supabase = getBackendClient();

  // Query receipt_items to find frequently purchased items
  let query = supabase
    .from('receipt_items')
    .select('name, total_price');

  if (householdId) {
    query = query.eq('household_id', householdId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching frequent items:', error);
    return [];
  }

  // Aggregate by item name
  const itemMap = new Map<string, { count: number; totalPrice: number }>();
  
  for (const item of data || []) {
    const normalizedName = item.name.toLowerCase().trim();
    const existing = itemMap.get(normalizedName) || { count: 0, totalPrice: 0 };
    existing.count += 1;
    existing.totalPrice += item.total_price || 0;
    itemMap.set(normalizedName, existing);
  }

  // Sort by frequency and return top items
  return Array.from(itemMap.entries())
    .map(([name, stats]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      count: stats.count,
      avgPrice: stats.count > 0 ? stats.totalPrice / stats.count : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
