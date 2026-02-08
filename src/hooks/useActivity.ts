import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBudget } from '@/contexts/BudgetContext';
import { ActivityLogEntry, fetchActivityLog } from '@/lib/activityDb';

export function useActivity(limit: number = 50) {
  const { user } = useAuth();
  const { household } = useBudget();
  
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const getContext = useCallback(() => {
    if (!user) return null;
    return {
      userId: user.id,
      householdId: household?.id,
    };
  }, [user, household?.id]);

  const fetchAll = useCallback(async () => {
    const ctx = getContext();
    if (!ctx || !ctx.householdId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      const data = await fetchActivityLog(ctx, limit);
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activity log:', error);
    } finally {
      setLoading(false);
    }
  }, [getContext, limit]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    activities,
    loading,
    refresh: fetchAll,
  };
}
