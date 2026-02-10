import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Transaction } from '@/contexts/BudgetContext';

const STORAGE_KEY = 'expense-filters';

export type ViewMode = 'list' | 'timeline';

export interface ExpenseFilters {
  searchQuery: string;
  envelopeIds: string[];
  amountMin: string;
  amountMax: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  hasReceipt: 'all' | 'yes' | 'no';
  memberIds: string[];
  viewMode: ViewMode;
}

const defaultFilters: ExpenseFilters = {
  searchQuery: '',
  envelopeIds: [],
  amountMin: '',
  amountMax: '',
  dateFrom: undefined,
  dateTo: undefined,
  hasReceipt: 'all',
  memberIds: [],
  viewMode: 'timeline',
};

function loadFilters(): Partial<ExpenseFilters> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      envelopeIds: parsed.envelopeIds || [],
      amountMin: parsed.amountMin || '',
      amountMax: parsed.amountMax || '',
      hasReceipt: parsed.hasReceipt || 'all',
      memberIds: parsed.memberIds || [],
      viewMode: parsed.viewMode || 'timeline',
      dateFrom: parsed.dateFrom ? new Date(parsed.dateFrom) : undefined,
      dateTo: parsed.dateTo ? new Date(parsed.dateTo) : undefined,
    };
  } catch { return {}; }
}

function saveFilters(filters: ExpenseFilters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      envelopeIds: filters.envelopeIds,
      amountMin: filters.amountMin,
      amountMax: filters.amountMax,
      hasReceipt: filters.hasReceipt,
      memberIds: filters.memberIds,
      viewMode: filters.viewMode,
      dateFrom: filters.dateFrom?.toISOString(),
      dateTo: filters.dateTo?.toISOString(),
    }));
  } catch {}
}

export function useExpenseFilters() {
  const saved = useRef(loadFilters());
  const [filters, setFilters] = useState<ExpenseFilters>({
    ...defaultFilters,
    ...saved.current,
  });

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(filters.searchQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const setSearchQuery = useCallback((q: string) => {
    setFilters(f => ({ ...f, searchQuery: q }));
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(q), 300);
  }, []);

  // Persist non-search filters
  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  const updateFilter = useCallback(<K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) => {
    setFilters(f => ({ ...f, [key]: value }));
  }, []);

  const toggleEnvelope = useCallback((id: string) => {
    setFilters(f => ({
      ...f,
      envelopeIds: f.envelopeIds.includes(id)
        ? f.envelopeIds.filter(x => x !== id)
        : [...f.envelopeIds, id],
    }));
  }, []);

  const toggleMember = useCallback((id: string) => {
    setFilters(f => ({
      ...f,
      memberIds: f.memberIds.includes(id)
        ? f.memberIds.filter(x => x !== id)
        : [...f.memberIds, id],
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...defaultFilters });
    setDebouncedSearch('');
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.envelopeIds.length > 0) count++;
    if (filters.amountMin || filters.amountMax) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.hasReceipt !== 'all') count++;
    if (filters.memberIds.length > 0) count++;
    return count;
  }, [filters]);

  return {
    filters,
    debouncedSearch,
    setSearchQuery,
    updateFilter,
    toggleEnvelope,
    toggleMember,
    resetFilters,
    activeFilterCount,
  };
}
