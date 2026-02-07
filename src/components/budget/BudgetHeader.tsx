import { useBudget } from '@/contexts/BudgetContext';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BudgetHeaderProps {
  onAllocate: () => void;
  onAddIncome: () => void;
  onOpenSettings: () => void;
}

export function BudgetHeader({ onAllocate, onAddIncome, onOpenSettings }: BudgetHeaderProps) {
  const { toBeBudgeted } = useBudget();
  
  const isPositive = toBeBudgeted > 0;
  const isZero = toBeBudgeted === 0;
  
  return (
    <header className="sticky top-0 z-40 glass-card border-b">
      <div className="container py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">À budgétiser</p>
            <div className="flex items-baseline gap-2">
              <span 
                className={cn(
                  "text-4xl font-bold tracking-tight transition-colors",
                  isPositive && "text-primary",
                  isZero && "text-muted-foreground",
                  toBeBudgeted < 0 && "text-destructive"
                )}
              >
                {toBeBudgeted.toLocaleString('fr-FR', { 
                  style: 'currency', 
                  currency: 'EUR',
                  minimumFractionDigits: 2 
                })}
              </span>
              {isPositive && (
                <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onOpenSettings}
              className="rounded-xl"
            >
              <Settings className="h-5 w-5" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onAddIncome}
              className="rounded-xl gap-2"
            >
              <Plus className="h-4 w-4" />
              Revenu
            </Button>
            
            {isPositive && (
              <Button
                onClick={onAllocate}
                className="rounded-xl gradient-primary shadow-button animate-pulse-glow"
              >
                Allouer
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
