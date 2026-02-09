import { useState, useEffect } from 'react';
import { useBudget } from '@/contexts/BudgetContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { CalendarArrowUp } from 'lucide-react';

interface TransferToMonthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromEnvelopeId?: string;
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, month };
}

function formatMonthDisplay(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function TransferToMonthDialog({ 
  open, 
  onOpenChange,
  fromEnvelopeId 
}: TransferToMonthDialogProps) {
  const { 
    envelopes, 
    currentMonthKey, 
    getAvailableMonths,
    transferToMonth 
  } = useBudget();
  
  const [envelopeId, setEnvelopeId] = useState(fromEnvelopeId || '');
  const [targetMonth, setTargetMonth] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setEnvelopeId(fromEnvelopeId || '');
      setTargetMonth('');
      setAmount('');
    }
  }, [open, fromEnvelopeId]);
  
  const selectedEnvelope = envelopes.find(e => e.id === envelopeId);
  const maxTransfer = selectedEnvelope ? selectedEnvelope.allocated - selectedEnvelope.spent : 0;
  
  // Get available months excluding current month
  const availableMonths = getAvailableMonths().filter(m => m !== currentMonthKey);
  
  // Generate future months (next 12 months) if not in list
  const generateMonthOptions = () => {
    const options = new Set(availableMonths);
    const { year, month } = parseMonthKey(currentMonthKey);
    
    // Add next 12 months
    for (let i = 1; i <= 12; i++) {
      let newMonth = month + i;
      let newYear = year;
      if (newMonth > 12) {
        newMonth -= 12;
        newYear += 1;
      }
      options.add(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    }
    
    // Add previous 12 months
    for (let i = 1; i <= 12; i++) {
      let newMonth = month - i;
      let newYear = year;
      if (newMonth < 1) {
        newMonth += 12;
        newYear -= 1;
      }
      options.add(`${newYear}-${String(newMonth).padStart(2, '0')}`);
    }
    
    return Array.from(options)
      .filter(m => m !== currentMonthKey)
      .sort();
  };
  
  const monthOptions = generateMonthOptions();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !envelopeId || !targetMonth) return;
    if (parsedAmount > maxTransfer) return;
    
    setIsSubmitting(true);
    try {
      await transferToMonth(envelopeId, targetMonth, parsedAmount);
      setAmount('');
      setEnvelopeId('');
      setTargetMonth('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <CalendarArrowUp className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <DialogTitle>Transférer vers un autre mois</DialogTitle>
              <DialogDescription>
                Déplacer des fonds d'une enveloppe vers un autre mois
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source envelope */}
          <div className="space-y-2">
            <Label>Enveloppe source</Label>
            <Select value={envelopeId} onValueChange={setEnvelopeId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Sélectionner une enveloppe" />
              </SelectTrigger>
              <SelectContent>
                {envelopes.filter(e => e.allocated - e.spent > 0).map((env) => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.name} ({(env.allocated - env.spent).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} disponible)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Mois actuel : {formatMonthDisplay(currentMonthKey)}
            </p>
          </div>
          
          {/* Target month */}
          <div className="space-y-2">
            <Label>Mois de destination</Label>
            <Select value={targetMonth} onValueChange={setTargetMonth}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Sélectionner un mois" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((monthKey) => (
                  <SelectItem key={monthKey} value={monthKey}>
                    {formatMonthDisplay(monthKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="transfer-month-amount">Montant</Label>
            {selectedEnvelope && (
              <p className="text-xs text-muted-foreground">
                Max: {maxTransfer.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            )}
            <div className="relative">
              <Input
                id="transfer-month-amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-2xl font-semibold pr-12 rounded-xl"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                €
              </span>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !envelopeId || 
                !targetMonth || 
                !amount || 
                parseFloat(amount.replace(',', '.')) <= 0 ||
                parseFloat(amount.replace(',', '.')) > maxTransfer
              }
              className="flex-1 rounded-xl"
            >
              {isSubmitting ? 'Transfert...' : 'Transférer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
