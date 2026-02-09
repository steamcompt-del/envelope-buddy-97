import { useState } from 'react';
import { useBudget } from '@/contexts/BudgetContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Copy, Calendar } from 'lucide-react';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

interface CopyEnvelopesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, month };
}

function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatMonthDisplay(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function CopyEnvelopesDialog({ open, onOpenChange }: CopyEnvelopesDialogProps) {
  const { currentMonthKey, copyEnvelopesToMonth, setCurrentMonth, envelopes } = useBudget();
  const [loading, setLoading] = useState(false);
  
  // Target month input state
  const { year: currentYear, month: currentMonth } = parseMonthKey(currentMonthKey);
  const [targetYear, setTargetYear] = useState(currentYear);
  const [targetMonth, setTargetMonth] = useState(currentMonth);

  const targetMonthKey = formatMonthKey(targetYear, targetMonth);
  const isSameMonth = targetMonthKey === currentMonthKey;

  const handleCopy = async () => {
    if (isSameMonth) {
      toast.error('Sélectionnez un mois différent');
      return;
    }

    if (envelopes.length === 0) {
      toast.error('Aucune enveloppe à copier');
      return;
    }

    setLoading(true);
    try {
      await copyEnvelopesToMonth(targetMonthKey);
      toast.success(`Enveloppes copiées vers ${formatMonthDisplay(targetMonthKey)}`);
      setCurrentMonth(targetMonthKey);
      onOpenChange(false);
    } catch (error) {
      console.error('Error copying envelopes:', error);
      toast.error('Erreur lors de la copie des enveloppes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Copier les enveloppes
          </DialogTitle>
          <DialogDescription>
            Copier la structure de vos {envelopes.length} enveloppes vers un autre mois.
            Les enveloppes d'épargne conserveront leur solde.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Depuis :</span>
            <span className="font-medium">{formatMonthDisplay(currentMonthKey)}</span>
          </div>

          <div className="space-y-3">
            <Label>Vers quel mois ?</Label>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">Mois</Label>
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                >
                  {MONTH_NAMES.map((name, index) => (
                    <option key={index} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <Label className="text-xs text-muted-foreground mb-1 block">Année</Label>
                <Input
                  type="number"
                  value={targetYear}
                  onChange={(e) => setTargetYear(Number(e.target.value))}
                  min={2020}
                  max={2100}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {isSameMonth && (
            <p className="text-sm text-destructive">
              Veuillez sélectionner un mois différent du mois actuel.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleCopy} 
            disabled={loading || isSameMonth || envelopes.length === 0}
          >
            {loading ? 'Copie en cours...' : 'Copier les enveloppes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}