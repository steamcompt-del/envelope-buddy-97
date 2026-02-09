import { Link } from 'react-router-dom';
import { useBudget } from '@/contexts/BudgetContext';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MonthSelector } from './MonthSelector';
import { HouseholdSwitcher } from './HouseholdSwitcher';

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
      <div className="container py-3 sm:py-4">
        {/* Household switcher + Month selector row */}
        <div className="flex items-center justify-between mb-3">
          <HouseholdSwitcher />
          <MonthSelector />
        </div>
        
        {/* Budget info row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground mb-0.5">À budgétiser</p>
            <div className="flex items-baseline gap-2">
              <span 
                className={cn(
                  "text-xl sm:text-3xl font-bold tracking-tight transition-colors truncate",
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
                <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse-glow flex-shrink-0" />
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Link to="/expenses">
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl h-8 w-8 sm:h-9 sm:w-9"
              >
                <Receipt className="h-4 w-4" />
              </Button>
            </Link>
            
            <Button
              variant="outline"
              size="icon"
              onClick={onOpenSettings}
              className="rounded-xl h-8 w-8 sm:h-9 sm:w-9"
            >
              <Settings className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onAddIncome}
              className="rounded-xl gap-1 px-2 sm:px-3 h-8 sm:h-9 text-xs sm:text-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Revenu</span>
            </Button>
            
            {isPositive && (
              <Button
                onClick={onAllocate}
                size="sm"
                className="rounded-xl gradient-primary shadow-button animate-pulse-glow h-8 sm:h-9 px-2 sm:px-4 text-xs sm:text-sm"
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
