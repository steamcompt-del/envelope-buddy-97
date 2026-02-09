import { Link } from 'react-router-dom';
import { useBudget } from '@/contexts/BudgetContext';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MonthSelector } from './MonthSelector';
import { HouseholdSwitcher } from './HouseholdSwitcher';

interface BudgetHeaderProps {
  onAllocate: () => void;
  onAddIncome: () => void;
  onOpenSettings: () => void;
}

export function BudgetHeader({ onAllocate, onAddIncome, onOpenSettings }: BudgetHeaderProps) {
  const { toBeBudgeted, envelopes, incomes } = useBudget();
  
  // Calculate total spent across all envelopes
  const totalSpent = envelopes.reduce((sum, env) => sum + env.spent, 0);
  // Calculate total income for the month
  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  // Spending percentage
  const spentPercent = totalIncome > 0 ? Math.round((totalSpent / totalIncome) * 100) : 0;
  
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
        
        {/* Budget stats - stack on mobile, row on desktop */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3">
          {/* À budgétiser */}
          <div className="bg-muted/30 rounded-xl p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">À budgétiser</p>
            <div className="flex items-baseline gap-1">
              <span 
                className={cn(
                  "text-lg sm:text-2xl font-bold tracking-tight transition-colors truncate",
                  isPositive && "text-primary",
                  isZero && "text-muted-foreground",
                  toBeBudgeted < 0 && "text-destructive"
                )}
              >
                {toBeBudgeted.toLocaleString('fr-FR', { 
                  style: 'currency', 
                  currency: 'EUR',
                  minimumFractionDigits: 0 
                })}
              </span>
              {isPositive && (
                <span className="inline-flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary animate-pulse-glow flex-shrink-0" />
              )}
            </div>
          </div>
          
          {/* Total dépensé / revenus - clickable to expenses page */}
          <Link to="/expenses" className="bg-muted/30 rounded-xl p-2 sm:p-3 hover:bg-muted/50 transition-colors cursor-pointer">
            <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">
              Dépensé {totalIncome > 0 && <span className="opacity-70">({spentPercent}%)</span>}
            </p>
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-lg sm:text-2xl font-bold tracking-tight text-destructive truncate">
                {totalSpent.toLocaleString('fr-FR', { 
                  style: 'currency', 
                  currency: 'EUR',
                  minimumFractionDigits: 0 
                })}
              </span>
              {totalIncome > 0 && (
                <span className="text-[10px] sm:text-sm text-muted-foreground whitespace-nowrap">
                  / {totalIncome.toLocaleString('fr-FR', { 
                    style: 'currency', 
                    currency: 'EUR',
                    minimumFractionDigits: 0 
                  })}
                </span>
              )}
            </div>
          </Link>
        </div>
        
        {/* Actions row */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onOpenSettings}
            className="rounded-xl h-8 w-8 sm:h-9 sm:w-9"
          >
            <Settings className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onAddIncome}
              className="rounded-xl gap-1 px-2 sm:px-3 h-8 sm:h-9 text-xs sm:text-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">Revenu</span>
            </Button>
            
            {isPositive && (
              <Button
                onClick={onAllocate}
                size="sm"
                className="rounded-xl gradient-primary shadow-button animate-pulse-glow h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm"
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
