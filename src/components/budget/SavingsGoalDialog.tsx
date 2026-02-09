import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Target, Trash2 } from 'lucide-react';
import { SavingsGoal } from '@/lib/savingsGoalsDb';

interface SavingsGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelopeId: string;
  envelopeName: string;
  existingGoal?: SavingsGoal;
  onSave: (targetAmount: number, targetDate?: string, name?: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function SavingsGoalDialog({
  open,
  onOpenChange,
  envelopeName,
  existingGoal,
  onSave,
  onDelete,
}: SavingsGoalDialogProps) {
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [name, setName] = useState('');
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (existingGoal) {
      setTargetAmount(existingGoal.target_amount.toString().replace('.', ','));
      setTargetDate(existingGoal.target_date ? parseISO(existingGoal.target_date) : undefined);
      setName(existingGoal.name || '');
    } else {
      setTargetAmount('');
      setTargetDate(undefined);
      setName('');
    }
  }, [existingGoal, open]);

  const handleSave = async () => {
    const parsedAmount = parseFloat(targetAmount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setIsSaving(true);
    try {
      await onSave(
        parsedAmount,
        targetDate ? format(targetDate, 'yyyy-MM-dd') : undefined,
        name || undefined
      );
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving goal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Supprimer cet objectif d\'épargne ?')) return;

    setIsSaving(true);
    try {
      await onDelete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting goal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>
                {existingGoal ? 'Modifier l\'objectif' : 'Définir un objectif'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">{envelopeName}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Nom de l'objectif (optionnel)</Label>
            <Input
              id="goal-name"
              placeholder="Ex: Fonds d'urgence, Vacances..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-amount">Montant cible *</Label>
            <div className="relative">
              <Input
                id="target-amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="pr-8 rounded-lg"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date limite (optionnel)</Label>
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal rounded-lg",
                    !targetDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(targetDate, "PPP", { locale: fr }) : "Choisir une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={targetDate}
                  onSelect={(date) => {
                    setTargetDate(date);
                    setDatePopoverOpen(false);
                  }}
                  initialFocus
                  locale={fr}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
            {targetDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTargetDate(undefined)}
                className="text-xs text-muted-foreground"
              >
                Effacer la date
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {existingGoal && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
              className="rounded-lg w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          )}
          <div className="flex gap-2 flex-1 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="rounded-lg flex-1 sm:flex-none"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !targetAmount || parseFloat(targetAmount.replace(',', '.')) <= 0}
              className="rounded-lg flex-1 sm:flex-none"
            >
              {isSaving ? 'Enregistrement...' : existingGoal ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
