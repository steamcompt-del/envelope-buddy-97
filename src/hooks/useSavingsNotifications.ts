import { useEffect, useRef } from 'react';
import { useSavingsGoals } from './useSavingsGoals';
import { useBudget } from '@/contexts/BudgetContext';
import { toast } from 'sonner';
import { differenceInDays, parseISO } from 'date-fns';

export function useSavingsNotifications() {
  const { goals } = useSavingsGoals();
  const { envelopes, toBeBudgeted } = useBudget();
  const hasNotified = useRef(false);

  useEffect(() => {
    if (goals.length === 0 || hasNotified.current) return;
    hasNotified.current = true;

    const envelopeMap = new Map(envelopes.map(e => [e.id, e]));

    for (const goal of goals) {
      if (goal.is_paused) continue;

      const envelope = envelopeMap.get(goal.envelope_id);
      if (!envelope) continue;

      const currentAmount = envelope.allocated - envelope.spent;
      const progress = goal.target_amount > 0
        ? (currentAmount / goal.target_amount) * 100
        : 0;

      // Essential goal under-funded
      if (goal.priority === 'essential' && progress < 50 && goal.target_amount > 0) {
        toast.warning(
          `🔴 Objectif essentiel "${goal.name || envelope.name}" à ${Math.round(progress)}% seulement`,
          { duration: 8000 }
        );
        return; // Only show one notification
      }

      // Deadline approaching
      if (goal.target_date) {
        const daysRemaining = differenceInDays(parseISO(goal.target_date), new Date());

        if (daysRemaining <= 30 && daysRemaining > 0 && progress < 90) {
          toast.warning(
            `⏰ Plus que ${daysRemaining} jours pour "${goal.name || envelope.name}" (${Math.round(progress)}%)`,
            { duration: 8000 }
          );
          return;
        }

        if (daysRemaining < 0 && progress < 100) {
          toast.warning(
            `⚠️ Objectif "${goal.name || envelope.name}" dépassé de ${Math.abs(daysRemaining)} jours`,
            { duration: 8000 }
          );
          return;
        }
      }
    }

    // Suggest allocation if funds available and high priority goals exist
    if (toBeBudgeted > 100) {
      const highPriorityGoal = goals.find(g => {
        if (g.is_paused) return false;
        const env = envelopeMap.get(g.envelope_id);
        if (!env || g.target_amount <= 0) return false;
        const progress = (env.allocated / g.target_amount) * 100;
        return (g.priority === 'essential' || g.priority === 'high') && progress < 100;
      });

      if (highPriorityGoal) {
        const env = envelopeMap.get(highPriorityGoal.envelope_id);
        toast.info(
          `💡 ${toBeBudgeted.toFixed(0)}€ disponibles — pensez à alimenter "${highPriorityGoal.name || env?.name}"`,
          { duration: 6000 }
        );
      }
    }
  }, [goals, envelopes, toBeBudgeted]);
}
