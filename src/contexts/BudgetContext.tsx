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

interface BudgetState {
  toBeBudgeted: number;
  envelopes: Envelope[];
  transactions: Transaction[];
  incomes: Income[];
}

interface BudgetContextType extends BudgetState {
  // Income actions
  addIncome: (amount: number, description: string) => void;
  
  // Envelope actions
  createEnvelope: (name: string, icon: string, color: string) => void;
  updateEnvelope: (id: string, updates: Partial<Omit<Envelope, 'id'>>) => void;
  deleteEnvelope: (id: string) => void;
  allocateToEnvelope: (envelopeId: string, amount: number) => void;
  deallocateFromEnvelope: (envelopeId: string, amount: number) => void;
  transferBetweenEnvelopes: (fromId: string, toId: string, amount: number) => void;
  
  // Transaction actions
  addTransaction: (envelopeId: string, amount: number, description: string, merchant?: string) => void;
  
  // Monthly reset
  resetMonth: () => void;
}

const BudgetContext = createContext<BudgetContextType | null>(null);

const STORAGE_KEY = 'budget-envelope-app-state';

const defaultState: BudgetState = {
  toBeBudgeted: 0,
  envelopes: [],
  transactions: [],
  incomes: [],
};

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
  const [state, setState] = useState<BudgetState>(() => {
    if (typeof window === 'undefined') return defaultState;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading budget state:', error);
    }
    return defaultState;
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving budget state:', error);
    }
  }, [state]);

  const addIncome = useCallback((amount: number, description: string) => {
    const income: Income = {
      id: crypto.randomUUID(),
      amount,
      description,
      date: new Date().toISOString(),
    };
    
    setState(prev => ({
      ...prev,
      toBeBudgeted: prev.toBeBudgeted + amount,
      incomes: [...prev.incomes, income],
    }));
  }, []);

  const createEnvelope = useCallback((name: string, icon: string, color: string) => {
    const envelope: Envelope = {
      id: crypto.randomUUID(),
      name,
      allocated: 0,
      spent: 0,
      icon,
      color,
    };
    
    setState(prev => ({
      ...prev,
      envelopes: [...prev.envelopes, envelope],
    }));
  }, []);

  const updateEnvelope = useCallback((id: string, updates: Partial<Omit<Envelope, 'id'>>) => {
    setState(prev => ({
      ...prev,
      envelopes: prev.envelopes.map(env => 
        env.id === id ? { ...env, ...updates } : env
      ),
    }));
  }, []);

  const deleteEnvelope = useCallback((id: string) => {
    setState(prev => {
      const envelope = prev.envelopes.find(e => e.id === id);
      const refundAmount = envelope ? envelope.allocated - envelope.spent : 0;
      
      return {
        ...prev,
        toBeBudgeted: prev.toBeBudgeted + Math.max(0, refundAmount),
        envelopes: prev.envelopes.filter(e => e.id !== id),
        transactions: prev.transactions.filter(t => t.envelopeId !== id),
      };
    });
  }, []);

  const allocateToEnvelope = useCallback((envelopeId: string, amount: number) => {
    setState(prev => {
      if (amount > prev.toBeBudgeted) return prev;
      
      return {
        ...prev,
        toBeBudgeted: prev.toBeBudgeted - amount,
        envelopes: prev.envelopes.map(env =>
          env.id === envelopeId
            ? { ...env, allocated: env.allocated + amount }
            : env
        ),
      };
    });
  }, []);

  const deallocateFromEnvelope = useCallback((envelopeId: string, amount: number) => {
    setState(prev => {
      const envelope = prev.envelopes.find(e => e.id === envelopeId);
      if (!envelope) return prev;
      
      const available = envelope.allocated - envelope.spent;
      const actualAmount = Math.min(amount, available);
      
      return {
        ...prev,
        toBeBudgeted: prev.toBeBudgeted + actualAmount,
        envelopes: prev.envelopes.map(env =>
          env.id === envelopeId
            ? { ...env, allocated: env.allocated - actualAmount }
            : env
        ),
      };
    });
  }, []);

  const transferBetweenEnvelopes = useCallback((fromId: string, toId: string, amount: number) => {
    setState(prev => {
      const fromEnvelope = prev.envelopes.find(e => e.id === fromId);
      if (!fromEnvelope) return prev;
      
      const available = fromEnvelope.allocated - fromEnvelope.spent;
      if (amount > available) return prev;
      
      return {
        ...prev,
        envelopes: prev.envelopes.map(env => {
          if (env.id === fromId) {
            return { ...env, allocated: env.allocated - amount };
          }
          if (env.id === toId) {
            return { ...env, allocated: env.allocated + amount };
          }
          return env;
        }),
      };
    });
  }, []);

  const addTransaction = useCallback((envelopeId: string, amount: number, description: string, merchant?: string) => {
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      envelopeId,
      amount,
      description,
      date: new Date().toISOString(),
      merchant,
    };
    
    setState(prev => ({
      ...prev,
      transactions: [...prev.transactions, transaction],
      envelopes: prev.envelopes.map(env =>
        env.id === envelopeId
          ? { ...env, spent: env.spent + amount }
          : env
      ),
    }));
  }, []);

  const resetMonth = useCallback(() => {
    setState(prev => ({
      ...prev,
      envelopes: prev.envelopes.map(env => ({
        ...env,
        spent: 0,
      })),
      transactions: [],
    }));
  }, []);

  const value: BudgetContextType = {
    ...state,
    addIncome,
    createEnvelope,
    updateEnvelope,
    deleteEnvelope,
    allocateToEnvelope,
    deallocateFromEnvelope,
    transferBetweenEnvelopes,
    addTransaction,
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
