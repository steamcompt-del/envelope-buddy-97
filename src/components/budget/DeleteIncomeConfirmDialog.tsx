import { useState } from 'react';
import { useBudget, Income, Envelope } from '@/contexts/BudgetContext';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle, TrendingDown, Wallet, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteIncomeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income: Income | null;
}

export function DeleteIncomeConfirmDialog({
  open,
  onOpenChange,
  income,
}: DeleteIncomeConfirmDialogProps) {
  const { toBeBudgeted, envelopes, deleteIncome, deallocateFromEnvelope } = useBudget();
  const [autoDealloc, setAutoDealloc] = useState(true);
  const [deleting, setDeleting] = useState(false);

  if (!income) return null;

  const newBalance = toBeBudgeted - income.amount;
  const willBeNegative = newBalance < -0.005; // cents precision
  const deficit = Math.abs(Math.min(0, newBalance));

  // Envelopes with available funds (allocated - spent > 0), sorted by largest available first
  const envelopesWithFunds = envelopes
    .map((e) => ({ ...e, available: e.allocated - e.spent }))
    .filter((e) => e.available > 0.005)
    .sort((a, b) => b.available - a.available);

  // Compute deallocation plan: greedily take from envelopes until deficit is covered
  const deallocationPlan: { envelope: Envelope & { available: number }; amount: number }[] = [];
  if (willBeNegative && envelopesWithFunds.length > 0) {
    let remaining = deficit;
    for (const env of envelopesWithFunds) {
      if (remaining <= 0.005) break;
      const take = Math.min(env.available, remaining);
      deallocationPlan.push({ envelope: env, amount: Math.round(take * 100) / 100 });
      remaining -= take;
    }
  }

  const canFullyCover = deallocationPlan.reduce((s, p) => s + p.amount, 0) >= deficit - 0.005;
  const totalDealloc = deallocationPlan.reduce((s, p) => s + p.amount, 0);

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      // If auto-deallocation is enabled and balance would be negative
      if (willBeNegative && autoDealloc && deallocationPlan.length > 0) {
        for (const plan of deallocationPlan) {
          await deallocateFromEnvelope(plan.envelope.id, plan.amount);
        }
        toast.success(
          `${fmt(totalDealloc)} désalloués de ${deallocationPlan.length} enveloppe(s)`
        );
      }

      await deleteIncome(income.id);
      toast.success('Revenu supprimé');
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting income:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md rounded-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <AlertDialogTitle>Supprimer ce revenu ?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="sr-only">
            Confirmation de suppression du revenu
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Income details */}
          <div className="p-3 rounded-xl bg-muted/50 border border-border/50 space-y-1">
            <p className="font-medium">{income.description}</p>
            <p className="text-lg font-bold text-primary">{fmt(income.amount)}</p>
          </div>

          {/* Impact summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" />
              Impact sur le budget
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border/30">
                <p className="text-xs text-muted-foreground">Solde actuel</p>
                <p className="font-semibold">{fmt(toBeBudgeted)}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border/30">
                <p className="text-xs text-muted-foreground">Nouveau solde</p>
                <p className={`font-semibold ${willBeNegative ? 'text-destructive' : ''}`}>
                  {fmt(newBalance)}
                </p>
              </div>
            </div>
          </div>

          {/* Negative balance warning + auto-deallocation */}
          {willBeNegative && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm">
                <p className="font-medium text-destructive mb-1">
                  ⚠️ Le solde "À budgétiser" deviendra négatif de {fmt(deficit)}
                </p>
                <p className="text-muted-foreground text-xs">
                  Cela signifie que vous avez alloué plus que vos revenus disponibles.
                </p>
              </div>

              {envelopesWithFunds.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-dealloc" className="text-sm font-medium flex items-center gap-1.5">
                      <ArrowDownRight className="w-4 h-4" />
                      Désallouer automatiquement
                    </Label>
                    <Switch
                      id="auto-dealloc"
                      checked={autoDealloc}
                      onCheckedChange={setAutoDealloc}
                    />
                  </div>

                  {autoDealloc && (
                    <div className="space-y-1.5 ml-1">
                      {deallocationPlan.map((plan) => (
                        <div
                          key={plan.envelope.id}
                          className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30"
                        >
                          <span className="flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                            {plan.envelope.name}
                          </span>
                          <span className="font-medium text-destructive">
                            -{fmt(plan.amount)}
                          </span>
                        </div>
                      ))}
                      {!canFullyCover && (
                        <p className="text-xs text-destructive/80 mt-1">
                          Fonds insuffisants pour couvrir la totalité du déficit.
                          Reste {fmt(deficit - totalDealloc)} non couvert.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter className="mt-2">
          <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleting}
            className="rounded-xl"
          >
            {deleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
