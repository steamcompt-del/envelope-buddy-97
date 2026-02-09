import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Target } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SavingsGoal } from '@/lib/savingsGoalsDb';

interface SavingsGoalProgressProps {
  goal: SavingsGoal;
  currentAmount: number;
  compact?: boolean;
  onClick?: () => void;
}

function getProgressColorHsl(percent: number): string {
  if (percent >= 100) return "hsl(160 84% 45%)"; // green (complete)
  if (percent >= 75) return "hsl(160 84% 45%)"; // green
  if (percent >= 50) return "hsl(45 93% 47%)"; // yellow
  return "hsl(25 95% 53%)"; // orange
}

export function SavingsGoalProgress({ goal, currentAmount, compact = false, onClick }: SavingsGoalProgressProps) {
  const percentComplete = goal.target_amount > 0 
    ? Math.min((currentAmount / goal.target_amount) * 100, 100)
    : 0;
  
  const remaining = Math.max(0, goal.target_amount - currentAmount);
  const isComplete = currentAmount >= goal.target_amount;
  const progressColor = getProgressColorHsl(percentComplete);
  
  // Calculate days remaining if target date exists
  let daysRemaining: number | null = null;
  if (goal.target_date) {
    const targetDate = parseISO(goal.target_date);
    daysRemaining = differenceInDays(targetDate, new Date());
  }

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="w-full mt-2 p-2 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Target className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-foreground">
              {goal.name || 'Objectif'}
            </span>
          </div>
          <span className={cn(
            "text-xs font-semibold",
            isComplete ? "text-envelope-green" : "text-foreground"
          )}>
            {Math.round(percentComplete)}%
          </span>
        </div>
        <Progress 
          value={percentComplete} 
          className="h-1.5"
          style={{ '--progress-color': progressColor } as React.CSSProperties}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">
            {currentAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {goal.target_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      </button>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl bg-primary/5 border border-primary/20",
        onClick && "cursor-pointer hover:bg-primary/10 transition-colors"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-sm text-foreground">
              {goal.name || 'Objectif d\'épargne'}
            </h4>
            {goal.target_date && (
              <p className="text-xs text-muted-foreground">
                {daysRemaining !== null && daysRemaining > 0 
                  ? `${daysRemaining} jours restants`
                  : daysRemaining === 0 
                    ? "C'est aujourd'hui !"
                    : `Échéance : ${format(parseISO(goal.target_date), 'PPP', { locale: fr })}`
                }
              </p>
            )}
          </div>
        </div>
        {isComplete && (
          <span className="text-xs font-medium text-envelope-green bg-envelope-green/15 px-2 py-1 rounded-full">
            ✓ Atteint
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progression</span>
          <span className="font-semibold text-foreground">{Math.round(percentComplete)}%</span>
        </div>
        <Progress 
          value={percentComplete} 
          className="h-3"
          style={{ '--progress-color': progressColor } as React.CSSProperties}
        />
        <div className="flex justify-between text-sm">
          <span className="text-foreground font-medium">
            {currentAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
          <span className="text-muted-foreground">
            sur {goal.target_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
        {!isComplete && remaining > 0 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            Il manque {remaining.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
        )}
      </div>
    </div>
  );
}
