import { Link } from 'react-router-dom';
import { useBudget } from '@/contexts/BudgetContext';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MonthSelector } from './MonthSelector';
import { HouseholdSwitcher } from './HouseholdSwitcher';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';

interface BudgetHeaderProps {
  onAllocate: () => void;
  onAddIncome: () => void;
  onOpenSettings: () => void;
  onOpenIncomeHistory: () => void;
}

const fmt = (v: number) =>
  v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 });

export function BudgetHeader({ onAllocate, onAddIncome, onOpenSettings, onOpenIncomeHistory }: BudgetHeaderProps) {
  const { toBeBudgeted: rawToBeBudgeted, envelopes, incomes } = useBudget();

  const toBeBudgeted = Math.abs(rawToBeBudgeted) < 0.01 ? 0 : rawToBeBudgeted;
  const totalSpent = envelopes.reduce((sum, env) => sum + env.spent, 0);
  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalAllocated = envelopes.reduce((sum, env) => sum + env.allocated, 0);
  const remaining = totalAllocated - totalSpent;
  const spentPercent = totalAllocated > 0 ? Math.min(Math.round((totalSpent / totalAllocated) * 100), 100) : 0;
  const isPositive = toBeBudgeted > 0;

  const { barColor, barColorHsl } = useMemo(() => {
    if (spentPercent >= 90) return { barColor: 'text-destructive', barColorHsl: 'hsl(0 84% 60%)' };
    if (spentPercent >= 75) return { barColor: 'text-warning', barColorHsl: 'hsl(38 92% 50%)' };
    return { barColor: 'text-success', barColorHsl: 'hsl(160 84% 39%)' };
  }, [spentPercent]);

  const chartData = [{ value: spentPercent, fill: barColorHsl }];

  return (
    <header className="sticky top-0 z-40 glass-card border-b">
      <div className="container py-3 sm:py-4">
        {/* Top row: household + month */}
        <div className="flex items-center justify-between mb-2">
          <HouseholdSwitcher />
          <MonthSelector />
        </div>

        {/* Radial chart + center label */}
        <div className="flex flex-col items-center -mt-1 mb-1">
          <div className="relative w-full max-w-[200px] sm:max-w-[240px] aspect-[2/1]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="100%"
                innerRadius="65%"
                outerRadius="100%"
                startAngle={180}
                endAngle={0}
                barSize={12}
                data={chartData}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar
                  dataKey="value"
                  cornerRadius={10}
                  background={{ fill: 'hsl(var(--muted))' }}
                  angleAxisId={0}
                />
              </RadialBarChart>
            </ResponsiveContainer>

            {/* Center overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5 pointer-events-none">
              <span className={cn('text-xl sm:text-3xl font-bold tracking-tight leading-none', barColor)}>
                {fmt(Math.max(remaining, 0))}
              </span>
              <span className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">
                reste à dépenser
              </span>
            </div>
          </div>

          {/* Sub-stats row */}
          <div className="flex flex-col xs:flex-row items-center justify-center gap-0.5 xs:gap-3 sm:gap-6 mt-2 text-[11px] sm:text-sm text-muted-foreground">
            <button onClick={onOpenIncomeHistory} className="hover:text-foreground transition-colors whitespace-nowrap">
              <span className="font-semibold text-foreground">{fmt(totalIncome)}</span>{' '}
              revenus
            </button>
            <Link to="/expenses" className="hover:text-foreground transition-colors whitespace-nowrap">
              <span className={cn('font-semibold', barColor)}>{fmt(totalSpent)}</span>{' '}
              dépensé ({spentPercent}%)
            </Link>
          </div>

          {/* À budgétiser pill */}
          {toBeBudgeted !== 0 && (
            <button
              onClick={onOpenIncomeHistory}
              className={cn(
                'mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors',
                isPositive
                  ? 'bg-primary/10 text-primary'
                  : 'bg-destructive/10 text-destructive'
              )}
            >
              {isPositive && (
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
              )}
              {fmt(toBeBudgeted)} à budgétiser
            </button>
          )}
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onOpenSettings}
              className="rounded-xl h-8 w-8 sm:h-9 sm:w-9"
            >
              <Settings className="h-4 w-4" />
            </Button>

            <Link to="/planning">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-1 px-2 sm:px-3 h-8 sm:h-9 text-xs sm:text-sm"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden xs:inline">Assistant IA</span>
              </Button>
            </Link>
          </div>

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
