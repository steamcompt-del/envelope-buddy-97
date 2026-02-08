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
import { ArrowRightLeft } from 'lucide-react';

interface TransferFundsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromEnvelopeId?: string;
}

export function TransferFundsDialog({ 
  open, 
  onOpenChange,
  fromEnvelopeId 
}: TransferFundsDialogProps) {
  const { envelopes, transferBetweenEnvelopes } = useBudget();
  const [fromId, setFromId] = useState(fromEnvelopeId || '');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  
  const fromEnvelope = envelopes.find(e => e.id === fromId);
  const maxTransfer = fromEnvelope ? fromEnvelope.allocated - fromEnvelope.spent : 0;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !fromId || !toId) return;
    if (parsedAmount > maxTransfer) return;
    
    await transferBetweenEnvelopes(fromId, toId, parsedAmount);
    setAmount('');
    setFromId('');
    setToId('');
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <DialogTitle>Déplacer des fonds</DialogTitle>
              <DialogDescription>
                Transférer entre enveloppes
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>De</Label>
            <Select value={fromId} onValueChange={(v) => { setFromId(v); setToId(''); }}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {envelopes.filter(e => e.allocated - e.spent > 0).map((env) => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.name} ({(env.allocated - env.spent).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} disponible)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Vers</Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {envelopes.filter(e => e.id !== fromId).map((env) => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="transfer-amount">Montant</Label>
            {fromEnvelope && (
              <p className="text-xs text-muted-foreground">
                Max: {maxTransfer.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            )}
            <div className="relative">
              <Input
                id="transfer-amount"
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
                !fromId || 
                !toId || 
                !amount || 
                parseFloat(amount.replace(',', '.')) <= 0 ||
                parseFloat(amount.replace(',', '.')) > maxTransfer
              }
              className="flex-1 rounded-xl"
            >
              Transférer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
