import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

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
}

export interface Income {
  id: string;
  amount: number;
  description: string;
  date: string;
}

// Allocation template for monthly planning
export interface AllocationTemplate {
  envelopeId: string;
  amount: number;
}

// Monthly budget data
export interface MonthlyBudget {
  monthKey: string; // Format: "YYYY-MM"
  toBeBudgeted: number;
  envelopes: Envelope[];
  transactions: Transaction[];
  incomes: Income[];
}

interface BudgetState {
  currentMonthKey: string;
  months: Record<string, MonthlyBudget>;
  envelopeTemplates: Array<{ id: string; name: string; icon: string; color: string }>;
  allocationTemplates: AllocationTemplate[];
}

interface BudgetContextType {
  // Current month data (convenience getters)
  currentMonthKey: string;
  toBeBudgeted: number;
  envelopes: Envelope[];
  transactions: Transaction[];
  incomes: Income[];
  
  // All months
  months: Record<string, MonthlyBudget>;
  allocationTemplates: AllocationTemplate[];
  
  // Month navigation
  setCurrentMonth: (monthKey: string) => void;
  getAvailableMonths: () => string[];
  createNewMonth: (monthKey: string) => void;
  
  // Income actions
  addIncome: (amount: number, description: string) => void;
  updateIncome: (id: string, amount: number, description: string) => void;
  deleteIncome: (id: string) => void;
  
  // Envelope actions
  createEnvelope: (name: string, icon: string, color: string) => void;
  updateEnvelope: (id: string, updates: Partial<Omit<Envelope, 'id'>>) => void;
  deleteEnvelope: (id: string) => void;
  allocateToEnvelope: (envelopeId: string, amount: number) => void;
  deallocateFromEnvelope: (envelopeId: string, amount: number) => void;
  transferBetweenEnvelopes: (fromId: string, toId: string, amount: number) => void;
  
  // Transaction actions
  addTransaction: (envelopeId: string, amount: number, description: string, merchant?: string) => void;
  updateTransaction: (id: string, updates: { amount?: number; description?: string; merchant?: string; envelopeId?: string }) => void;
  deleteTransaction: (id: string) => void;
  
  // Template actions
  saveAllocationTemplate: (templates: AllocationTemplate[]) => void;
  applyAllocationTemplate: () => void;
  
  // Monthly reset (deprecated, kept for compatibility)
  resetMonth: () => void;
}

const BudgetContext = createContext<BudgetContextType | null>(null);

