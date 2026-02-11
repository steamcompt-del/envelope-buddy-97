import { useState, useEffect, useMemo } from 'react';
import { getBackendClient } from '@/lib/backendClient';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/hooks/useHousehold';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Plus,
  Minus,
  ArrowRightLeft,
  RefreshCw,
  History,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface HistoryEntry {
  id: string;
  type: 'contribution' | 'auto_contribution' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'expense';
  amount: number;
  date: string;
  description: string;
}

interface SavingsHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelopeId: string;
  envelopeName: string;
}

export function SavingsHistoryDialog({
  open,
  onOpenChange,
  envelopeId,
  envelopeName,
}: SavingsHistoryDialogProps) {
  const { user } = useAuth();
  const { household } = useHousehold();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (!open || !user) return;

    const fetchHistory = async () => {
      setLoading(true);
      const supabase = getBackendClient();
      const results: HistoryEntry[] = [];

      try {
        // 1. Fetch allocation activities from activity_log
        if (household?.id) {
          const { data: activities } = await supabase
            .from('activity_log')
            .select('*')
            .eq('household_id', household.id)
            .eq('entity_id', envelopeId)
            .in('action', ['allocation_made', 'transfer_made'])
            .order('created_at', { ascending: false })
            .limit(100);

          for (const a of activities || []) {
            const details = a.details as Record<string, any> | null;
            const amount = details?.amount ? Number(details.amount) : 0;
            if (amount === 0) continue;

            if (a.action === 'allocation_made') {
              results.push({
                id: a.id,
                type: details?.auto_contribution ? 'auto_contribution' : 'contribution',
                amount,
                date: a.created_at,
                description: details?.auto_contribution
                  ? 'Auto-contribution'
                  : `Allocation manuelle`,
              });
            } else if (a.action === 'transfer_made') {
              const isIncoming = details?.to_envelope_id === envelopeId;
              results.push({
                id: a.id,
                type: isIncoming ? 'transfer_in' : 'transfer_out',
                amount,
                date: a.created_at,
                description: isIncoming
                  ? `Transfert depuis ${details?.from_envelope_name || 'autre enveloppe'}`
                  : `Transfert vers ${details?.to_envelope_name || 'autre enveloppe'}`,
              });
            }
          }
        }

        // 2. Fetch transactions (expenses) for this envelope
        let txQuery = supabase
          .from('transactions')
          .select('id, amount, date, description, merchant')
          .eq('envelope_id', envelopeId)
          .order('date', { ascending: false })
          .limit(50);

        if (household?.id) {
          txQuery = txQuery.eq('household_id', household.id);
        } else {
          txQuery = txQuery.eq('user_id', user.id).is('household_id', null);
        }

        const { data: transactions } = await txQuery;

        for (const tx of transactions || []) {
          results.push({
            id: tx.id,
            type: 'expense',
            amount: Number(tx.amount),
            date: tx.date,
            description: tx.merchant || tx.description,
          });
        }

        // Sort by date descending
        results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEntries(results);
      } catch (error) {
        console.error('Error fetching savings history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [open, user, household?.id, envelopeId]);

  // Group entries by month
  const groupedEntries = useMemo(() => {
    const groups: Record<string, HistoryEntry[]> = {};
    for (const entry of entries) {
      const monthKey = format(parseISO(entry.date), 'yyyy-MM');
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(entry);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [entries]);

  const totalContributions = useMemo(() =>
    entries
      .filter(e => ['contribution', 'auto_contribution', 'transfer_in'].includes(e.type))
      .reduce((sum, e) => sum + e.amount, 0),
    [entries]
  );

  const totalWithdrawals = useMemo(() =>
    entries
      .filter(e => ['expense', 'transfer_out', 'withdrawal'].includes(e.type))
      .reduce((sum, e) => sum + e.amount, 0),
    [entries]
  );

  const getIcon = (type: HistoryEntry['type']) => {
    switch (type) {
      case 'contribution': return <Plus className="w-4 h-4 text-emerald-500" />;
      case 'auto_contribution': return <RefreshCw className="w-4 h-4 text-primary" />;
      case 'transfer_in': return <ArrowRightLeft className="w-4 h-4 text-blue-500" />;
      case 'transfer_out': return <ArrowRightLeft className="w-4 h-4 text-orange-500" />;
      case 'expense': return <Minus className="w-4 h-4 text-red-500" />;
      case 'withdrawal': return <Minus className="w-4 h-4 text-red-500" />;
    }
  };

  const isPositive = (type: HistoryEntry['type']) =>
    ['contribution', 'auto_contribution', 'transfer_in'].includes(type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <History className="w-5 h-5 text-primary" />
            Historique — {envelopeName}
          </DialogTitle>
        </DialogHeader>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-emerald-500/10 border-emerald-500/20 p-3 text-center">
            <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Contributions</p>
            <p className="text-lg font-bold text-emerald-500">+{totalContributions.toFixed(2)}€</p>
          </div>
          <div className="rounded-lg border bg-red-500/10 border-red-500/20 p-3 text-center">
            <TrendingDown className="w-4 h-4 text-red-500 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Retraits</p>
            <p className="text-lg font-bold text-red-500">-{totalWithdrawals.toFixed(2)}€</p>
          </div>
        </div>

        {/* Timeline */}
        <ScrollArea className="flex-1 -mx-2 px-2">
          {loading ? (
            <div className="space-y-3 py-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Aucun historique pour cette enveloppe</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {groupedEntries.map(([monthKey, monthEntries]) => (
                <div key={monthKey}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 sticky top-0 bg-background py-1">
                    {format(parseISO(`${monthKey}-01`), 'MMMM yyyy', { locale: fr })}
                  </p>
                  <div className="space-y-1.5">
                    {monthEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-2.5"
                      >
                        <div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          {getIcon(entry.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{entry.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(entry.date), 'dd MMM yyyy, HH:mm', { locale: fr })}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'text-sm font-semibold tabular-nums whitespace-nowrap',
                            isPositive(entry.type) ? 'text-emerald-500' : 'text-red-500'
                          )}
                        >
                          {isPositive(entry.type) ? '+' : '-'}{entry.amount.toFixed(2)}€
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
