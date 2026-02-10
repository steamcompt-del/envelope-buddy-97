import { useState, useMemo } from 'react';
import { useBudget, Transaction } from '@/contexts/BudgetContext';
import { useTransactionsReceipts } from '@/hooks/useReceipts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ShoppingCart, Utensils, Car, Gamepad2, Heart, ShoppingBag, 
  Receipt, PiggyBank, Home, Plane, Gift, Music, Wifi, Smartphone, 
  Coffee, Wallet, ArrowLeft, Search, ImageIcon, Filter, Loader2
} from 'lucide-react';
import { ComponentType } from 'react';
import { NavLink } from '@/components/NavLink';
import { ReceiptLightbox, ReceiptImage } from '@/components/budget/ReceiptLightbox';
import { HouseholdSwitcher } from '@/components/budget/HouseholdSwitcher';
import { MonthSelector } from '@/components/budget/MonthSelector';
import { EditTransactionSheet } from '@/components/budget/EditTransactionSheet';
import { SplitBadge } from '@/components/budget/SplitBadge';

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  ShoppingCart, Utensils, Car, Gamepad2, Heart, ShoppingBag, 
  Receipt, PiggyBank, Home, Plane, Gift, Music, Wifi, Smartphone, 
  Coffee, Wallet,
};

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] || Wallet;
  return <Icon className={className} />;
}

const colorClasses: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-envelope-blue/15', text: 'text-envelope-blue' },
  green: { bg: 'bg-envelope-green/15', text: 'text-envelope-green' },
  orange: { bg: 'bg-envelope-orange/15', text: 'text-envelope-orange' },
  pink: { bg: 'bg-envelope-pink/15', text: 'text-envelope-pink' },
  purple: { bg: 'bg-envelope-purple/15', text: 'text-envelope-purple' },
  yellow: { bg: 'bg-envelope-yellow/15', text: 'text-envelope-yellow' },
  red: { bg: 'bg-envelope-red/15', text: 'text-envelope-red' },
  teal: { bg: 'bg-envelope-teal/15', text: 'text-envelope-teal' },
};

interface TransactionWithEnvelope extends Transaction {
  envelope?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  isWithdrawal?: boolean; // True if this is a savings withdrawal
}

