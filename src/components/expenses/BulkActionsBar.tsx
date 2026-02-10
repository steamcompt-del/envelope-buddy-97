import { useState } from 'react';
import { useBudget, Envelope } from '@/contexts/BudgetContext';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { CheckSquare, Trash2, FolderInput, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  selectedIds: Set<string>;
  onClear: () => void;
  onDeselectAll: () => void;
}

export function BulkActionsBar({ selectedIds, onClear, onDeselectAll }: Props) {
  const { envelopes, updateTransaction, deleteTransaction, transactions } = useBudget();
  const [moving, setMoving] = useState(false);
  const count = selectedIds.size;

  if (count === 0) return null;

  const handleMoveToEnvelope = async (envelopeId: string) => {
    setMoving(true);
    try {
      const txs = transactions.filter(t => selectedIds.has(t.id));
      for (const t of txs) {
        await updateTransaction(t.id, { envelopeId });
      }
      toast.success(`${count} transaction(s) déplacée(s)`);
      onClear();
    } catch {
      toast.error('Erreur lors du déplacement');
    } finally {
      setMoving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Supprimer ${count} transaction(s) ?`)) return;
    try {
      const txs = transactions.filter(t => selectedIds.has(t.id));
      for (const t of txs) {
        await deleteTransaction(t.id);
      }
      toast.success(`${count} transaction(s) supprimée(s)`);
      onClear();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="sticky bottom-20 z-30 mx-auto max-w-lg animate-fade-in">
      <div className="bg-card border rounded-2xl shadow-lg p-3 flex items-center gap-2">
        <div className="flex items-center gap-2 flex-shrink-0">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{count}</span>
        </div>

        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto">
          <Select onValueChange={handleMoveToEnvelope} disabled={moving}>
            <SelectTrigger className="h-8 text-xs rounded-lg w-auto min-w-[130px]">
              <FolderInput className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Déplacer vers..." />
            </SelectTrigger>
            <SelectContent>
              {envelopes.map(env => (
                <SelectItem key={env.id} value={env.id}>{env.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="destructive" size="sm" className="h-8 text-xs rounded-lg gap-1" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer
          </Button>
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onDeselectAll}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
