import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/hooks/useHousehold';
import { getBackendClient } from '@/lib/backendClient';
import {
  fetchMonthData,
  fetchAvailableMonths,
  ensureMonthExists,
  addIncomeDb,
  updateIncomeDb,
  deleteIncomeDb,
  createEnvelopeDb,
  updateEnvelopeDb,
  deleteEnvelopeDb,
  reorderEnvelopesDb,
  allocateToEnvelopeDb,
  allocateInitialBalanceDb,
  deallocateFromEnvelopeDb,
  transferBetweenEnvelopesDb,
  addTransactionDb,
  updateTransactionDb,
  deleteTransactionDb,
  deleteTransactionCompleteDb,
  startNewMonthDb,
  copyEnvelopesToMonthDb,
  deleteMonthDataDb,
  deleteAllUserDataDb,
  checkBudgetIntegrity,
  fixBudgetIntegrity,
  type IntegrityCheckResult,
  QueryContext,
} from '@/lib/budgetDb';
import { logActivity } from '@/lib/activityDb';
import { fetchSavingsGoalByEnvelope, checkCelebrationThreshold } from '@/lib/savingsGoalsDb';

// Types
export type RolloverStrategy = 'full' | 'percentage' | 'capped' | 'none';
export type EnvelopeCategory = 'essentiels' | 'lifestyle' | 'epargne';

export interface Envelope {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  icon: string;
  color: string;
  category: EnvelopeCategory;
  rollover: boolean;
  rolloverStrategy: RolloverStrategy;
  rolloverPercentage?: number;
  maxRolloverAmount?: number;
}

export interface Transaction {
  id: string;
  envelopeId: string;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
  merchant?: string;
  receiptUrl?: string;
  receiptPath?: string;
  notes?: string;
  isSplit?: boolean;
}

export interface Income {
  id: string;
  amount: number;
  description: string;
  date: string;
}

export interface MonthlyBudget {
  monthKey: string;
  toBeBudgeted: number;
  envelopes: Envelope[];
  transactions: Transaction[];
  incomes: Income[];
}

interface BudgetContextType {
  // Loading state
  loading: boolean;
  
  // Household state
  householdLoading: boolean;
  needsHouseholdSetup: boolean;
  household: { id: string; name: string; invite_code: string; created_by: string | null } | null;
  households: { id: string; name: string; invite_code: string; created_by: string | null }[];
  switchHousehold: (householdId: string) => void;
  createHousehold: (name: string) => Promise<void>;
  joinHousehold: (code: string) => Promise<void>;
  leaveHousehold: (householdId?: string) => Promise<void>;
  deleteHousehold: (householdId?: string) => Promise<void>;
  updateHouseholdName: (name: string) => Promise<void>;
  regenerateInviteCode: () => Promise<string>;
  
  // Current month data
  currentMonthKey: string;
  toBeBudgeted: number;
  envelopes: Envelope[];
  transactions: Transaction[];
  incomes: Income[];
  
  // All months
  months: Record<string, MonthlyBudget>;
  
  // Month navigation
  setCurrentMonth: (monthKey: string) => void;
  getAvailableMonths: () => string[];
  createNewMonth: (monthKey: string) => void;
  copyEnvelopesToMonth: (targetMonthKey: string, forceOverwrite?: boolean) => Promise<{ count: number; total: number; overdrafts?: Array<{ envelopeId: string; envelopeName: string; overdraftAmount: number }>; celebrations?: Array<{ envelopeName: string; goalName: string | null; threshold: number }>; alreadyRolledOver?: boolean; pendingRecurring?: Array<{ envelopeId: string; envelopeName: string; pendingAmount: number; pendingCount: number }> }>;
  startNewMonth: () => void;
  
