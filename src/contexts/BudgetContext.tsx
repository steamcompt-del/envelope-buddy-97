import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
  allocateToEnvelopeDb,
  deallocateFromEnvelopeDb,
  transferBetweenEnvelopesDb,
  addTransactionDb,
  updateTransactionDb,
  deleteTransactionDb,
  startNewMonthDb,
} from '@/lib/budgetDb';

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
  merchant?: string;
  receiptUrl?: string;
  receiptPath?: string;
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
  allocateToEnvelope: (envelopeId: string, amount: number) => Promise<void>;
  deallocateFromEnvelope: (envelopeId: string, amount: number) => Promise<void>;
  transferBetweenEnvelopes: (fromId: string, toId: string, amount: number) => Promise<void>;
  
  // Transaction actions
  addTransaction: (envelopeId: string, amount: number, description: string, merchant?: string, receiptUrl?: string, receiptPath?: string) => Promise<{ transactionId: string; alert?: { envelopeName: string; percent: number; isOver: boolean } }>;
  updateTransaction: (id: string, updates: { amount?: number; description?: string; merchant?: string; envelopeId?: string; receiptUrl?: string; receiptPath?: string }) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
  // Refresh data
  refreshData: () => Promise<void>;
  
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
  const [loading, setLoading] = useState(true);
  const [currentMonthKey, setCurrentMonthKey] = useState(getCurrentMonthKey());
  const [months, setMonths] = useState<Record<string, MonthlyBudget>>({});
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // Load data when user or month changes
  const loadMonthData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Ensure current month exists
      await ensureMonthExists(user.id, currentMonthKey);
      
      // Fetch month data
      const monthData = await fetchMonthData(user.id, currentMonthKey);
      
      // Fetch available months
      const available = await fetchAvailableMonths(user.id);
      
      setMonths(prev => ({
        ...prev,
        [currentMonthKey]: monthData,
      }));
      setAvailableMonths(available.length > 0 ? available : [currentMonthKey]);
    } catch (error) {
      console.error('Error loading budget data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, currentMonthKey]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  // Get current month data
  const currentMonth = months[currentMonthKey] || createEmptyMonth(currentMonthKey);

  // Month navigation
  const setCurrentMonth = useCallback((monthKey: string) => {
    setCurrentMonthKey(monthKey);
  }, []);

  const getAvailableMonths = useCallback(() => {
    return availableMonths;
  }, [availableMonths]);

  const createNewMonth = useCallback(async (monthKey: string) => {
    if (!user) return;
    await ensureMonthExists(user.id, monthKey);
    setCurrentMonthKey(monthKey);
  }, [user]);

  // Income actions
  const addIncome = useCallback(async (amount: number, description: string) => {
    if (!user) return;
    await addIncomeDb(user.id, currentMonthKey, amount, description);
    await loadMonthData();
  }, [user, currentMonthKey, loadMonthData]);

  const updateIncome = useCallback(async (id: string, newAmount: number, newDescription: string) => {
    if (!user) return;
    const income = currentMonth.incomes.find(i => i.id === id);
    if (!income) return;
    await updateIncomeDb(user.id, currentMonthKey, id, newAmount, newDescription, income.amount);
    await loadMonthData();
  }, [user, currentMonthKey, currentMonth.incomes, loadMonthData]);

  const deleteIncome = useCallback(async (id: string) => {
    if (!user) return;
    const income = currentMonth.incomes.find(i => i.id === id);
    if (!income) return;
    await deleteIncomeDb(user.id, currentMonthKey, id, income.amount);
    await loadMonthData();
  }, [user, currentMonthKey, currentMonth.incomes, loadMonthData]);

  // Envelope actions
  const createEnvelope = useCallback(async (name: string, icon: string, color: string) => {
    if (!user) return;
    await createEnvelopeDb(user.id, currentMonthKey, name, icon, color);
    await loadMonthData();
  }, [user, currentMonthKey, loadMonthData]);

  const updateEnvelope = useCallback(async (id: string, updates: Partial<Omit<Envelope, 'id'>>) => {
    if (!user) return;
    const { allocated, spent, ...dbUpdates } = updates;
    await updateEnvelopeDb(id, dbUpdates);
    await loadMonthData();
  }, [user, loadMonthData]);

  const deleteEnvelope = useCallback(async (id: string) => {
    if (!user) return;
    const envelope = currentMonth.envelopes.find(e => e.id === id);
    await deleteEnvelopeDb(user.id, currentMonthKey, id, envelope?.allocated || 0);
    await loadMonthData();
  }, [user, currentMonthKey, currentMonth.envelopes, loadMonthData]);

  const allocateToEnvelope = useCallback(async (envelopeId: string, amount: number) => {
    if (!user || amount > currentMonth.toBeBudgeted) return;
    await allocateToEnvelopeDb(user.id, currentMonthKey, envelopeId, amount);
    await loadMonthData();
  }, [user, currentMonthKey, currentMonth.toBeBudgeted, loadMonthData]);

  const deallocateFromEnvelope = useCallback(async (envelopeId: string, amount: number) => {
    if (!user) return;
    const envelope = currentMonth.envelopes.find(e => e.id === envelopeId);
    if (!envelope) return;
    const available = envelope.allocated - envelope.spent;
    const actualAmount = Math.min(amount, available);
    await deallocateFromEnvelopeDb(user.id, currentMonthKey, envelopeId, actualAmount);
    await loadMonthData();
  }, [user, currentMonthKey, currentMonth.envelopes, loadMonthData]);

  const transferBetweenEnvelopes = useCallback(async (fromId: string, toId: string, amount: number) => {
    if (!user) return;
    const fromEnvelope = currentMonth.envelopes.find(e => e.id === fromId);
    if (!fromEnvelope) return;
    const available = fromEnvelope.allocated - fromEnvelope.spent;
    if (amount > available) return;
    await transferBetweenEnvelopesDb(user.id, currentMonthKey, fromId, toId, amount);
    await loadMonthData();
  }, [user, currentMonthKey, currentMonth.envelopes, loadMonthData]);

  // Transaction actions
  const addTransaction = useCallback(async (
    envelopeId: string,
    amount: number,
    description: string,
    merchant?: string,
    receiptUrl?: string,
    receiptPath?: string
  ): Promise<{ transactionId: string; alert?: { envelopeName: string; percent: number; isOver: boolean } }> => {
    if (!user) throw new Error('Not authenticated');

    // Check for budget alert before adding
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
      user.id,
      currentMonthKey,
      envelopeId,
      amount,
      description,
      merchant,
      receiptUrl,
      receiptPath
    );
    
    await loadMonthData();
    return { transactionId, alert: alertInfo };
  }, [user, currentMonthKey, currentMonth.envelopes, loadMonthData]);

  const updateTransaction = useCallback(async (
    id: string,
    updates: { amount?: number; description?: string; merchant?: string; envelopeId?: string; receiptUrl?: string; receiptPath?: string }
  ) => {
    if (!user) return;
    const transaction = currentMonth.transactions.find(t => t.id === id);
    if (!transaction) return;
    await updateTransactionDb(
      user.id,
      currentMonthKey,
      id,
      transaction.envelopeId,
      transaction.amount,
      updates
    );
    await loadMonthData();
  }, [user, currentMonthKey, currentMonth.transactions, loadMonthData]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!user) return;
    const transaction = currentMonth.transactions.find(t => t.id === id);
    if (!transaction) return;
    await deleteTransactionDb(user.id, currentMonthKey, id, transaction.envelopeId, transaction.amount);
    await loadMonthData();
  }, [user, currentMonthKey, currentMonth.transactions, loadMonthData]);

  // Start new month
  const startNewMonth = useCallback(async () => {
    if (!user) return;
    const nextMonthKey = await startNewMonthDb(user.id, currentMonthKey);
    setCurrentMonthKey(nextMonthKey);
  }, [user, currentMonthKey]);

  // Legacy reset
  const resetMonth = useCallback(() => {
    console.warn('resetMonth is deprecated');
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    await loadMonthData();
  }, [loadMonthData]);

  const value: BudgetContextType = {
    loading,
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
    allocateToEnvelope,
    deallocateFromEnvelope,
    transferBetweenEnvelopes,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    resetMonth,
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
