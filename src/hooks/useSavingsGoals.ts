import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/hooks/useHousehold';
import {
  SavingsGoal,
  fetchSavingsGoals,
  fetchSavingsGoalByEnvelope,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  addToSavingsGoal,
} from '@/lib/savingsGoalsDb';

export function useSavingsGoals() {
  const { user } = useAuth();
  const { household } = useHousehold();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const getContext = useCallback(() => {
    if (!user) return null;
    return {
      userId: user.id,
      householdId: household?.id,
    };
  }, [user, household?.id]);

  const loadGoals = useCallback(async () => {
    const ctx = getContext();
    if (!ctx) {
      setLoading(false);
      return;
    }

    try {
      const data = await fetchSavingsGoals(ctx);
      setGoals(data);
    } catch (error) {
      console.error('Error loading savings goals:', error);
    } finally {
      setLoading(false);
    }
  }, [getContext]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const getGoalForEnvelope = useCallback((envelopeId: string): SavingsGoal | undefined => {
    return goals.find(g => g.envelope_id === envelopeId);
  }, [goals]);

  const createGoal = useCallback(async (
    envelopeId: string,
    targetAmount: number,
    targetDate?: string,
    name?: string
  ) => {
    const ctx = getContext();
    if (!ctx) return;

    await createSavingsGoal(ctx, envelopeId, targetAmount, targetDate, name);
    await loadGoals();
  }, [getContext, loadGoals]);

  const updateGoal = useCallback(async (
    goalId: string,
    updates: {
      target_amount?: number;
      target_date?: string | null;
      current_amount?: number;
      name?: string | null;
    }
  ) => {
    await updateSavingsGoal(goalId, updates);
    await loadGoals();
  }, [loadGoals]);

  const deleteGoal = useCallback(async (goalId: string) => {
    await deleteSavingsGoal(goalId);
    await loadGoals();
  }, [loadGoals]);

  const addAmount = useCallback(async (goalId: string, amount: number) => {
    await addToSavingsGoal(goalId, amount);
    await loadGoals();
  }, [loadGoals]);

  return {
    goals,
    loading,
    getGoalForEnvelope,
    createGoal,
    updateGoal,
    deleteGoal,
    addAmount,
    refresh: loadGoals,
  };
}
