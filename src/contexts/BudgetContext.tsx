import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  transferToMonthDb,
  allocateToEnvelopeDb,
  deallocateFromEnvelopeDb,
  transferBetweenEnvelopesDb,
  addTransactionDb,
  updateTransactionDb,
  deleteTransactionDb,
  startNewMonthDb,
  deleteMonthDataDb,
  deleteAllUserDataDb,
  QueryContext,
} from '@/lib/budgetDb';
import { logActivity } from '@/lib/activityDb';

// Types
export interface Envelope {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  icon: string;
  color: string;
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
  startNewMonth: () => void;
  
  // Income actions
  addIncome: (amount: number, description: string) => Promise<void>;
  updateIncome: (id: string, amount: number, description: string) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  
  // Envelope actions
  createEnvelope: (name: string, icon: string, color: string) => Promise<void>;
  updateEnvelope: (id: string, updates: Partial<Omit<Envelope, 'id'>>) => Promise<void>;
  deleteEnvelope: (id: string) => Promise<void>;
  reorderEnvelopes: (orderedIds: string[]) => Promise<void>;
  allocateToEnvelope: (envelopeId: string, amount: number) => Promise<void>;
  deallocateFromEnvelope: (envelopeId: string, amount: number) => Promise<void>;
  transferBetweenEnvelopes: (fromId: string, toId: string, amount: number) => Promise<void>;
  transferToMonth: (envelopeId: string, targetMonthKey: string, amount: number) => Promise<void>;
  
  // Transaction actions
  addTransaction: (envelopeId: string, amount: number, description: string, merchant?: string, receiptUrl?: string, receiptPath?: string, date?: string) => Promise<{ transactionId: string; alert?: { envelopeName: string; percent: number; isOver: boolean } }>;
  updateTransaction: (id: string, updates: { amount?: number; description?: string; merchant?: string; envelopeId?: string; receiptUrl?: string; receiptPath?: string; notes?: string; date?: string }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
  // Refresh data
  refreshData: () => Promise<void>;
  
  // Delete data
  deleteMonthData: (monthKey: string) => Promise<void>;
  deleteAllUserData: () => Promise<void>;
  
  // Legacy
  resetMonth: () => void;
}

const BudgetContext = createContext<BudgetContextType | null>(null);

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
  const addIncome = useCallback(async (amount: number, description: string) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    const incomeId = await addIncomeDb(ctx, currentMonthKey, amount, description);
    await logActivity(ctx, 'income_added', 'income', incomeId, { amount, description });
    await loadMonthData();
  }, [getQueryContext, currentMonthKey, loadMonthData]);

  const updateIncome = useCallback(async (id: string, newAmount: number, newDescription: string) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    const income = currentMonth.incomes.find(i => i.id === id);
    if (!income) return;
    await updateIncomeDb(ctx, currentMonthKey, id, newAmount, newDescription, income.amount);
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
  const createEnvelope = useCallback(async (name: string, icon: string, color: string) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    const envelopeId = await createEnvelopeDb(ctx, currentMonthKey, name, icon, color);
    await logActivity(ctx, 'envelope_created', 'envelope', envelopeId, { name });
    await loadMonthData();
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

  const deleteEnvelope = useCallback(async (id: string) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    const envelope = currentMonth.envelopes.find(e => e.id === id);
    await deleteEnvelopeDb(ctx, currentMonthKey, id, envelope?.allocated || 0);
    await logActivity(ctx, 'envelope_deleted', 'envelope', id, { name: envelope?.name });
    await loadMonthData();
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

  const deallocateFromEnvelope = useCallback(async (envelopeId: string, amount: number) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    const envelope = currentMonth.envelopes.find(e => e.id === envelopeId);
    if (!envelope) return;
    const available = envelope.allocated - envelope.spent;
    const actualAmount = Math.min(amount, available);
    await deallocateFromEnvelopeDb(ctx, currentMonthKey, envelopeId, actualAmount);
    await loadMonthData();
  }, [getQueryContext, currentMonthKey, currentMonth.envelopes, loadMonthData]);

  const transferBetweenEnvelopes = useCallback(async (fromId: string, toId: string, amount: number) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    const fromEnvelope = currentMonth.envelopes.find(e => e.id === fromId);
    const toEnvelope = currentMonth.envelopes.find(e => e.id === toId);
    if (!fromEnvelope) return;
    const available = fromEnvelope.allocated - fromEnvelope.spent;
    if (amount > available) return;
    await transferBetweenEnvelopesDb(ctx, currentMonthKey, fromId, toId, amount);
    await logActivity(ctx, 'transfer_made', 'envelope', undefined, { 
      amount, 
      from_envelope: fromEnvelope.name, 
      to_envelope: toEnvelope?.name 
    });
    await loadMonthData();
  }, [getQueryContext, currentMonthKey, currentMonth.envelopes, loadMonthData]);

  const transferToMonth = useCallback(async (envelopeId: string, targetMonthKey: string, amount: number) => {
    const ctx = getQueryContext();
    if (!ctx) return;
    const envelope = currentMonth.envelopes.find(e => e.id === envelopeId);
    if (!envelope) return;
    const available = envelope.allocated - envelope.spent;
    if (amount > available) return;
    await transferToMonthDb(ctx, currentMonthKey, targetMonthKey, envelopeId, amount);
    await logActivity(ctx, 'transfer_made', 'envelope', envelopeId, { 
      amount, 
      envelope_name: envelope.name,
      from_month: currentMonthKey,
      to_month: targetMonthKey 
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
    await deleteTransactionDb(ctx, currentMonthKey, id, transaction.envelopeId, transaction.amount);
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
    const nextMonthKey = await startNewMonthDb(ctx, currentMonthKey);
    setCurrentMonthKey(nextMonthKey);
  }, [getQueryContext, currentMonthKey]);

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
    startNewMonth,
    addIncome,
    updateIncome,
    deleteIncome,
    createEnvelope,
    updateEnvelope,
    deleteEnvelope,
    reorderEnvelopes,
    allocateToEnvelope,
    deallocateFromEnvelope,
    transferBetweenEnvelopes,
    transferToMonth,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    resetMonth,
    deleteMonthData,
    deleteAllUserData,
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
