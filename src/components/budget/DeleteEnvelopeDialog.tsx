import { useState } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Trash2, Undo2, Ban } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface DeleteEnvelopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelopeName: string;
  allocatedAmount: number;
  onConfirm: (refundToBudget: boolean) => Promise<void>;
}

export function DeleteEnvelopeDialog({
  open,
  onOpenChange,
  envelopeName,
  allocatedAmount,
  onConfirm,
}: DeleteEnvelopeDialogProps) {
  const [refundChoice, setRefundChoice] = useState<'refund' | 'discard'>('refund');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(refundChoice === 'refund');
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const hasAllocation = allocatedAmount > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-destructive" />
            </div>
            Supprimer « {envelopeName} » ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Toutes les données de cette enveloppe seront perdues.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasAllocation && (
          <div className="space-y-3 py-2">
            <p className="text-sm font-medium">
              Cette enveloppe contient {formatCurrency(allocatedAmount)} alloués. Que souhaitez-vous en faire ?
            </p>
            <RadioGroup
              value={refundChoice}
              onValueChange={(v) => setRefundChoice(v as 'refund' | 'discard')}
              className="space-y-2"
            >
              <label
                htmlFor="refund"
                className="flex items-start gap-3 p-3 rounded-xl border border-border cursor-pointer transition-colors hover:bg-muted/30 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem value="refund" id="refund" className="mt-0.5" />
                <div className="space-y-0.5">
                  <Label htmlFor="refund" className="font-medium cursor-pointer flex items-center gap-2">
                    <Undo2 className="w-4 h-4 text-emerald-500" />
                    Remettre dans « À budgétiser »
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(allocatedAmount)} seront reversés dans votre budget disponible
                  </p>
                </div>
              </label>

              <label
                htmlFor="discard"
                className="flex items-start gap-3 p-3 rounded-xl border border-border cursor-pointer transition-colors hover:bg-muted/30 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem value="discard" id="discard" className="mt-0.5" />
                <div className="space-y-0.5">
                  <Label htmlFor="discard" className="font-medium cursor-pointer flex items-center gap-2">
                    <Ban className="w-4 h-4 text-destructive" />
                    Supprimer sans rembourser
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(allocatedAmount)} ne seront pas reversés au budget
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>
        )}

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel className="rounded-xl" disabled={isDeleting}>
            Annuler
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="rounded-xl"
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
