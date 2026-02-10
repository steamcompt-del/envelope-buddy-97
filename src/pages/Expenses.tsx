import { useState, useMemo, useCallback } from 'react';
import { useBudget, Transaction } from '@/contexts/BudgetContext';
import { useTransactionsReceipts } from '@/hooks/useReceipts';
import { useExpenseFilters } from '@/hooks/useExpenseFilters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, Search, Loader2, Receipt, List, Clock, CheckSquare } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { ReceiptLightbox, ReceiptImage } from '@/components/budget/ReceiptLightbox';
import { HouseholdSwitcher } from '@/components/budget/HouseholdSwitcher';
import { MonthSelector } from '@/components/budget/MonthSelector';
import { EditTransactionSheet } from '@/components/budget/EditTransactionSheet';
import { ExpenseFiltersBar } from '@/components/expenses/ExpenseFiltersBar';
import { BulkActionsBar } from '@/components/expenses/BulkActionsBar';
import { TransactionRow, TransactionWithEnvelope } from '@/components/expenses/TransactionRow';

export default function Expenses() {
  const { envelopes, transactions, loading } = useBudget();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<ReceiptImage[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const {
    filters, debouncedSearch, setSearchQuery,
    updateFilter, toggleEnvelope, toggleMember, resetFilters, activeFilterCount,
  } = useExpenseFilters();

  const transactionIds = useMemo(() => transactions.map(t => t.id), [transactions]);
  const { getReceiptsForTransaction } = useTransactionsReceipts(transactionIds);

  // Enrich
  const enrichedTransactions: TransactionWithEnvelope[] = useMemo(() => {
    const map = new Map(envelopes.map(e => [e.id, e]));
    return transactions.map(t => {
      const envelope = map.get(t.envelopeId);
      return { ...t, envelope, isWithdrawal: envelope?.icon === 'PiggyBank' };
    });
  }, [transactions, envelopes]);

  // Filter
  const filteredTransactions = useMemo(() => {
    let result = [...enrichedTransactions];

    // Envelopes
    if (filters.envelopeIds.length > 0) {
      result = result.filter(t => filters.envelopeIds.includes(t.envelopeId));
    }

    // Search (debounced)
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(t =>
        t.description.toLowerCase().includes(q) ||
        (t.merchant && t.merchant.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        t.amount.toString().includes(q)
      );
    }

    // Amount range
    const minAmt = parseFloat(filters.amountMin);
    const maxAmt = parseFloat(filters.amountMax);
    if (!isNaN(minAmt)) result = result.filter(t => t.amount >= minAmt);
    if (!isNaN(maxAmt)) result = result.filter(t => t.amount <= maxAmt);

    // Date range
    if (filters.dateFrom) {
      const from = filters.dateFrom.getTime();
      result = result.filter(t => new Date(t.date).getTime() >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(t => new Date(t.date).getTime() <= to.getTime());
    }

    // Receipt
    if (filters.hasReceipt === 'yes') {
      result = result.filter(t => getReceiptsForTransaction(t.id).length > 0 || !!t.receiptUrl);
    } else if (filters.hasReceipt === 'no') {
      result = result.filter(t => getReceiptsForTransaction(t.id).length === 0 && !t.receiptUrl);
    }

    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return result;
  }, [enrichedTransactions, filters.envelopeIds, debouncedSearch, filters.amountMin, filters.amountMax, filters.dateFrom, filters.dateTo, filters.hasReceipt, getReceiptsForTransaction]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, TransactionWithEnvelope[]>();
    for (const t of filteredTransactions) {
      const key = format(new Date(t.date), 'yyyy-MM-dd');
      const arr = groups.get(key) || [];
      arr.push(t);
      groups.set(key, arr);
    }
    return Array.from(groups.entries()).map(([dateKey, items]) => ({
      dateKey,
      date: new Date(dateKey),
      transactions: items,
      total: items.reduce((sum, t) => sum + t.amount, 0),
    }));
  }, [filteredTransactions]);

  const totalAmount = useMemo(() => filteredTransactions.reduce((sum, t) => sum + t.amount, 0), [filteredTransactions]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleOpenLightbox = (t: TransactionWithEnvelope) => {
    const receipts = getReceiptsForTransaction(t.id);
    const images: ReceiptImage[] = receipts.length > 0
      ? receipts.map(r => ({ id: r.id, url: r.url, fileName: r.fileName }))
      : t.receiptUrl ? [{ id: 'legacy', url: t.receiptUrl }] : [];
    if (images.length > 0) {
      setLightboxImages(images);
      setLightboxIndex(0);
      setLightboxOpen(true);
    }
  };

  const handleOpenEditSheet = (t: TransactionWithEnvelope) => {
    setEditingTransaction(t);
    setEditSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  const isTimeline = filters.viewMode === 'timeline';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b">
        <div className="container py-3 sm:py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <NavLink to="/"><Button variant="ghost" size="icon" className="rounded-xl h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button></NavLink>
              <HouseholdSwitcher />
            </div>
            <MonthSelector />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Dépenses</h1>
              <p className="text-sm text-muted-foreground">
                {filteredTransactions.length} dépense{filteredTransactions.length !== 1 ? 's' : ''} trouvée{filteredTransactions.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl sm:text-2xl font-bold text-destructive">
                -{totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Search + controls */}
      <div className="container py-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="🔍 Rechercher par commerçant, montant, note..."
              value={filters.searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
        </div>

        {/* View toggle + bulk mode */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-xl p-0.5 flex-shrink-0">
            <button
              onClick={() => updateFilter('viewMode', 'list')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                !isTimeline ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              <List className="h-3.5 w-3.5" />
              Liste
            </button>
            <button
              onClick={() => updateFilter('viewMode', 'timeline')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                isTimeline ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              Timeline
            </button>
          </div>

          <Button
            variant={bulkMode ? "default" : "outline"}
            size="sm"
            className="rounded-xl gap-1.5 text-xs ml-auto"
            onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Actions groupées
          </Button>
        </div>

        {/* Collapsible filters */}
        <ExpenseFiltersBar
          filters={filters}
          activeFilterCount={activeFilterCount}
          onToggleEnvelope={toggleEnvelope}
          onUpdateFilter={updateFilter}
          onReset={resetFilters}
          onToggleMember={toggleMember}
        />
      </div>

      {/* Transaction list */}
      <main className="container pb-24">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {debouncedSearch || activeFilterCount > 0 ? 'Aucune dépense trouvée' : 'Aucune dépense ce mois-ci'}
            </p>
          </div>
        ) : isTimeline ? (
          /* Timeline view */
          <div className="space-y-4">
            {groupedTransactions.map(group => (
              <div key={group.dateKey} className="animate-fade-in">
                <div className="flex items-center justify-between py-2 sticky top-[140px] bg-background/95 backdrop-blur-sm z-10">
                  <p className="text-sm font-medium text-muted-foreground">
                    {format(group.date, 'EEEE d MMMM', { locale: fr })}
                  </p>
                  <p className="text-sm font-medium text-destructive">
                    -{group.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
                <div className="space-y-2">
                  {group.transactions.map(t => {
                    const receipts = getReceiptsForTransaction(t.id);
                    return (
                      <TransactionRow
                        key={t.id}
                        transaction={t}
                        hasReceipts={receipts.length > 0 || !!t.receiptUrl}
                        bulkMode={bulkMode}
                        selected={selectedIds.has(t.id)}
                        onSelect={handleToggleSelect}
                        onEdit={handleOpenEditSheet}
                        onOpenReceipt={handleOpenLightbox}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List view (flat) */
          <div className="space-y-2">
            {filteredTransactions.map(t => {
              const receipts = getReceiptsForTransaction(t.id);
              return (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  hasReceipts={receipts.length > 0 || !!t.receiptUrl}
                  bulkMode={bulkMode}
                  selected={selectedIds.has(t.id)}
                  onSelect={handleToggleSelect}
                  onEdit={handleOpenEditSheet}
                  onOpenReceipt={handleOpenLightbox}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Bulk actions */}
      <BulkActionsBar
        selectedIds={selectedIds}
        onClear={() => { setSelectedIds(new Set()); setBulkMode(false); }}
        onDeselectAll={() => setSelectedIds(new Set())}
      />

      <ReceiptLightbox images={lightboxImages} initialIndex={lightboxIndex} open={lightboxOpen} onOpenChange={setLightboxOpen} />
      <EditTransactionSheet open={editSheetOpen} onOpenChange={setEditSheetOpen} transaction={editingTransaction} />
    </div>
  );
}
