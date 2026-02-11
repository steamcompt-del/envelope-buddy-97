import { useState, useMemo, useEffect } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AllocateFundsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedEnvelopeId?: string;
}

const fmt = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export function AllocateFundsDialog({ 
  open, 
  onOpenChange, 
  preselectedEnvelopeId 
}: AllocateFundsDialogProps) {
  const { toBeBudgeted, envelopes, allocateToEnvelope } = useBudget();
  const [selectedEnvelope, setSelectedEnvelope] = useState(preselectedEnvelopeId || '');
  const [amount, setAmount] = useState('');

  // Sync preselectedEnvelopeId when dialog opens with a new envelope
  useEffect(() => {
    if (open && preselectedEnvelopeId) {
      setSelectedEnvelope(preselectedEnvelopeId);
    }
    if (!open) {
      setAmount('');
    }
  }, [open, preselectedEnvelopeId]);
  
  const parsedAmount = useMemo(() => parseFloat(amount.replace(',', '.')) || 0, [amount]);
  const exceeds = Math.round(parsedAmount * 100) > Math.round(toBeBudgeted * 100);
  const remaining = toBeBudgeted - parsedAmount;
  
  // Total allocated across all envelopes
  const totalAllocated = useMemo(() => envelopes.reduce((sum, e) => sum + e.allocated, 0), [envelopes]);
  const totalBudget = totalAllocated + toBeBudgeted;
  const usageAfter = totalBudget > 0 ? ((totalAllocated + parsedAmount) / totalBudget) * 100 : 0;
  const highUsage = parsedAmount > 0 && !exceeds && usageAfter >= 80;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0 || !selectedEnvelope || exceeds) return;
    
    await allocateToEnvelope(selectedEnvelope, parsedAmount);
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
                Disponible : {fmt(toBeBudgeted)}
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
                className={cn(
                  "text-2xl font-semibold pr-12 rounded-xl",
                  exceeds && "border-destructive focus-visible:ring-destructive"
                )}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                €
              </span>
            </div>

            {/* Real-time remaining display */}
            {parsedAmount > 0 && !exceeds && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="w-3 h-3" />
                Après cette allocation, il vous restera {fmt(Math.max(0, remaining))}
              </p>
            )}
          </div>

          {/* Budget exceeded alert */}
          {exceeds && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Budget insuffisant : il vous reste {fmt(toBeBudgeted)} disponibles
              </AlertDescription>
            </Alert>
          )}

          {/* High usage warning */}
          {highUsage && (
            <Alert className="rounded-xl border-orange-500/50 text-orange-600 dark:text-orange-400 [&>svg]:text-orange-500">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Attention : vous allouez {Math.round(usageAfter)}% de votre budget
              </AlertDescription>
            </Alert>
          )}
          
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
              disabled={!selectedEnvelope || parsedAmount <= 0 || exceeds}
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
