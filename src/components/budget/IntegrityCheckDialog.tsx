import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useIntegrityCheck } from '@/hooks/useIntegrityCheck';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function IntegrityCheckDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { check, fix } = useIntegrityCheck();
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      const result = await check();
      setResult(result);
    } catch (error) {
      console.error('Error checking integrity:', error);
      toast.error('Erreur lors de la vérification');
    } finally {
      setIsChecking(false);
    }
  };

  const handleFix = async () => {
    setIsChecking(true);
    try {
      const result = await fix();
      setResult(result);
    } catch (error) {
      console.error('Error fixing integrity:', error);
      toast.error('Erreur lors de la correction');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vérification d'intégrité budgétaire</DialogTitle>
          <DialogDescription>
            Détecte et corrige les incohérences entre les revenus, allocations et le solde enregistré
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border-2 ${result.isValid ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}`}>
              <div className="flex items-start gap-3">
                {result.isValid ? (
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`font-semibold ${result.isValid ? 'text-primary' : 'text-destructive'}`}>{result.message}</p>
                  <dl className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="font-medium">Revenus totaux :</dt>
                      <dd>{result.totalIncomes.toFixed(2)}€</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Allocations totales :</dt>
                      <dd>{result.totalAllocations.toFixed(2)}€</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">À budgétiser (stocké) :</dt>
                      <dd>{result.storedToBeBudgeted.toFixed(2)}€</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">À budgétiser (calculé) :</dt>
                      <dd>{result.calculatedToBeBudgeted.toFixed(2)}€</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setResult(null)} disabled={isChecking}>
                Réessayer
              </Button>
              {!result.isValid && (
                <Button onClick={handleFix} disabled={isChecking}>
                  {isChecking ? 'Correction en cours...' : 'Corriger le budget'}
                </Button>
              )}
            </DialogFooter>
          </div>
        ) : (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            <Button onClick={handleCheck} disabled={isChecking}>
              {isChecking ? 'Vérification en cours...' : 'Vérifier le budget'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
