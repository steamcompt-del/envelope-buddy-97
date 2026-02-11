import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { getBackendClient } from '@/lib/backendClient';
import { useAuth } from '@/contexts/AuthContext';
import { useBudget } from '@/contexts/BudgetContext';
import { Calendar, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface RolloverHistoryEntry {
  id: string;
  envelope_name: string;
  source_month_key: string;
  target_month_key: string;
  amount: number;
  strategy: string;
  created_at: string;
}

interface RolloverHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelopeId: string;
}

const strategyLabels: Record<string, string> = {
  full: 'Total',
  percentage: 'Pourcentage',
  capped: 'Plafonné',
  none: 'Aucun',
};

function formatMonthDisplay(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  return `${months[month - 1]} ${year}`;
}

export function RolloverHistoryDialog({ open, onOpenChange, envelopeId }: RolloverHistoryDialogProps) {
  const { user } = useAuth();
  const { household } = useBudget();
  const [history, setHistory] = useState<RolloverHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && envelopeId && user) {
      loadHistory();
    }
  }, [open, envelopeId, user]);

  const loadHistory = async () => {
    setLoading(true);
    const supabase = getBackendClient();

    let query = supabase
      .from('rollover_history')
      .select('*')
      .eq('envelope_id', envelopeId)
      .order('created_at', { ascending: false })
      .limit(12);

    if (household?.id) {
      query = query.eq('household_id', household.id);
    } else {
      query = query.eq('user_id', user!.id);
    }

    const { data } = await query;
    setHistory((data as RolloverHistoryEntry[]) || []);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Historique des reports
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            Aucun report enregistré pour cette enveloppe.
          </p>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 pr-2">
              {history.map((item) => (
                <div key={item.id} className="p-3 border rounded-xl bg-muted/30">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">
                        {formatMonthDisplay(item.source_month_key)} → {formatMonthDisplay(item.target_month_key)}
                      </p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {strategyLabels[item.strategy] || item.strategy}
                      </Badge>
                    </div>
                    <p className="font-bold text-primary">
                      +{formatCurrency(Number(item.amount))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