  // Income actions
  addIncome: (amount: number, description: string, date?: Date) => Promise<void>;
  updateIncome: (id: string, amount: number, description: string, date?: Date) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  
  // Envelope actions
  createEnvelope: (name: string, icon: string, color: string, category?: EnvelopeCategory) => Promise<string | undefined>;
  updateEnvelope: (id: string, updates: Partial<Omit<Envelope, 'id'>>) => Promise<void>;
  deleteEnvelope: (id: string, refundToBudget?: boolean) => Promise<void>;
  reorderEnvelopes: (orderedIds: string[]) => Promise<void>;
   allocateToEnvelope: (envelopeId: string, amount: number) => Promise<void>;
   allocateInitialBalance: (envelopeId: string, amount: number) => Promise<void>;
   deallocateFromEnvelope: (envelopeId: string, amount: number) => Promise<void>;
  transferBetweenEnvelopes: (fromId: string, toId: string, amount: number) => Promise<void>;
  
  // Transaction actions
  addTransaction: (envelopeId: string, amount: number, description: string, merchant?: string, receiptUrl?: string, receiptPath?: string, date?: string) => Promise<{ transactionId: string; alert?: { envelopeName: string; percent: number; isOver: boolean } }>;
  updateTransaction: (id: string, updates: { amount?: number; description?: string; merchant?: string; envelopeId?: string; receiptUrl?: string; receiptPath?: string; notes?: string; date?: string }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
  // Refresh data
  refreshData: () => Promise<void>;
  
  // Integrity checks
  checkBudgetIntegrity: (monthKey?: string) => Promise<IntegrityCheckResult>;
  fixBudgetIntegrity: (monthKey?: string) => Promise<IntegrityCheckResult>;
  
  // Delete data
  deleteMonthData: (monthKey: string) => Promise<void>;
  deleteAllUserData: () => Promise<void>;
  
  // Legacy
  resetMonth: () => void;
}

// Use globalThis to survive HMR context identity changes
const BUDGET_CTX_KEY = '__lovable_budget_ctx__' as const;
function getBudgetContext(): React.Context<BudgetContextType | null> {
  const g = globalThis as unknown as Record<string, React.Context<BudgetContextType | null>>;
  if (!g[BUDGET_CTX_KEY]) {
    g[BUDGET_CTX_KEY] = createContext<BudgetContextType | null>(null);
  }
  return g[BUDGET_CTX_KEY];
}
const BudgetContext = getBudgetContext();

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function createEmptyMonth(monthKey: string): MonthlyBudget {
  return {
    monthKey,
    toBeBudgeted: 0,
    envelopes: [],
    transactions: [],
    incomes: [],
  };
}

// Default envelope suggestions
export const defaultEnvelopeTemplates = [
  { name: 'Courses', icon: 'ShoppingCart', color: 'green' },
  { name: 'Restaurant', icon: 'Utensils', color: 'orange' },
  { name: 'Transport', icon: 'Car', color: 'blue' },
  { name: 'Loisirs', icon: 'Gamepad2', color: 'purple' },
  { name: 'Santé', icon: 'Heart', color: 'pink' },
  { name: 'Shopping', icon: 'ShoppingBag', color: 'yellow' },
  { name: 'Factures', icon: 'Receipt', color: 'teal' },
  { name: 'Épargne', icon: 'PiggyBank', color: 'green' },
];

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const {
    household,
    households,
    loading: householdLoading,
    needsSetup: needsHouseholdSetup,
    switchHousehold,
    create: createHouseholdFn,
    join: joinHouseholdFn,
    leave: leaveHouseholdFn,
    deleteHousehold: deleteHouseholdFn,
    updateName: updateHouseholdNameFn,
    regenerateCode: regenerateInviteCodeFn,
    refresh: refreshHousehold,
  } = useHousehold();
  
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentMonthKey, setCurrentMonthKey] = useState(getCurrentMonthKey());
  const [months, setMonths] = useState<Record<string, MonthlyBudget>>({});
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const hasLoadedRef = React.useRef(false);

  // Build query context
  const getQueryContext = useCallback((): QueryContext | null => {
    if (!user) return null;
    return {
      userId: user.id,
      householdId: household?.id,
    };
  }, [user, household?.id]);

  // Load data when user, household, or month changes
  const loadMonthData = useCallback(async (isInitial = false) => {
    const ctx = getQueryContext();
    if (!ctx) {
      setInitialLoading(false);
      return;
    }

    // Wait for household to be loaded
    if (householdLoading) return;

    if (isInitial) {
      setInitialLoading(true);
    }
    
    try {
      await ensureMonthExists(ctx, currentMonthKey);
      const monthData = await fetchMonthData(ctx, currentMonthKey);
      const available = await fetchAvailableMonths(ctx);
      
      setMonths(prev => ({
        ...prev,
        [currentMonthKey]: monthData,
      }));
      setAvailableMonths(available.length > 0 ? available : [currentMonthKey]);
    } catch (error) {
      console.error('Error loading budget data:', error);
    } finally {
      if (isInitial) {
        setInitialLoading(false);
      }
    }
  }, [getQueryContext, currentMonthKey, householdLoading]);

  useEffect(() => {
    // Don't load until household check is complete
    if (householdLoading) return;
    
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadMonthData(true);
    } else {
      loadMonthData(false);
    }
  }, [loadMonthData, householdLoading, household?.id]);

  // Reset loaded state when household changes
  useEffect(() => {
    hasLoadedRef.current = false;
    setMonths({});
    setAvailableMonths([]);
  }, [household?.id]);

  // Realtime subscriptions for live updates
  useEffect(() => {
    if (!household?.id) return;

    const supabase = getBackendClient();
    const channel = supabase
      .channel(`budget-${household.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monthly_budgets',
          filter: `household_id=eq.${household.id}`,
        },
        () => loadMonthData(false)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'envelopes',
          filter: `household_id=eq.${household.id}`,
        },
        () => loadMonthData(false)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'envelope_allocations',
          filter: `household_id=eq.${household.id}`,
        },
        () => loadMonthData(false)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `household_id=eq.${household.id}`,
        },
        () => loadMonthData(false)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incomes',
          filter: `household_id=eq.${household.id}`,
        },
        () => loadMonthData(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [household?.id, loadMonthData]);

  // Get current month data
  const currentMonth = months[currentMonthKey] || createEmptyMonth(currentMonthKey);

  // Household actions
  const createHousehold = useCallback(async (name: string) => {
    await createHouseholdFn(name);
  }, [createHouseholdFn]);

  const joinHousehold = useCallback(async (code: string) => {
    await joinHouseholdFn(code);
  }, [joinHouseholdFn]);

  const leaveHousehold = useCallback(async (householdId?: string) => {
    await leaveHouseholdFn(householdId);
  }, [leaveHouseholdFn]);

  const deleteHousehold = useCallback(async (householdId?: string) => {
    await deleteHouseholdFn(householdId);
  }, [deleteHouseholdFn]);

  const updateHouseholdName = useCallback(async (name: string) => {
    await updateHouseholdNameFn(name);
  }, [updateHouseholdNameFn]);

  const regenerateInviteCode = useCallback(async () => {
    return await regenerateInviteCodeFn();
  }, [regenerateInviteCodeFn]);

  // Month navigation
  const setCurrentMonth = useCallback((monthKey: string) => {
    setCurrentMonthKey(monthKey);
  }, []);

  const getAvailableMonths = useCallback(() => {
    return availableMonths;
  }, [availableMonths]);

  const createNewMonth = useCallback(async (monthKey: string) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    await ensureMonthExists(ctx, monthKey);
    setCurrentMonthKey(monthKey);
  }, [getQueryContext]);

  // Income actions
  const addIncome = useCallback(async (amount: number, description: string, date?: Date) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    const incomeId = await addIncomeDb(ctx, currentMonthKey, amount, description, date);
    await logActivity(ctx, 'income_added', 'income', incomeId, { amount, description });
    await loadMonthData();
  }, [getQueryContext, currentMonthKey, loadMonthData]);

  const updateIncome = useCallback(async (id: string, newAmount: number, newDescription: string, newDate?: Date) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    const income = currentMonth.incomes.find(i => i.id === id);
    if (!income) return;
    await updateIncomeDb(ctx, currentMonthKey, id, newAmount, newDescription, income.amount, newDate);
    await logActivity(ctx, 'income_updated', 'income', id, { amount: newAmount, description: newDescription });
    await loadMonthData();
  }, [getQueryContext, currentMonthKey, currentMonth.incomes, loadMonthData]);

  const deleteIncome = useCallback(async (id: string) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    const income = currentMonth.incomes.find(i => i.id === id);
    if (!income) return;
    await deleteIncomeDb(ctx, currentMonthKey, id, income.amount);
    await logActivity(ctx, 'income_deleted', 'income', id, { amount: income.amount, description: income.description });
    await loadMonthData();
  }, [getQueryContext, currentMonthKey, currentMonth.incomes, loadMonthData]);

  // Envelope actions
  const createEnvelope = useCallback(async (name: string, icon: string, color: string, category?: EnvelopeCategory): Promise<string | undefined> => {
    const ctx = getQueryContext();
    if (!ctx) return undefined;
    const envelopeId = await createEnvelopeDb(ctx, currentMonthKey, name, icon, color, category);
    await logActivity(ctx, 'envelope_created', 'envelope', envelopeId, { name });
    await loadMonthData();
    return envelopeId;
  }, [getQueryContext, currentMonthKey, loadMonthData]);

  const updateEnvelope = useCallback(async (id: string, updates: Partial<Omit<Envelope, 'id'>>) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    const envelope = currentMonth.envelopes.find(e => e.id === id);
    const { allocated, spent, ...dbUpdates } = updates;
    await updateEnvelopeDb(id, dbUpdates);
    await logActivity(ctx, 'envelope_updated', 'envelope', id, { name: updates.name || envelope?.name });
    await loadMonthData();
  }, [getQueryContext, currentMonth.envelopes, loadMonthData]);

  const deleteEnvelope = useCallback(async (id: string, refundToBudget: boolean = true) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    const envelope = currentMonth.envelopes.find(e => e.id === id);
    try {
      await deleteEnvelopeDb(ctx, currentMonthKey, id, envelope?.allocated || 0, refundToBudget);
      await logActivity(ctx, 'envelope_deleted', 'envelope', id, { name: envelope?.name });
      await loadMonthData();
      toast.success('Enveloppe supprimée');
    } catch (error: any) {
      console.error('Error deleting envelope:', error);
      const msg = error?.message || '';
      if (msg.includes('objectif') || msg.includes('Impossible') || msg.includes('Cannot delete envelope')) {
        // Scénario 10: Erreur depuis le trigger DB si transactions existent
        const friendlyMsg = msg.includes('Cannot delete envelope')
          ? `Impossible de supprimer : cette enveloppe contient des dépenses. Supprimez-les ou transférez-les d'abord.`
          : msg;
        toast.error(friendlyMsg, { duration: 8000 });
      } else {
        toast.error('Erreur lors de la suppression');
      }
    }
  }, [getQueryContext, currentMonthKey, currentMonth.envelopes, loadMonthData]);

  const reorderEnvelopes = useCallback(async (orderedIds: string[]) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    
    // Optimistic update for smooth UX
    setMonths(prev => {
      const current = prev[currentMonthKey];
      if (!current) return prev;
      
      const reordered = orderedIds
        .map(id => current.envelopes.find(e => e.id === id))
        .filter((e): e is Envelope => e !== undefined);
      
      return {
        ...prev,
        [currentMonthKey]: {
          ...current,
          envelopes: reordered,
        },
      };
    });
    
    await reorderEnvelopesDb(ctx, orderedIds);
  }, [getQueryContext, currentMonthKey]);

  const allocateToEnvelope = useCallback(async (envelopeId: string, amount: number) => {
    const ctx = getQueryContext();
    // Use cents comparison to avoid floating point precision issues
    if (!ctx || Math.round(amount * 100) > Math.round(currentMonth.toBeBudgeted * 100)) return;
    const envelope = currentMonth.envelopes.find(e => e.id === envelopeId);
    await allocateToEnvelopeDb(ctx, currentMonthKey, envelopeId, amount);
    await logActivity(ctx, 'allocation_made', 'envelope', envelopeId, { amount, envelope_name: envelope?.name });
    await loadMonthData();
  }, [getQueryContext, currentMonthKey, currentMonth.toBeBudgeted, currentMonth.envelopes, loadMonthData]);

  const allocateInitialBalance = useCallback(async (envelopeId: string, amount: number) => {
    const ctx = getQueryContext();
    if (!ctx || amount <= 0) return;
    const envelope = currentMonth.envelopes.find(e => e.id === envelopeId);
    await allocateInitialBalanceDb(ctx, currentMonthKey, envelopeId, amount);
    await logActivity(ctx, 'allocation_made', 'envelope', envelopeId, { amount, envelope_name: envelope?.name, kind: 'initial_balance' });
    await loadMonthData();
  }, [getQueryContext, currentMonthKey, currentMonth.envelopes, loadMonthData]);

  const deallocateFromEnvelope = useCallback(async (envelopeId: string, amount: number) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    const envelope = currentMonth.envelopes.find(e => e.id === envelopeId);
    if (!envelope) return;

    // Available = net amount remaining in the envelope
    const available = envelope.allocated - envelope.spent;
    const actualAmount = Math.min(amount, available);

    await deallocateFromEnvelopeDb(ctx, currentMonthKey, envelopeId, actualAmount);

    // Log as a negative allocation so savings screens can render it as a withdrawal
    await logActivity(ctx, 'allocation_made', 'envelope', envelopeId, {
      amount: -actualAmount,
      envelope_name: envelope.name,
      kind: 'withdrawal',
    });

    await loadMonthData();
  }, [getQueryContext, currentMonthKey, currentMonth.envelopes, loadMonthData]);

  const transferBetweenEnvelopes = useCallback(async (fromId: string, toId: string, amount: number) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    if (fromId === toId) {
      toast.error('Impossible de transférer vers la même enveloppe');
      return;
    }
    if (amount <= 0) {
      toast.error('Le montant du transfert doit être positif');
      return;
    }
    const fromEnvelope = currentMonth.envelopes.find(e => e.id === fromId);
    const toEnvelope = currentMonth.envelopes.find(e => e.id === toId);
    if (!fromEnvelope) return;
    const available = fromEnvelope.allocated - fromEnvelope.spent;
    if (amount > available) {
      toast.error(`Solde insuffisant : ${available.toFixed(2)}€ disponibles`);
      return;
    }
    await transferBetweenEnvelopesDb(ctx, currentMonthKey, fromId, toId, amount);
    
    // Check if the transfer triggered any savings goal celebration
    if (toEnvelope) {
      try {
        const savingsGoal = await fetchSavingsGoalByEnvelope(ctx, toId);
        if (savingsGoal) {
          const previousAmount = Math.max(0, toEnvelope.allocated - toEnvelope.spent);
          const newAmount = previousAmount + amount;
          const celebration = checkCelebrationThreshold(
            previousAmount,
            newAmount,
            savingsGoal.target_amount,
            savingsGoal.celebration_threshold
          );
          
          if (celebration) {
            toast.success(
              `🎉 Bravo ! ${savingsGoal.name || toEnvelope.name} atteint ${celebration.threshold}% !`,
              { duration: 5000 }
            );
          }
        }
      } catch (err) {
        // Silently ignore celebration check errors
      }
    }
    
    await logActivity(ctx, 'transfer_made', 'envelope', undefined, { 
      amount, 
      from_envelope: fromEnvelope.name, 
      to_envelope: toEnvelope?.name 
    });
    await loadMonthData();
  }, [getQueryContext, currentMonthKey, currentMonth.envelopes, loadMonthData]);

  // Transaction actions
  const addTransaction = useCallback(async (
    envelopeId: string,
    amount: number,
    description: string,
    merchant?: string,
    receiptUrl?: string,
    receiptPath?: string,
    date?: string
  ): Promise<{ transactionId: string; alert?: { envelopeName: string; percent: number; isOver: boolean } }> => {
    const ctx = getQueryContext();
    if (!ctx) throw new Error('Not authenticated');

    const envelope = currentMonth.envelopes.find(e => e.id === envelopeId);
    let alertInfo: { envelopeName: string; percent: number; isOver: boolean } | undefined;
    
    if (envelope && envelope.allocated > 0) {
      const newSpent = envelope.spent + amount;
      const percentUsed = (newSpent / envelope.allocated) * 100;
      const previousPercent = (envelope.spent / envelope.allocated) * 100;
      
      if ((previousPercent < 80 && percentUsed >= 80) || (previousPercent < 100 && percentUsed >= 100)) {
        alertInfo = {
          envelopeName: envelope.name,
          percent: Math.round(percentUsed),
          isOver: percentUsed >= 100,
        };
      }
    }

    const transactionId = await addTransactionDb(
      ctx,
      currentMonthKey,
      envelopeId,
      amount,
      description,
      merchant,
      receiptUrl,
      receiptPath,
      date
    );
    
    await logActivity(ctx, 'expense_added', 'transaction', transactionId, { 
      amount, 
      description, 
      envelope_name: envelope?.name 
    });
    await loadMonthData();
    return { transactionId, alert: alertInfo };
  }, [getQueryContext, currentMonthKey, currentMonth.envelopes, loadMonthData]);

  const updateTransaction = useCallback(async (
    id: string,
    updates: { amount?: number; description?: string; merchant?: string; envelopeId?: string; receiptUrl?: string; receiptPath?: string; notes?: string; date?: string }
  ) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    const transaction = currentMonth.transactions.find(t => t.id === id);
    if (!transaction) return;
    await updateTransactionDb(
      ctx,
      currentMonthKey,
      id,
      transaction.envelopeId,
      transaction.amount,
      updates
    );
    await logActivity(ctx, 'expense_updated', 'transaction', id, { 
      amount: updates.amount || transaction.amount, 
      description: updates.description || transaction.description 
    });
    await loadMonthData();
  }, [getQueryContext, currentMonthKey, currentMonth.transactions, loadMonthData]);

  const deleteTransaction = useCallback(async (id: string) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    const transaction = currentMonth.transactions.find(t => t.id === id);
    if (!transaction) return;
    
    // Use complete deletion (handles splits, receipts, storage cleanup)
    await deleteTransactionCompleteDb(ctx, currentMonthKey, id);
    
    await logActivity(ctx, 'expense_deleted', 'transaction', id, { 
      amount: transaction.amount, 
      description: transaction.description 
    });
    await loadMonthData();
  }, [getQueryContext, currentMonthKey, currentMonth.transactions, loadMonthData]);

  // Start new month
  const startNewMonth = useCallback(async () => {
    const ctx = getQueryContext();
    if (!ctx) return;
    const result = await startNewMonthDb(ctx, currentMonthKey);
    
    // Handle already rolled over
    if (result.alreadyRolledOver) {
      toast.info('Report déjà effectué pour ce mois, navigation directe.');
      setCurrentMonthKey(result.nextMonthKey);
      return;
    }
    
    // Show overdraft warnings
    if (result.overdrafts && result.overdrafts.length > 0) {
      const overdraftList = result.overdrafts
        .map(o => `${o.envelopeName}: -${o.overdraftAmount.toFixed(2)}€`)
        .join('\n');
      
      toast.warning(
        `⚠️ ${result.overdrafts.length} découvert(s) détecté(s)`,
        { 
          description: overdraftList,
          duration: 10000,
        }
      );
    }
    
    // Show savings goal celebrations triggered by rollover
    if (result.celebrations && result.celebrations.length > 0) {
      for (const c of result.celebrations) {
        toast.success(
          `🎉 ${c.goalName || c.envelopeName} atteint ${c.threshold}% grâce au report !`,
          { duration: 5000 }
        );
      }
    }

    // Show pending recurring warning
    if (result.pendingRecurring && result.pendingRecurring.length > 0) {
      const list = result.pendingRecurring
        .map(p => `${p.envelopeName}: ${p.pendingCount} dépense(s), ${p.pendingAmount.toFixed(2)}€`)
        .join('\n');
      toast.warning('⏰ Dépenses récurrentes non encore débitées', {
        description: list,
        duration: 8000,
      });
    }
    
    setCurrentMonthKey(result.nextMonthKey);
  }, [getQueryContext, currentMonthKey]);

  // Copy envelopes to any target month
  const copyEnvelopesToMonth = useCallback(async (targetMonthKey: string, forceOverwrite = false): Promise<{ count: number; total: number; overdrafts?: Array<{ envelopeId: string; envelopeName: string; overdraftAmount: number }>; celebrations?: Array<{ envelopeName: string; goalName: string | null; threshold: number }>; alreadyRolledOver?: boolean; pendingRecurring?: Array<{ envelopeId: string; envelopeName: string; pendingAmount: number; pendingCount: number }> }> => {
    const ctx = getQueryContext();
    if (!ctx) return { count: 0, total: 0 };
    const result = await copyEnvelopesToMonthDb(ctx, currentMonthKey, targetMonthKey, forceOverwrite);
    if (!result.alreadyRolledOver) {
      await loadMonthData(false);
    }
    return result;
  }, [getQueryContext, currentMonthKey, loadMonthData]);

  // Integrity checks
  const checkBudgetIntegrityFn = useCallback(async (monthKey?: string): Promise<IntegrityCheckResult> => {
    const ctx = getQueryContext();
    if (!ctx) throw new Error('No user context');
    return await checkBudgetIntegrity(ctx, monthKey || currentMonthKey);
  }, [getQueryContext, currentMonthKey]);

  const fixBudgetIntegrityFn = useCallback(async (monthKey?: string): Promise<IntegrityCheckResult> => {
    const ctx = getQueryContext();
    if (!ctx) throw new Error('No user context');
    const result = await fixBudgetIntegrity(ctx, monthKey || currentMonthKey);
    if (!result.isValid) {
      await loadMonthData();
      toast.success('Budget corrigé ✓');
    }
    return result;
  }, [getQueryContext, currentMonthKey, loadMonthData]);

  // Legacy reset
  const resetMonth = useCallback(() => {
    console.warn('resetMonth is deprecated');
  }, []);

  // Delete month data
  const deleteMonthData = useCallback(async (monthKey: string) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    await deleteMonthDataDb(ctx, monthKey);
    setMonths(prev => {
      const { [monthKey]: _, ...rest } = prev;
      return rest;
    });
    setAvailableMonths(prev => prev.filter(m => m !== monthKey));
    // If we deleted the current month, stay on current key but reload
    await loadMonthData(true);
  }, [getQueryContext, loadMonthData]);

  // Delete all user data
  const deleteAllUserData = useCallback(async () => {
    const ctx = getQueryContext();
    if (!ctx) return;
    await deleteAllUserDataDb(ctx);
    setMonths({});
    setAvailableMonths([]);
    const currentKey = getCurrentMonthKey();
    setCurrentMonthKey(currentKey);
    await loadMonthData(true);
  }, [getQueryContext, loadMonthData]);

  // Refresh data
  const refreshData = useCallback(async () => {
    await loadMonthData(false);
  }, [loadMonthData]);

  const value: BudgetContextType = {
    loading: initialLoading || householdLoading,
    householdLoading,
    needsHouseholdSetup,
    household,
    households,
    switchHousehold,
    createHousehold,
    joinHousehold,
    leaveHousehold,
    deleteHousehold,
    updateHouseholdName,
    regenerateInviteCode,
    currentMonthKey,
    toBeBudgeted: currentMonth.toBeBudgeted,
    envelopes: currentMonth.envelopes,
    transactions: currentMonth.transactions,
    incomes: currentMonth.incomes,
    months,
    setCurrentMonth,
    getAvailableMonths,
    createNewMonth,
    copyEnvelopesToMonth,
    startNewMonth,
    addIncome,
    updateIncome,
    deleteIncome,
    createEnvelope,
    updateEnvelope,
    deleteEnvelope,
    reorderEnvelopes,
    allocateToEnvelope,
    allocateInitialBalance,
    deallocateFromEnvelope,
    transferBetweenEnvelopes,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    resetMonth,
    deleteMonthData,
    deleteAllUserData,
    checkBudgetIntegrity: checkBudgetIntegrityFn,
    fixBudgetIntegrity: fixBudgetIntegrityFn,
    refreshData,
  };

  return (
    <BudgetContext.Provider value={value}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}
