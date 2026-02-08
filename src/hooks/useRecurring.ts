import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBudget } from '@/contexts/BudgetContext';
import {
  RecurringTransaction,
  RecurringFrequency,
  fetchRecurringTransactions,
  fetchDueRecurringTransactions,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  applyRecurringTransaction,
  applyAllDueRecurringTransactions,
} from '@/lib/recurringDb';
import { logActivity } from '@/lib/activityDb';
import { toast } from 'sonner';

export function useRecurring() {
  const { user } = useAuth();
  const { household, currentMonthKey, refreshData } = useBudget();
  
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const getContext = useCallback(() => {
    if (!user) return null;
    return {
      userId: user.id,
      householdId: household?.id,
    };
  }, [user, household?.id]);

  // Fetch recurring transactions
  const fetchAll = useCallback(async () => {
    const ctx = getContext();
    if (!ctx) return;

    try {
      const [all, due] = await Promise.all([
        fetchRecurringTransactions(ctx),
        fetchDueRecurringTransactions(ctx),
      ]);
      setRecurring(all);
      setDueCount(due.length);
    } catch (error) {
      console.error('Error fetching recurring transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [getContext]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Create a new recurring transaction
  const create = useCallback(async (data: {
    envelopeId: string;
    amount: number;
    description: string;
    merchant?: string;
    frequency: RecurringFrequency;
    nextDueDate: string;
  }) => {
    const ctx = getContext();
    if (!ctx) return;

    try {
      await createRecurringTransaction(ctx, data);
      await logActivity(ctx, 'recurring_created', 'recurring_transaction', undefined, {
        description: data.description,
        amount: data.amount,
        frequency: data.frequency,
      });
      await fetchAll();
      toast.success('Dépense récurrente créée');
    } catch (error) {
      console.error('Error creating recurring transaction:', error);
      toast.error('Erreur lors de la création');
      throw error;
    }
  }, [getContext, fetchAll]);

  // Update a recurring transaction
  const update = useCallback(async (id: string, updates: {
    envelopeId?: string;
    amount?: number;
    description?: string;
    merchant?: string;
    frequency?: RecurringFrequency;
    nextDueDate?: string;
    isActive?: boolean;
  }) => {
    const ctx = getContext();
    if (!ctx) return;

    try {
      await updateRecurringTransaction(id, updates);
      await logActivity(ctx, 'recurring_updated', 'recurring_transaction', id);
      await fetchAll();
      toast.success('Dépense récurrente modifiée');
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
      toast.error('Erreur lors de la modification');
      throw error;
    }
  }, [getContext, fetchAll]);

  // Delete a recurring transaction
  const remove = useCallback(async (id: string) => {
    const ctx = getContext();
    if (!ctx) return;

    try {
      const toDelete = recurring.find(r => r.id === id);
      await deleteRecurringTransaction(id);
      await logActivity(ctx, 'recurring_deleted', 'recurring_transaction', id, {
        description: toDelete?.description,
      });
      await fetchAll();
      toast.success('Dépense récurrente supprimée');
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      toast.error('Erreur lors de la suppression');
      throw error;
    }
  }, [getContext, fetchAll, recurring]);

  // Apply a single recurring transaction now
  const applyNow = useCallback(async (id: string) => {
    const ctx = getContext();
    if (!ctx) return;

    const recurringItem = recurring.find(r => r.id === id);
    if (!recurringItem) return;

    try {
      await applyRecurringTransaction(ctx, recurringItem, currentMonthKey);
      await fetchAll();
      await refreshData();
      toast.success(`Dépense "${recurringItem.description}" appliquée`);
    } catch (error) {
      console.error('Error applying recurring transaction:', error);
      toast.error('Erreur lors de l\'application');
      throw error;
    }
  }, [getContext, recurring, currentMonthKey, fetchAll, refreshData]);

  // Apply all due recurring transactions
  const applyAllDue = useCallback(async () => {
    const ctx = getContext();
    if (!ctx) return 0;

    try {
      const count = await applyAllDueRecurringTransactions(ctx, currentMonthKey);
      await fetchAll();
      await refreshData();
      if (count > 0) {
        toast.success(`${count} dépense${count > 1 ? 's' : ''} récurrente${count > 1 ? 's' : ''} appliquée${count > 1 ? 's' : ''}`);
      }
      return count;
    } catch (error) {
      console.error('Error applying due recurring transactions:', error);
      toast.error('Erreur lors de l\'application des dépenses récurrentes');
      return 0;
    }
  }, [getContext, currentMonthKey, fetchAll, refreshData]);

  return {
    recurring,
    dueCount,
    loading,
    create,
    update,
    remove,
    applyNow,
    applyAllDue,
    refresh: fetchAll,
  };
}
