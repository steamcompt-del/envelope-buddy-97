import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBudget } from '@/contexts/BudgetContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle, XCircle, Zap } from 'lucide-react';

interface AutoAllocationHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HistoryEntry {
  id: string;
  goal_name: string;
  amount: number;
  priority: string;
  status: string;
  error_message: string | null;
  month_key: string;
  created_at: string;
}

const priorityLabels: Record<string, string> = {
  essential: 'Essentiel',
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Basse',
};

const priorityColors: Record<string, string> = {
  essential: 'destructive',
  high: 'default',
  medium: 'secondary',
  low: 'outline',
};

export function AutoAllocationHistoryDialog({ open, onOpenChange }: AutoAllocationHistoryDialogProps) {
  const { user } = useAuth();
  const { household } = useBudget();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;

    const fetchHistory = async () => {
      setLoading(true);
      let query = supabase
        .from('auto_allocation_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (household) {
        query = query.eq('household_id', household.id);
      } else {
        query = query.eq('user_id', user.id).is('household_id', null);
      }

      const { data, error } = await query;
      if (!error && data) {
        setEntries(data as HistoryEntry[]);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [open, user, household]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Historique auto-allocations
          </DialogTitle>
          <DialogDescription>
            Les 50 dernières allocations automatiques vers vos objectifs d'épargne.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="space-y-3 p-1">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucune auto-allocation enregistrée pour le moment.
            </div>
          ) : (
            <div className="space-y-2 p-1">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-muted"
                >
                  {entry.status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{entry.goal_name}</span>
                      <span className={`text-sm font-bold whitespace-nowrap ${entry.status === 'success' ? 'text-primary' : 'text-destructive'}`}>
                        {entry.status === 'success' ? '+' : ''}
                        {entry.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={priorityColors[entry.priority] as any || 'secondary'} className="text-[10px] px-1.5 py-0">
                        {priorityLabels[entry.priority] || entry.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </span>
                    </div>
                    {entry.error_message && (
                      <p className="text-xs text-destructive mt-1">{entry.error_message}</p>
                    )}
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
