import { useState, useEffect } from 'react';
import { useBudget } from '@/contexts/BudgetContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useRecurring } from '@/hooks/useRecurring';
import { RecurringTransaction, RecurringFrequency, frequencyLabels } from '@/lib/recurringDb';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CalendarIcon, Trash2, Clock } from 'lucide-react';

interface RecurringFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: RecurringTransaction | null;
}

export function RecurringFormDialog({ open, onOpenChange, editingItem }: RecurringFormDialogProps) {
  const { envelopes } = useBudget();
  const { create, update, remove } = useRecurring();
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [envelopeId, setEnvelopeId] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [nextDueDate, setNextDueDate] = useState<Date | undefined>(undefined);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!editingItem) return;
    if (!confirm('Supprimer cette dépense récurrente ?')) return;
    
    setIsDeleting(true);
    try {
      await remove(editingItem.id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset form when dialog opens or editingItem changes
  useEffect(() => {
    if (open) {
      if (editingItem) {
        setAmount(editingItem.amount.toString());
        setDescription(editingItem.description);
        setMerchant(editingItem.merchant || '');
        setEnvelopeId(editingItem.envelopeId);
        setFrequency(editingItem.frequency);
        setNextDueDate(new Date(editingItem.nextDueDate));
      } else {
        // Default values for new item
        setAmount('');
        setDescription('');
        setMerchant('');
        setEnvelopeId(envelopes[0]?.id || '');
        setFrequency('monthly');
        // Default to first of next month
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        setNextDueDate(nextMonth);
      }
    }
  }, [open, editingItem, envelopes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !envelopeId || !nextDueDate) return;

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await update(editingItem.id, {
          amount: parseFloat(amount),
          description,
          merchant: merchant || undefined,
          envelopeId,
          frequency,
          nextDueDate: nextDueDate.toISOString().split('T')[0],
        });
      } else {
        await create({
          amount: parseFloat(amount),
          description,
          merchant: merchant || undefined,
          envelopeId,
          frequency,
          nextDueDate: nextDueDate.toISOString().split('T')[0],
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving recurring transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? 'Modifier la dépense récurrente' : 'Nouvelle dépense récurrente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="recurring-amount">Montant</Label>
            <div className="relative">
              <Input
                id="recurring-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pr-8"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="recurring-description">Description</Label>
            <Input
              id="recurring-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex: Loyer, Netflix, Électricité..."
              required
            />
          </div>

          {/* Merchant (optional) */}
          <div className="space-y-2">
            <Label htmlFor="recurring-merchant">Marchand (optionnel)</Label>
            <Input
              id="recurring-merchant"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="ex: Propriétaire, EDF..."
            />
          </div>

          {/* Envelope */}
          <div className="space-y-2">
            <Label>Enveloppe</Label>
            <Select value={envelopeId} onValueChange={setEnvelopeId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une enveloppe" />
              </SelectTrigger>
              <SelectContent>
                {envelopes.map((env) => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>Fréquence</Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurringFrequency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(frequencyLabels) as RecurringFrequency[]).map((freq) => (
                  <SelectItem key={freq} value={freq}>
                    {frequencyLabels[freq]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Next Due Date */}
          <div className="space-y-2">
            <Label>Prochaine échéance</Label>
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal rounded-lg",
                    !nextDueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {nextDueDate ? format(nextDueDate, "d MMMM yyyy", { locale: fr }) : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={nextDueDate}
                  onSelect={(date) => {
                    setNextDueDate(date);
                    setDatePopoverOpen(false);
                  }}
                  initialFocus
                  locale={fr}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Auto-apply info */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border">
            <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Application automatique</p>
              <p className="text-xs text-muted-foreground">
                La dépense sera ajoutée automatiquement à la date prévue, chaque jour à minuit.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {editingItem && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-xl"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !amount || !description || !envelopeId}
              className="flex-1"
            >
              {isSubmitting ? 'Enregistrement...' : editingItem ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}