export default function Expenses() {
  const { envelopes, transactions, loading } = useBudget();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEnvelopeId, setFilterEnvelopeId] = useState<string>('all');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<ReceiptImage[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  
  // Get all transaction IDs for receipts
  const transactionIds = useMemo(() => transactions.map(t => t.id), [transactions]);
  const { getReceiptsForTransaction } = useTransactionsReceipts(transactionIds);

  // Enrich transactions with envelope info
  const enrichedTransactions: TransactionWithEnvelope[] = useMemo(() => {
    const envelopeMap = new Map(envelopes.map(e => [e.id, e]));
    return transactions.map(t => {
      const envelope = envelopeMap.get(t.envelopeId);
      return {
        ...t,
        envelope,
        isWithdrawal: envelope?.icon === 'PiggyBank',
      };
    });
  }, [transactions, envelopes]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let result = [...enrichedTransactions];
    
    // Filter by envelope
    if (filterEnvelopeId && filterEnvelopeId !== 'all') {
      result = result.filter(t => t.envelopeId === filterEnvelopeId);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.description.toLowerCase().includes(query) ||
        (t.merchant && t.merchant.toLowerCase().includes(query)) ||
        (t.notes && t.notes.toLowerCase().includes(query))
      );
    }
    
    // Sort by date descending
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return result;
  }, [enrichedTransactions, filterEnvelopeId, searchQuery]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, TransactionWithEnvelope[]>();
    
    for (const t of filteredTransactions) {
      const dateKey = format(new Date(t.date), 'yyyy-MM-dd');
      const existing = groups.get(dateKey) || [];
      existing.push(t);
      groups.set(dateKey, existing);
    }
    
    return Array.from(groups.entries()).map(([dateKey, items]) => ({
      dateKey,
      date: new Date(dateKey),
      transactions: items,
      total: items.reduce((sum, t) => sum + t.amount, 0),
    }));
  }, [filteredTransactions]);

  // Calculate total
  const totalAmount = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const handleOpenLightbox = (transaction: TransactionWithEnvelope) => {
    const receipts = getReceiptsForTransaction(transaction.id);
    if (receipts.length === 0 && !transaction.receiptUrl) return;
    
    const images: ReceiptImage[] = receipts.length > 0 
      ? receipts.map(r => ({ id: r.id, url: r.url, fileName: r.fileName }))
      : transaction.receiptUrl 
        ? [{ id: 'legacy', url: transaction.receiptUrl }]
        : [];
    
    if (images.length > 0) {
      setLightboxImages(images);
      setLightboxIndex(0);
      setLightboxOpen(true);
    }
  };
  
  const handleOpenEditSheet = (transaction: TransactionWithEnvelope) => {
    setEditingTransaction(transaction);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b">
        <div className="container py-3 sm:py-4">
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <NavLink to="/">
                <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </NavLink>
              <HouseholdSwitcher />
            </div>
            <MonthSelector />
          </div>
          
          {/* Title and total */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Dépenses</h1>
              <p className="text-sm text-muted-foreground">
                {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
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
      
      {/* Filters */}
      <div className="container py-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
          <Select value={filterEnvelopeId} onValueChange={setFilterEnvelopeId}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Enveloppe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {envelopes.map((env) => (
                <SelectItem key={env.id} value={env.id}>
                  <div className="flex items-center gap-2">
                    <DynamicIcon name={env.icon} className="h-4 w-4" />
                    <span>{env.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Transaction list */}
      <main className="container pb-6">
        {groupedTransactions.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || filterEnvelopeId !== 'all' 
                ? 'Aucune dépense trouvée' 
                : 'Aucune dépense ce mois-ci'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedTransactions.map((group) => (
              <div key={group.dateKey}>
                {/* Date header */}
                <div className="flex items-center justify-between py-2 sticky top-[120px] bg-background/95 backdrop-blur-sm z-10">
                  <p className="text-sm font-medium text-muted-foreground">
                    {format(group.date, 'EEEE d MMMM', { locale: fr })}
                  </p>
                  <p className="text-sm font-medium text-destructive">
                    -{group.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
                
                {/* Transactions for this date */}
                <div className="space-y-2">
                  {group.transactions.map((t) => {
                    const colorStyle = t.envelope 
                      ? colorClasses[t.envelope.color] || colorClasses.blue 
                      : colorClasses.blue;
                    const receipts = getReceiptsForTransaction(t.id);
                    const hasReceipts = receipts.length > 0 || !!t.receiptUrl;
                    const isWithdrawal = t.isWithdrawal;
                    
                    return (
                      <button 
                        key={t.id}
                        onClick={() => handleOpenEditSheet(t)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-muted/50 text-left",
                          isWithdrawal ? "bg-primary/5 border-primary/20" : "bg-card"
                        )}
                      >
                        {/* Envelope icon */}
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                          colorStyle.bg
                        )}>
                          <DynamicIcon 
                            name={t.envelope?.icon || 'Wallet'} 
                            className={cn("w-5 h-5", colorStyle.text)} 
                          />
                        </div>
                        
                        {/* Transaction info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">
                              {t.merchant || t.description}
                            </p>
                            {t.isSplit && (
                              <SplitBadge
                                transactionId={t.id}
                                totalAmount={t.amount}
                                compact
                              />
                            )}
                            {isWithdrawal && !t.isSplit && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/15 text-primary flex-shrink-0">
                                Retrait
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{t.envelope?.name || 'Sans catégorie'}</span>
                            {t.merchant && t.description && t.merchant !== t.description && (
                              <>
                                <span>•</span>
                                <span className="truncate">{t.description}</span>
                              </>
                            )}
                          </div>
                          {t.notes && (
                            <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                              {t.notes}
                            </p>
                          )}
                        </div>
                        
                        {/* Receipt indicator */}
                        {hasReceipts && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLightbox(t);
                            }}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                          >
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        
                        {/* Amount */}
                         <p className={cn(
                           "font-semibold flex-shrink-0",
                           isWithdrawal ? "text-destructive" : "text-destructive"
                         )}>
                           {isWithdrawal ? '' : '-'}{t.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      {/* Receipt lightbox */}
      <ReceiptLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
      
      {/* Edit transaction sheet */}
      <EditTransactionSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        transaction={editingTransaction}
      />
    </div>
  );
}
