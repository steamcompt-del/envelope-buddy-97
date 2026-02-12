import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface DuplicateExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DuplicateExpenseDialog({
  open,
  onOpenChange,
  amount,
  onConfirm,
  onCancel,
  isLoading = false,
}: DuplicateExpenseDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            Dépense en double ?
          </DialogTitle>
          <DialogDescription>
            Une dépense similaire a été enregistrée il y a moins de 5 minutes
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-2">Montant détecté :</p>
          <p className="text-2xl font-bold">{amount.toFixed(2)}€</p>
          <p className="text-xs text-muted-foreground mt-4">
            Voulez-vous continuer l'enregistrement de cette dépense ?
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Enregistrement...' : 'Continuer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
