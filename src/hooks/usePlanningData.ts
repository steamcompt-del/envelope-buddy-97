import { useMemo } from 'react';
import { useBudget } from '@/contexts/BudgetContext';

export interface EnvelopeHistoryStats {
  envelopeId: string;
  name: string;
  icon: string;
  color: string;
  averageSpent: number;
  maxSpent: number;
  minSpent: number;
  monthsWithData: number;
  lastMonthSpent: number;
  currentAllocated: number;
  currentSpent: number;
}

export interface PlanningItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  plannedAmount: number;
  historyAverage: number;
  historyMax: number;
  currentAllocated: number;
  isNew: boolean;
}

export function usePlanningData() {
  const { envelopes, months, currentMonthKey, getAvailableMonths } = useBudget();
  
  // Calculate history stats for each envelope
  const envelopeStats = useMemo(() => {
    const availableMonths = getAvailableMonths();
    const stats: EnvelopeHistoryStats[] = [];
    
    // Get all unique envelope IDs across all months
    const envelopeMap = new Map<string, EnvelopeHistoryStats>();
    
    // Initialize with current envelopes
    envelopes.forEach(env => {
      envelopeMap.set(env.id, {
        envelopeId: env.id,
        name: env.name,
        icon: env.icon,
        color: env.color,
        averageSpent: 0,
        maxSpent: 0,
        minSpent: Infinity,
        monthsWithData: 0,
        lastMonthSpent: 0,
        currentAllocated: env.allocated,
        currentSpent: env.spent,
      });
    });
    
    // Calculate stats from historical data
    availableMonths
      .filter(m => m !== currentMonthKey) // Exclude current month from history
      .forEach(monthKey => {
        const monthData = months[monthKey];
        if (!monthData) return;
        
        monthData.envelopes.forEach(env => {
          const existing = envelopeMap.get(env.id);
          if (existing) {
            existing.monthsWithData++;
            existing.averageSpent = ((existing.averageSpent * (existing.monthsWithData - 1)) + env.spent) / existing.monthsWithData;
            existing.maxSpent = Math.max(existing.maxSpent, env.spent);
            existing.minSpent = Math.min(existing.minSpent, env.spent);
            
            // Track last month
            if (monthKey === getPreviousMonthKey(currentMonthKey)) {
              existing.lastMonthSpent = env.spent;
            }
          }
        });
      });
    
    // Convert to array and fix minSpent for envelopes with no history
    envelopeMap.forEach(stat => {
      if (stat.minSpent === Infinity) stat.minSpent = 0;
      stats.push(stat);
    });
    
    return stats;
  }, [envelopes, months, currentMonthKey, getAvailableMonths]);
  
  // Calculate total income from history
  const incomeStats = useMemo(() => {
    const availableMonths = getAvailableMonths();
    let totalIncome = 0;
    let monthsWithIncome = 0;
    
    availableMonths.forEach(monthKey => {
      const monthData = months[monthKey];
      if (!monthData) return;
      
      const monthIncome = monthData.incomes.reduce((sum, inc) => sum + inc.amount, 0);
      if (monthIncome > 0) {
        totalIncome += monthIncome;
        monthsWithIncome++;
      }
    });
    
    return {
      averageIncome: monthsWithIncome > 0 ? totalIncome / monthsWithIncome : 0,
      monthsWithData: monthsWithIncome,
    };
  }, [months, getAvailableMonths]);
  
  return {
    envelopeStats,
    incomeStats,
    envelopes,
    currentMonthKey,
  };
}

function getPreviousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}
