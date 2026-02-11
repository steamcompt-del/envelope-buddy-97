import { getBackendClient } from '@/lib/backendClient';

const supabase = getBackendClient();

export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  envelopeId: string;
  amount: number;
  description: string;
  merchant?: string;
  frequency: RecurringFrequency;
  nextDueDate: string;
  isActive: boolean;
  createdAt: string;
}

interface DbRecurringTransaction {
  id: string;
  user_id: string;
  household_id: string | null;
  envelope_id: string;
  amount: number;
  description: string;
  merchant: string | null;
  frequency: RecurringFrequency;
  next_due_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface QueryContext {
  userId: string;
  householdId?: string;
}

// Frequency labels for UI
export const frequencyLabels: Record<RecurringFrequency, string> = {
  weekly: 'Chaque semaine',
  biweekly: 'Toutes les 2 semaines',
  monthly: 'Chaque mois',
  quarterly: 'Chaque trimestre',
  yearly: 'Chaque année',
};

// Helper to calculate next due date based on frequency
function calculateNextDueDate(currentDate: Date, frequency: RecurringFrequency): Date {
  const next = new Date(currentDate);
  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

// Map DB record to app model
function mapToRecurring(r: DbRecurringTransaction): RecurringTransaction {
  return {
    id: r.id,
    envelopeId: r.envelope_id,
    amount: Number(r.amount),
    description: r.description,
    merchant: r.merchant || undefined,
    frequency: r.frequency,
    nextDueDate: r.next_due_date,
    isActive: r.is_active,
    createdAt: r.created_at,
  };
}

// Fetch all recurring transactions
export async function fetchRecurringTransactions(ctx: QueryContext): Promise<RecurringTransaction[]> {
  let query = supabase
    .from('recurring_transactions')
    .select('*')
    .order('next_due_date', { ascending: true });

  if (ctx.householdId) {
    query = query.eq('household_id', ctx.householdId);
  } else {
    query = query.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(mapToRecurring);
}

// Fetch recurring transactions due today or earlier
export async function fetchDueRecurringTransactions(ctx: QueryContext): Promise<RecurringTransaction[]> {
  const today = new Date().toISOString().split('T')[0];
  
  let query = supabase
    .from('recurring_transactions')
    .select('*')
    .eq('is_active', true)
    .lte('next_due_date', today);

  if (ctx.householdId) {
    query = query.eq('household_id', ctx.householdId);
  } else {
    query = query.eq('user_id', ctx.userId).is('household_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(mapToRecurring);
}

// Create a recurring transaction
export async function createRecurringTransaction(
  ctx: QueryContext,
  data: {
    envelopeId: string;
    amount: number;
    description: string;
    merchant?: string;
    frequency: RecurringFrequency;
    nextDueDate: string;
  }
): Promise<string> {
  const { data: inserted, error } = await supabase
    .from('recurring_transactions')
    .insert({
      user_id: ctx.userId,
      household_id: ctx.householdId || null,
      envelope_id: data.envelopeId,
      amount: data.amount,
      description: data.description,
      merchant: data.merchant || null,
      frequency: data.frequency,
      next_due_date: data.nextDueDate,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) throw error;
  return inserted.id;
}

// Update a recurring transaction
export async function updateRecurringTransaction(
  id: string,
  updates: {
    envelopeId?: string;
    amount?: number;
    description?: string;
    merchant?: string;
    frequency?: RecurringFrequency;
    nextDueDate?: string;
    isActive?: boolean;
  }
): Promise<void> {
  const dbUpdates: Record<string, unknown> = {};
  
  if (updates.envelopeId !== undefined) dbUpdates.envelope_id = updates.envelopeId;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.merchant !== undefined) dbUpdates.merchant = updates.merchant || null;
  if (updates.frequency !== undefined) dbUpdates.frequency = updates.frequency;
  if (updates.nextDueDate !== undefined) dbUpdates.next_due_date = updates.nextDueDate;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { error } = await supabase
    .from('recurring_transactions')
    .update(dbUpdates)
    .eq('id', id);

  if (error) throw error;
}

// Delete a recurring transaction
export async function deleteRecurringTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('recurring_transactions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Apply a recurring transaction (create the actual transaction and update next due date)
export async function applyRecurringTransaction(
  ctx: QueryContext,
  recurring: RecurringTransaction,
  monthKey: string
): Promise<string> {
  // Import addTransactionDb dynamically to avoid circular dependency
  const { addTransactionDb } = await import('@/lib/budgetDb');
  
  // Create the actual transaction
  const transactionId = await addTransactionDb(
    ctx,
    monthKey,
    recurring.envelopeId,
    recurring.amount,
    recurring.description,
    recurring.merchant
  );

  // Calculate and update next due date
  const currentDue = new Date(recurring.nextDueDate);
  const nextDue = calculateNextDueDate(currentDue, recurring.frequency);
  
  await updateRecurringTransaction(recurring.id, {
    nextDueDate: nextDue.toISOString().split('T')[0],
  });

  return transactionId;
}

// Apply all due recurring transactions
export async function applyAllDueRecurringTransactions(
  ctx: QueryContext,
  monthKey: string
): Promise<number> {
  const dueTransactions = await fetchDueRecurringTransactions(ctx);
  
  let appliedCount = 0;
  for (const recurring of dueTransactions) {
    try {
      await applyRecurringTransaction(ctx, recurring, monthKey);
      appliedCount++;
    } catch (error) {
      console.error(`Failed to apply recurring transaction ${recurring.id}:`, error);
    }
  }
  
  return appliedCount;
}

// Test manual trigger of the auto-apply edge function
export async function testAutoApply(): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke('process-recurring-transactions', {});

  if (error) {
    console.error('Error testing auto-apply:', error);
    throw error;
  }

  return data;
}

export type { QueryContext };
