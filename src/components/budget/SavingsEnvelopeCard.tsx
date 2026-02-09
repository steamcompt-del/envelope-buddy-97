import { Envelope } from '@/contexts/BudgetContext';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { PiggyBank, Target } from 'lucide-react';
import { SavingsGoal } from '@/lib/savingsGoalsDb';

interface SavingsEnvelopeCardProps {
  envelope: Envelope;
  onClick: () => void;
  savingsGoal?: SavingsGoal;
}

export function SavingsEnvelopeCard({ envelope, onClick, savingsGoal }: SavingsEnvelopeCardProps) {
  const { name, allocated, spent } = envelope;
  
  const remaining = allocated - spent;
  const percentUsed = allocated > 0 ? (spent / allocated) * 100 : 0;
  
  // Savings goal progress
  const targetAmount = savingsGoal?.target_amount || 0;
  const savingsPercent = targetAmount > 0
    ? Math.min((allocated / targetAmount) * 100, 100)
    : 0;
  const isSavingsComplete = savingsGoal && allocated >= savingsGoal.target_amount;
  
  // Progress color for spending (green background theme)
  const progressColor = "hsl(160 84% 45%)"; // primary green
  const savingsProgressColor = isSavingsComplete 
    ? "hsl(160 84% 45%)" 
    : savingsPercent >= 50 
      ? "hsl(45 93% 47%)" 
      : "hsl(25 95% 53%)";
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl border text-left transition-all duration-200",
        "hover:scale-[1.02] hover:shadow-card active:scale-[0.98]",
        "bg-primary/10",
        "border-primary/30"
      )}
    >
      <div className="flex items-start gap-3 overflow-hidden">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20">
          <PiggyBank className="w-5 h-5 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0 overflow-hidden">
          <h3 className="font-semibold text-foreground break-all">{name}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {spent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} / {allocated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
        
        <div className="text-right shrink-0">
          <p className="font-semibold text-lg text-foreground">
            {remaining.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
          <p className="text-xs text-muted-foreground">restant</p>
        </div>
      </div>
      
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Dépensé</span>
          <span className="text-xs font-semibold text-foreground">{Math.round(percentUsed)}%</span>
        </div>
        <Progress 
          value={Math.min(percentUsed, 100)} 
          className="h-2 [&>div]:transition-colors"
          style={{ '--progress-color': progressColor } as React.CSSProperties}
        />
      </div>
      
      {/* Savings Goal Progress */}
      {savingsGoal && (
        <div className="mt-3 pt-3 border-t border-primary/20">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3 text-primary" />
              <span className="text-xs text-muted-foreground">
                {savingsGoal.name || 'Objectif'}
              </span>
            </div>
            <span className={cn(
              "text-xs font-semibold",
              isSavingsComplete ? "text-primary" : "text-foreground"
            )}>
              {Math.round(savingsPercent)}%
            </span>
          </div>
          <Progress 
            value={savingsPercent} 
            className="h-1.5"
            style={{ '--progress-color': savingsProgressColor } as React.CSSProperties}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">
              {allocated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {savingsGoal.target_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>
      )}
    </button>
  );
}
