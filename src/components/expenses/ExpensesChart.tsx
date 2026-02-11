import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Envelope } from '@/contexts/BudgetContext';
import { TransactionWithEnvelope } from '@/components/expenses/TransactionRow';

const ENVELOPE_COLORS: Record<string, string> = {
  blue: 'hsl(210 100% 56%)',
  green: 'hsl(160 84% 45%)',
  orange: 'hsl(25 95% 53%)',
  pink: 'hsl(330 81% 60%)',
  purple: 'hsl(270 76% 60%)',
  yellow: 'hsl(45 93% 47%)',
  red: 'hsl(0 84% 60%)',
  teal: 'hsl(180 70% 45%)',
};

interface ExpensesChartProps {
  filteredTransactions: TransactionWithEnvelope[];
  envelopes: Envelope[];
}

interface ChartEntry {
  name: string;
  value: number;
  color: string;
  percent: number;
}

export function ExpensesChart({ filteredTransactions, envelopes }: ExpensesChartProps) {
  const { chartData, total } = useMemo(() => {
    const byEnvelope = new Map<string, number>();
    for (const t of filteredTransactions) {
      byEnvelope.set(t.envelopeId, (byEnvelope.get(t.envelopeId) || 0) + t.amount);
    }

    const envelopeMap = new Map(envelopes.map(e => [e.id, e]));
    const total = filteredTransactions.reduce((s, t) => s + t.amount, 0);

    const chartData: ChartEntry[] = Array.from(byEnvelope.entries())
      .map(([id, value]) => {
        const env = envelopeMap.get(id);
        return {
          name: env?.name || 'Autre',
          value,
          color: ENVELOPE_COLORS[env?.color || 'blue'] || ENVELOPE_COLORS.blue,
          percent: total > 0 ? Math.round((value / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.value - a.value);

    return { chartData, total };
  }, [filteredTransactions, envelopes]);

  if (chartData.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Donut Chart */}
      <div className="relative h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="85%"
              dataKey="value"
              stroke="hsl(var(--background))"
              strokeWidth={2}
              paddingAngle={2}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl sm:text-3xl font-bold text-foreground leading-none">
            {total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })}
          </span>
          <span className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">total filtré</span>
        </div>
      </div>

      {/* Legend grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 min-w-0">
            <span
              className="h-3 w-3 rounded-sm shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <div className="flex-1 min-w-0 flex items-baseline justify-between gap-1">
              <span className="text-xs text-foreground truncate">{entry.name}</span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                {entry.percent}% · {entry.value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
