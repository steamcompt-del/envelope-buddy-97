import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import type { ScannedReceiptData } from '@/hooks/useReceiptScanner';

interface ReceiptValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scannedData: ScannedReceiptData;
  warnings: string[];
  onAccept: (correctedItems: ScannedReceiptData['items']) => void;
  onReject: () => void;
}

const fmt = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export function ReceiptValidationDialog({
  open,
  onOpenChange,
  scannedData,
  warnings,
  onAccept,
  onReject,
}: ReceiptValidationDialogProps) {
  const itemsTotal = scannedData.items.reduce((sum, item) => sum + item.total_price, 0);
  const difference = scannedData.amount - itemsTotal;
  const percentCovered = scannedData.amount > 0 ? (itemsTotal / scannedData.amount) * 100 : 0;
  const hasItemIssue = scannedData.items.length > 0 && Math.abs(difference) > 0.5;

  const handleAccept = () => {
    let finalItems = [...scannedData.items];

    // Auto-add a "Divers" item to balance the total
    if (difference > 0.5 && scannedData.items.length > 0) {
      finalItems.push({
        name: `${scannedData.merchant || 'Divers'} - Autres articles`,
        quantity: 1,
        unit_price: null,
        total_price: Math.round(difference * 100) / 100,
      });
    }

    onAccept(finalItems);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasItemIssue || warnings.length > 0 ? (
              <>
                <AlertCircle className="w-5 h-5 text-destructive" />
                Vérification du scan
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 text-primary" />
                Scan validé
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border rounded-xl">
              <p className="text-xs text-muted-foreground">Total ticket</p>
              <p className="text-xl font-bold">{fmt(scannedData.amount)}</p>
            </div>
            <div className="p-3 border rounded-xl">
              <p className="text-xs text-muted-foreground">Somme articles</p>
              <p className="text-xl font-bold">{scannedData.items.length > 0 ? fmt(itemsTotal) : '—'}</p>
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-1">
                {warnings.map((w, i) => (
                  <p key={i} className="text-sm">⚠️ {w}</p>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {/* Item inconsistency */}
          {hasItemIssue && (
            <Alert className="rounded-xl">
              <AlertDescription className="text-sm">
                {difference > 0 ? (
                  <>
                    <strong>Incohérence :</strong> {fmt(difference)} manquants ({(100 - percentCovered).toFixed(0)}% non détaillé).
                    Un article «&nbsp;Autres&nbsp;» sera ajouté pour équilibrer.
                  </>
                ) : (
                  <>
                    <strong>Incohérence :</strong> la somme des articles dépasse le total de {fmt(Math.abs(difference))}.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Items list */}
          {scannedData.items.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Articles détectés ({scannedData.items.length})</p>
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border p-2">
                {scannedData.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-1 px-2 rounded-lg odd:bg-muted/30">
                    <span className="truncate flex-1 mr-2">
                      {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}
                    </span>
                    <span className="font-medium shrink-0">{fmt(item.total_price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Merchant & description */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Magasin :</span>{' '}
              <span className="font-medium">{scannedData.merchant || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Catégorie :</span>{' '}
              <span className="font-medium">{scannedData.category || '—'}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onReject} className="rounded-xl">
            Annuler
          </Button>
          <Button onClick={handleAccept} className="rounded-xl">
            {hasItemIssue ? 'Accepter avec correction' : 'Accepter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
