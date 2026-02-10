import { useState, useMemo } from 'react';
import { useBudget, Envelope } from '@/contexts/BudgetContext';
import { TransactionSplit, fetchSplitsForTransaction } from '@/lib/transactionSplitsDb';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Split } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SplitBadgeProps {
  transactionId: string;
  totalAmount: number;
  /** If provided, shows the partial amount for this envelope */
  currentEnvelopeId?: string;
  compact?: boolean;
}

const fmt = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export function SplitBadge({ transactionId, totalAmount, currentEnvelopeId, compact }: SplitBadgeProps) {
  const { envelopes } = useBudget();
  const [splits, setSplits] = useState<TransactionSplit[] | null>(null);
  const [loading, setLoading] = useState(false);

  const envelopeMap = useMemo(() => new Map(envelopes.map(e => [e.id, e])), [envelopes]);

  const handleOpen = async (open: boolean) => {
    if (open && splits === null) {
      setLoading(true);
      try {
        const data = await fetchSplitsForTransaction(transactionId);
        setSplits(data);
      } catch {
        setSplits([]);
      } finally {
        setLoading(false);
      }
    }
  };

  // Show partial amount if in envelope context
  const currentSplit = splits?.find(s => s.envelopeId === currentEnvelopeId);

  return (
    <Popover onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center gap-1 rounded-full transition-colors hover:opacity-80",
            compact 
              ? "text-[10px] font-medium px-1.5 py-0.5 bg-accent text-accent-foreground"
              : "text-xs font-medium px-2 py-0.5 bg-accent text-accent-foreground"
          )}
        >
          <Split className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
          {compact ? 'Div.' : 'Divisée'}
          {currentEnvelopeId && currentSplit && (
            <span className="opacity-70">
              ({fmt(currentSplit.amount)} sur {fmt(totalAmount)})
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 rounded-xl" align="start" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-medium mb-2">Répartition de la dépense</p>
        {loading ? (
          <p className="text-xs text-muted-foreground">Chargement...</p>
        ) : (
          <div className="space-y-1.5">
            {splits?.map(s => {
              const env = envelopeMap.get(s.envelopeId);
              return (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{env?.name || 'Inconnu'}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-medium">{fmt(s.amount)}</span>
                    <span className="text-xs text-muted-foreground">({s.percentage}%)</span>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between text-sm pt-1.5 border-t font-medium">
              <span>Total</span>
              <span>{fmt(totalAmount)}</span>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
