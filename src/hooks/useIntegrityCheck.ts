import { useBudget } from '@/contexts/BudgetContext';
import { type IntegrityCheckResult } from '@/lib/budgetDb';

/**
 * Hook to check and fix budget integrity
 * Detects and corrects inconsistencies between recorded and calculated balances
 */
export function useIntegrityCheck() {
  const { checkBudgetIntegrity, fixBudgetIntegrity, currentMonthKey } = useBudget();

  const check = async (monthKey?: string): Promise<IntegrityCheckResult> => {
    return await checkBudgetIntegrity(monthKey);
  };

  const fix = async (monthKey?: string): Promise<IntegrityCheckResult> => {
    return await fixBudgetIntegrity(monthKey);
  };

  return {
    check,
    fix,
    currentMonthKey,
  };
}