const STORAGE_KEY = 'budget-envelope-app-state-v2';
const LEGACY_STORAGE_KEY = 'budget-envelope-app-state';

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function createEmptyMonth(monthKey: string, envelopeTemplates: Array<{ id: string; name: string; icon: string; color: string }>): MonthlyBudget {
  return {
    monthKey,
    toBeBudgeted: 0,
    envelopes: envelopeTemplates.map(t => ({
      id: t.id,
      name: t.name,
      icon: t.icon,
      color: t.color,
      allocated: 0,
      spent: 0,
    })),
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

function getDefaultState(): BudgetState {
  const currentMonthKey = getCurrentMonthKey();
  return {
    currentMonthKey,
    months: {
      [currentMonthKey]: {
        monthKey: currentMonthKey,
        toBeBudgeted: 0,
        envelopes: [],
        transactions: [],
        incomes: [],
      },
    },
    envelopeTemplates: [],
    allocationTemplates: [],
  };
}

// Migration from legacy storage
function migrateLegacyState(legacyState: {
  toBeBudgeted: number;
  envelopes: Envelope[];
  transactions: Transaction[];
  incomes: Income[];
}): BudgetState {
  const currentMonthKey = getCurrentMonthKey();
  
  // Create envelope templates from existing envelopes
  const envelopeTemplates = legacyState.envelopes.map(env => ({
    id: env.id,
    name: env.name,
    icon: env.icon,
    color: env.color,
  }));
  
  return {
    currentMonthKey,
    months: {
      [currentMonthKey]: {
        monthKey: currentMonthKey,
        toBeBudgeted: legacyState.toBeBudgeted,
        envelopes: legacyState.envelopes,
        transactions: legacyState.transactions,
        incomes: legacyState.incomes,
      },
    },
    envelopeTemplates,
    allocationTemplates: [],
  };
}

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BudgetState>(() => {
    if (typeof window === 'undefined') return getDefaultState();
    
    try {
      // Try new storage format first
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Try to migrate from legacy format
      const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyStored) {
        const legacyState = JSON.parse(legacyStored);
        const migratedState = migrateLegacyState(legacyState);
        // Clear legacy storage after migration
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return migratedState;
      }
    } catch (error) {
      console.error('Error loading budget state:', error);
    }
    return getDefaultState();
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving budget state:', error);
    }
  }, [state]);

  // Get current month data
  const currentMonth = state.months[state.currentMonthKey] || createEmptyMonth(state.currentMonthKey, state.envelopeTemplates);

  // Month navigation
  const setCurrentMonth = useCallback((monthKey: string) => {
    setState(prev => {
      // If month doesn't exist, create it
      if (!prev.months[monthKey]) {
        const newMonth = createEmptyMonth(monthKey, prev.envelopeTemplates);
        return {
          ...prev,
          currentMonthKey: monthKey,
          months: {
            ...prev.months,
            [monthKey]: newMonth,
          },
        };
      }
      return {
        ...prev,
        currentMonthKey: monthKey,
      };
    });
  }, []);

  const getAvailableMonths = useCallback(() => {
    return Object.keys(state.months).sort().reverse();
  }, [state.months]);

  const createNewMonth = useCallback((monthKey: string) => {
    setState(prev => {
      if (prev.months[monthKey]) return prev;
      
      const newMonth = createEmptyMonth(monthKey, prev.envelopeTemplates);
      return {
        ...prev,
        currentMonthKey: monthKey,
        months: {
          ...prev.months,
          [monthKey]: newMonth,
        },
      };
    });
  }, []);

  // Income actions (scoped to current month)
  const addIncome = useCallback((amount: number, description: string) => {
    const income: Income = {
      id: crypto.randomUUID(),
      amount,
      description,
      date: new Date().toISOString(),
    };
    
    setState(prev => {
      const month = prev.months[prev.currentMonthKey];
      if (!month) return prev;
      
      return {
        ...prev,
        months: {
          ...prev.months,
          [prev.currentMonthKey]: {
            ...month,
            toBeBudgeted: month.toBeBudgeted + amount,
            incomes: [...month.incomes, income],
          },
        },
      };
    });
  }, []);

  const updateIncome = useCallback((id: string, newAmount: number, newDescription: string) => {
    setState(prev => {
      const month = prev.months[prev.currentMonthKey];
      if (!month) return prev;
      
      const existingIncome = month.incomes.find(inc => inc.id === id);
      if (!existingIncome) return prev;
      
      const amountDiff = newAmount - existingIncome.amount;
      
      return {
        ...prev,
        months: {
          ...prev.months,
          [prev.currentMonthKey]: {
            ...month,
            toBeBudgeted: month.toBeBudgeted + amountDiff,
            incomes: month.incomes.map(inc =>
              inc.id === id
                ? { ...inc, amount: newAmount, description: newDescription }
                : inc
            ),
          },
        },
      };
    });
  }, []);

  const deleteIncome = useCallback((id: string) => {
    setState(prev => {
      const month = prev.months[prev.currentMonthKey];
      if (!month) return prev;
      
      const income = month.incomes.find(inc => inc.id === id);
      if (!income) return prev;
      
      return {
        ...prev,
        months: {
          ...prev.months,
          [prev.currentMonthKey]: {
            ...month,
            toBeBudgeted: month.toBeBudgeted - income.amount,
            incomes: month.incomes.filter(inc => inc.id !== id),
          },
        },
      };
    });
  }, []);

  // Envelope actions (scoped to current month + template sync)
  const createEnvelope = useCallback((name: string, icon: string, color: string) => {
    const envelopeId = crypto.randomUUID();
    const envelope: Envelope = {
      id: envelopeId,
      name,
      allocated: 0,
      spent: 0,
      icon,
      color,
    };
    
    setState(prev => {
      const month = prev.months[prev.currentMonthKey];
      if (!month) return prev;
      
      // Add to templates for future months
      const newTemplate = { id: envelopeId, name, icon, color };
      
      return {
        ...prev,
        envelopeTemplates: [...prev.envelopeTemplates, newTemplate],
        months: {
          ...prev.months,
          [prev.currentMonthKey]: {
            ...month,
            envelopes: [...month.envelopes, envelope],
          },
        },
      };
    });
  }, []);

  const updateEnvelope = useCallback((id: string, updates: Partial<Omit<Envelope, 'id'>>) => {
    setState(prev => {
      const month = prev.months[prev.currentMonthKey];
      if (!month) return prev;
      
      // Update template too
      const updatedTemplates = prev.envelopeTemplates.map(t =>
        t.id === id ? { ...t, ...updates } : t
      );
      
      return {
        ...prev,
        envelopeTemplates: updatedTemplates,
        months: {
          ...prev.months,
          [prev.currentMonthKey]: {
            ...month,
            envelopes: month.envelopes.map(env =>
              env.id === id ? { ...env, ...updates } : env
            ),
          },
        },
      };
    });
  }, []);

  const deleteEnvelope = useCallback((id: string) => {
    setState(prev => {
      const month = prev.months[prev.currentMonthKey];
      if (!month) return prev;
      
      const envelope = month.envelopes.find(e => e.id === id);
      const refundAmount = envelope ? envelope.allocated - envelope.spent : 0;
      
      return {
        ...prev,
        envelopeTemplates: prev.envelopeTemplates.filter(t => t.id !== id),
        allocationTemplates: prev.allocationTemplates.filter(t => t.envelopeId !== id),
        months: {
          ...prev.months,
          [prev.currentMonthKey]: {
            ...month,
            toBeBudgeted: month.toBeBudgeted + Math.max(0, refundAmount),
            envelopes: month.envelopes.filter(e => e.id !== id),
            transactions: month.transactions.filter(t => t.envelopeId !== id),
          },
        },
      };
    });
  }, []);

  const allocateToEnvelope = useCallback((envelopeId: string, amount: number) => {
    setState(prev => {
      const month = prev.months[prev.currentMonthKey];
      if (!month || amount > month.toBeBudgeted) return prev;
      
      return {
        ...prev,
        months: {
          ...prev.months,
          [prev.currentMonthKey]: {
            ...month,
            toBeBudgeted: month.toBeBudgeted - amount,
            envelopes: month.envelopes.map(env =>
              env.id === envelopeId
                ? { ...env, allocated: env.allocated + amount }
                : env
            ),
          },
        },
      };
    });
  }, []);

  const deallocateFromEnvelope = useCallback((envelopeId: string, amount: number) => {
    setState(prev => {
      const month = prev.months[prev.currentMonthKey];
      if (!month) return prev;
      
      const envelope = month.envelopes.find(e => e.id === envelopeId);
      if (!envelope) return prev;
      
      const available = envelope.allocated - envelope.spent;
      const actualAmount = Math.min(amount, available);
      
      return {
        ...prev,
        months: {
          ...prev.months,
          [prev.currentMonthKey]: {
            ...month,
            toBeBudgeted: month.toBeBudgeted + actualAmount,
            envelopes: month.envelopes.map(env =>
              env.id === envelopeId
                ? { ...env, allocated: env.allocated - actualAmount }
                : env
            ),
          },
        },
      };
    });
  }, []);

  const transferBetweenEnvelopes = useCallback((fromId: string, toId: string, amount: number) => {
    setState(prev => {
      const month = prev.months[prev.currentMonthKey];
      if (!month) return prev;
      
      const fromEnvelope = month.envelopes.find(e => e.id === fromId);
      if (!fromEnvelope) return prev;
      
      const available = fromEnvelope.allocated - fromEnvelope.spent;
      if (amount > available) return prev;
      
      return {
        ...prev,
        months: {
          ...prev.months,
          [prev.currentMonthKey]: {
            ...month,
            envelopes: month.envelopes.map(env => {
              if (env.id === fromId) {
                return { ...env, allocated: env.allocated - amount };
              }
              if (env.id === toId) {
                return { ...env, allocated: env.allocated + amount };
              }
              return env;
            }),
          },
        },
      };
    });
  }, []);

  // Transaction actions
  const addTransaction = useCallback((envelopeId: string, amount: number, description: string, merchant?: string) => {
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      envelopeId,
      amount,
      description,
      date: new Date().toISOString(),
      merchant,
    };
    
    setState(prev => {
      const month = prev.months[prev.currentMonthKey];
      if (!month) return prev;
      
      return {
        ...prev,
        months: {
          ...prev.months,
          [prev.currentMonthKey]: {
            ...month,
            transactions: [...month.transactions, transaction],
            envelopes: month.envelopes.map(env =>
              env.id === envelopeId
                ? { ...env, spent: env.spent + amount }
                : env
            ),
          },
        },
      };
    });
  }, []);

  const updateTransaction = useCallback((id: string, updates: { amount?: number; description?: string; merchant?: string; envelopeId?: string }) => {
    setState(prev => {
      const month = prev.months[prev.currentMonthKey];
      if (!month) return prev;
      
      const existingTransaction = month.transactions.find(t => t.id === id);
      if (!existingTransaction) return prev;
      
      const oldAmount = existingTransaction.amount;
      const newAmount = updates.amount ?? oldAmount;
      const oldEnvelopeId = existingTransaction.envelopeId;
      const newEnvelopeId = updates.envelopeId ?? oldEnvelopeId;
      
      return {
        ...prev,
        months: {
          ...prev.months,
          [prev.currentMonthKey]: {
            ...month,
            transactions: month.transactions.map(t =>
              t.id === id ? { ...t, ...updates } : t
            ),
            envelopes: month.envelopes.map(env => {
              if (oldEnvelopeId === newEnvelopeId && env.id === oldEnvelopeId) {
                return { ...env, spent: env.spent - oldAmount + newAmount };
              }
              if (env.id === oldEnvelopeId) {
                return { ...env, spent: env.spent - oldAmount };
              }
              if (env.id === newEnvelopeId) {
                return { ...env, spent: env.spent + newAmount };
              }
              return env;
            }),
          },
        },
      };
    });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setState(prev => {
      const month = prev.months[prev.currentMonthKey];
      if (!month) return prev;
      
      const transaction = month.transactions.find(t => t.id === id);
      if (!transaction) return prev;
      
      return {
        ...prev,
        months: {
          ...prev.months,
          [prev.currentMonthKey]: {
            ...month,
            transactions: month.transactions.filter(t => t.id !== id),
            envelopes: month.envelopes.map(env =>
              env.id === transaction.envelopeId
                ? { ...env, spent: env.spent - transaction.amount }
                : env
            ),
          },
        },
      };
    });
  }, []);

  // Template actions
  const saveAllocationTemplate = useCallback((templates: AllocationTemplate[]) => {
    setState(prev => ({
      ...prev,
      allocationTemplates: templates,
    }));
  }, []);

  const applyAllocationTemplate = useCallback(() => {
    setState(prev => {
      const month = prev.months[prev.currentMonthKey];
      if (!month) return prev;
      
      let remainingBudget = month.toBeBudgeted;
      const updatedEnvelopes = month.envelopes.map(env => {
        const template = prev.allocationTemplates.find(t => t.envelopeId === env.id);
        if (template && template.amount > 0) {
          const allocateAmount = Math.min(template.amount, remainingBudget);
          remainingBudget -= allocateAmount;
          return { ...env, allocated: env.allocated + allocateAmount };
        }
        return env;
      });
      
      return {
        ...prev,
        months: {
          ...prev.months,
          [prev.currentMonthKey]: {
            ...month,
            toBeBudgeted: remainingBudget,
            envelopes: updatedEnvelopes,
          },
        },
      };
    });
  }, []);

  // Legacy reset (kept for compatibility)
  const resetMonth = useCallback(() => {
    setState(prev => {
      const month = prev.months[prev.currentMonthKey];
      if (!month) return prev;
      
      return {
        ...prev,
        months: {
          ...prev.months,
          [prev.currentMonthKey]: {
            ...month,
            envelopes: month.envelopes.map(env => ({
              ...env,
              allocated: 0,
              spent: 0,
            })),
            transactions: [],
          },
        },
      };
    });
  }, []);

  const value: BudgetContextType = {
    // Current month convenience
    currentMonthKey: state.currentMonthKey,
    toBeBudgeted: currentMonth.toBeBudgeted,
    envelopes: currentMonth.envelopes,
    transactions: currentMonth.transactions,
    incomes: currentMonth.incomes,
    
    // All data
    months: state.months,
    allocationTemplates: state.allocationTemplates,
    
    // Month navigation
    setCurrentMonth,
    getAvailableMonths,
    createNewMonth,
    
    // Actions
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
    saveAllocationTemplate,
    applyAllocationTemplate,
    resetMonth,
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
