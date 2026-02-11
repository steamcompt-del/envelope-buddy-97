import { Link } from 'react-router-dom';
import { useBudget } from '@/contexts/BudgetContext';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { MonthSelector } from './MonthSelector';
import { HouseholdSwitcher } from './HouseholdSwitcher';
import { useIsMobile } from '@/hooks/use-mobile';

interface BudgetHeaderProps {
  onAllocate: () => void;
  onAddIncome: () => void;
  onOpenSettings: () => void;
  onOpenIncomeHistory: () => void;
}

function formatCompact(num: number): string {
  if (Math.abs(num) >= 1000) {
    return `${(num / 1000).toFixed(1)}k€`;
  }
  return `${Math.round(num)}€`;
}

export function BudgetHeader({ onAllocate, onAddIncome, onOpenSettings, onOpenIncomeHistory }: BudgetHeaderProps) {
  const { toBeBudgeted: rawToBeBudgeted, envelopes, incomes } = useBudget();
  const isMobile = useIsMobile();
  
  // Normalize near-zero values to avoid "-0 €" display due to floating point precision
  const toBeBudgeted = Math.abs(rawToBeBudgeted) < 0.01 ? 0 : rawToBeBudgeted;
  
  // Calculate total spent across all envelopes
  const totalSpent = envelopes.reduce((sum, env) => sum + env.spent, 0);
  // Calculate total income for the month
  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  // Spending percentage
  const spentPercent = totalIncome > 0 ? Math.round((totalSpent / totalIncome) * 100) : 0;
  
  const isPositive = toBeBudgeted > 0;
  const isZero = toBeBudgeted === 0;

  if (isMobile) {
    return (
      <header className="sticky top-0 z-40 glass-card border-b relative">
        <div className="container py-2 space-y-1.5">
          {/* Line 1: Household + Month + Settings */}
          <div className="flex items-center justify-between">
            <HouseholdSwitcher compact />
            <MonthSelector compact />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onOpenSettings}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Line 2: Condensed stats */}
          <div className="flex items-center justify-between">
            <button
              onClick={onOpenIncomeHistory}
              className="flex-1 text-left hover:bg-muted/50 px-2 py-1 rounded-lg transition-colors"
            >
              <p className="text-[10px] text-muted-foreground leading-none mb-0.5">À budgétiser</p>
              <div className="flex items-baseline gap-1">
                <span className={cn(
                  "text-lg font-bold tracking-tight",
                  isPositive && "text-primary",
                  isZero && "text-muted-foreground",
                  toBeBudgeted < 0 && "text-destructive"
                )}>
                  {formatCompact(toBeBudgeted)}
                </span>
                {isPositive && (
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow flex-shrink-0" />
                )}
              </div>
            </button>

            <Separator orientation="vertical" className="h-8 mx-1" />

            <Link to="/expenses" className="flex-1 text-right hover:bg-muted/50 px-2 py-1 rounded-lg transition-colors">
              <p className="text-[10px] text-muted-foreground leading-none mb-0.5">Dépensé</p>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-lg font-bold tracking-tight text-destructive">
                  {formatCompact(totalSpent)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  /{formatCompact(totalIncome)}
                </span>
              </div>
            </Link>
          </div>

          {/* Mini progress bar */}
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-destructive to-red-600 transition-all duration-500"
              style={{ width: `${Math.min(spentPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Floating Allocate button */}
        {isPositive && (
          <Button
            onClick={onAllocate}
            size="sm"
            className="absolute right-3 top-1.5 rounded-full shadow-lg px-3 h-7 text-xs gradient-primary animate-pulse-glow"
          >
            Allouer
          </Button>
        )}
      </header>
    );
  }

  // Desktop layout (unchanged)
  return (
    <header className="sticky top-0 z-40 glass-card border-b">
      <div className="container py-4">
        <div className="flex items-center justify-between mb-3">
          <HouseholdSwitcher />
          <MonthSelector />
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <button 
            onClick={onOpenIncomeHistory}
            className="bg-muted/30 rounded-xl p-3 hover:bg-muted/50 transition-colors cursor-pointer text-left"
          >
            <p className="text-xs text-muted-foreground mb-0.5">À budgétiser</p>
            <div className="flex items-baseline gap-1">
              <span className={cn(
                "text-2xl font-bold tracking-tight transition-colors truncate",
                isPositive && "text-primary",
                isZero && "text-muted-foreground",
                toBeBudgeted < 0 && "text-destructive"
              )}>
                {toBeBudgeted.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })}
              </span>
              {isPositive && (
                <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse-glow flex-shrink-0" />
              )}
            </div>
          </button>
          
          <Link to="/expenses" className="bg-muted/30 rounded-xl p-3 hover:bg-muted/50 transition-colors cursor-pointer">
            <p className="text-xs text-muted-foreground mb-0.5">
              Dépensé {totalIncome > 0 && <span className="opacity-70">({spentPercent}%)</span>}
            </p>
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-2xl font-bold tracking-tight text-destructive truncate">
                {totalSpent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })}
              </span>
              {totalIncome > 0 && (
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  / {totalIncome.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })}
                </span>
              )}
            </div>
          </Link>
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={onOpenSettings} className="rounded-xl h-9 w-9">
              <Settings className="h-4 w-4" />
            </Button>
            <Link to="/planning">
              <Button variant="outline" size="sm" className="rounded-xl gap-1 px-3 h-9 text-sm">
                <Sparkles className="h-4 w-4" />
                Assistant IA
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onAddIncome} className="rounded-xl gap-1 px-3 h-9 text-sm">
              <Plus className="h-4 w-4" />
              Revenu
            </Button>
            {isPositive && (
              <Button onClick={onAllocate} size="sm" className="rounded-xl gradient-primary shadow-button animate-pulse-glow h-9 px-4 text-sm">
                Allouer
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
