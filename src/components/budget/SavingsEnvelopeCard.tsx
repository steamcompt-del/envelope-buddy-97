import { Envelope } from '@/contexts/BudgetContext';
import { cn } from '@/lib/utils';
import { CircularProgress } from './CircularProgress';
import { 
  PiggyBank, Target, TrendingUp, Sparkles, Star
} from 'lucide-react';
import { SavingsGoal } from '@/lib/savingsGoalsDb';
import { differenceInDays, parseISO, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SavingsEnvelopeCardProps {
  envelope: Envelope;
  onClick: () => void;
  savingsGoal?: SavingsGoal;
}

export function SavingsEnvelopeCard({ envelope, onClick, savingsGoal }: SavingsEnvelopeCardProps) {
  const { name, allocated } = envelope;
  
  // Calculate progress
  const targetAmount = savingsGoal?.target_amount || 0;
  const percentComplete = targetAmount > 0 
    ? Math.min((allocated / targetAmount) * 100, 100)
    : 0;
  const isComplete = allocated >= targetAmount && targetAmount > 0;
  const remaining = Math.max(0, targetAmount - allocated);
  
  // Calculate days remaining
  let daysRemaining: number | null = null;
  let targetDateFormatted: string | null = null;
  if (savingsGoal?.target_date) {
    const targetDate = parseISO(savingsGoal.target_date);
    daysRemaining = differenceInDays(targetDate, new Date());
    targetDateFormatted = format(targetDate, 'MMM yyyy', { locale: fr });
  }

  // Calculate monthly projection (simplified: if we continue at current pace)
  const monthsToGoal = remaining > 0 && allocated > 0 
    ? Math.ceil(remaining / (allocated / 3)) // Assume 3 months of history
    : null;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-5 rounded-2xl text-left transition-all duration-300",
        "hover:scale-[1.02] active:scale-[0.98]",
        "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
        "border-2 border-primary/20 hover:border-primary/40",
        "shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10",
        "relative overflow-hidden"
      )}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-xl -ml-8 -mb-8" />
      
      {/* Complete badge */}
      {isComplete && (
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-envelope-green/20 text-envelope-green px-2 py-1 rounded-full text-xs font-medium">
          <Star className="w-3 h-3 fill-current" />
          Atteint !
        </div>
      )}
      
      <div className="relative flex items-start gap-4">
        {/* Circular Progress */}
        <CircularProgress value={percentComplete} size={90} strokeWidth={6}>
          <div className="text-center">
            <span className={cn(
              "text-xl font-bold",
              isComplete ? "text-envelope-green" : "text-foreground"
            )}>
              {Math.round(percentComplete)}%
            </span>
          </div>
        </CircularProgress>
        
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header */}
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <PiggyBank className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <h3 className="font-semibold text-foreground break-all text-sm">{name}</h3>
              {savingsGoal?.name && (
                <p className="text-xs text-muted-foreground truncate">{savingsGoal.name}</p>
              )}
            </div>
          </div>
          
          {/* Amount */}
          <div>
            <p className="text-lg font-bold text-foreground">
              {allocated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
            {targetAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                sur {targetAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            )}
          </div>
          
          {/* Stats row */}
          <div className="flex items-center gap-3 flex-wrap">
            {daysRemaining !== null && daysRemaining > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Target className="w-3 h-3" />
                <span>{daysRemaining}j restants</span>
              </div>
            )}
            {targetDateFormatted && daysRemaining !== null && daysRemaining <= 0 && (
              <div className="flex items-center gap-1 text-xs text-envelope-orange">
                <Target className="w-3 h-3" />
                <span>Échéance dépassée</span>
              </div>
            )}
            {monthsToGoal && !isComplete && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="w-3 h-3" />
                <span>~{monthsToGoal} mois</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Remaining amount */}
      {!isComplete && remaining > 0 && (
        <div className="relative mt-4 pt-3 border-t border-primary/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Il manque</span>
            <span className="font-semibold text-foreground">
              {remaining.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </div>
      )}
      
      {/* Sparkle effect on hover */}
      <Sparkles className="absolute bottom-2 right-2 w-4 h-4 text-primary/20" />
    </button>
  );
}
