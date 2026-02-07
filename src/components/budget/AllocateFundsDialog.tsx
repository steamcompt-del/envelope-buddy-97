import { useState } from 'react';
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
import { TrendingUp } from 'lucide-react';

interface AllocateFundsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedEnvelopeId?: string;
}

export function AllocateFundsDialog({ 
  open, 
  onOpenChange, 
  preselectedEnvelopeId 
}: AllocateFundsDialogProps) {
  const { toBeBudgeted, envelopes, allocateToEnvelope } = useBudget();
  const [selectedEnvelope, setSelectedEnvelope] = useState(preselectedEnvelopeId || '');
  const [amount, setAmount] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !selectedEnvelope) return;
    if (parsedAmount > toBeBudgeted) return;
    
    allocateToEnvelope(selectedEnvelope, parsedAmount);
    setAmount('');
    setSelectedEnvelope('');
    onOpenChange(false);
  };
  
  const handleAllocateAll = () => {
    if (!selectedEnvelope || toBeBudgeted <= 0) return;
    setAmount(toBeBudgeted.toString().replace('.', ','));
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Allouer des fonds</DialogTitle>
              <DialogDescription>
                Disponible : {toBeBudgeted.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="envelope-select">Enveloppe</Label>
            <Select value={selectedEnvelope} onValueChange={setSelectedEnvelope}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Sélectionner une enveloppe" />
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
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="allocate-amount">Montant</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAllocateAll}
                className="text-xs text-primary h-auto py-1"
              >
                Tout allouer
              </Button>
            </div>
            <div className="relative">
              <Input
                id="allocate-amount"
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
            {parseFloat(amount.replace(',', '.')) > toBeBudgeted && (
              <p className="text-xs text-destructive">
                Montant supérieur au disponible
              </p>
            )}
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
                !selectedEnvelope || 
                !amount || 
                parseFloat(amount.replace(',', '.')) <= 0 ||
                parseFloat(amount.replace(',', '.')) > toBeBudgeted
              }
              className="flex-1 rounded-xl gradient-primary shadow-button"
            >
              Allouer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
