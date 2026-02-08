import { useState, useEffect, useCallback } from 'react';
import { ReceiptItem, fetchItemsForReceipt, addReceiptItems } from '@/lib/receiptItemsDb';
import { Receipt } from '@/lib/receiptsDb';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/hooks/useHousehold';
import { getBackendClient } from '@/lib/backendClient';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Package, Loader2, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ReceiptItemsListProps {
  receipt: Receipt;
  defaultOpen?: boolean;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export function ReceiptItemsList({ receipt, defaultOpen = false }: ReceiptItemsListProps) {
  const { user } = useAuth();
  const { household } = useHousehold();
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    // Load items when opening for the first time
    if (isOpen && !hasFetched) {
      setIsLoading(true);
      fetchItemsForReceipt(receipt.id)
        .then((data) => {
          setItems(data);
          setHasFetched(true);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, hasFetched, receipt.id]);

  const handleRescan = useCallback(async () => {
    if (!user) return;
    
    setIsScanning(true);
    try {
      // Fetch the image and convert to base64
      const response = await fetch(receipt.url);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove the data URL prefix
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(blob);
      });

      // Call the scan-receipt edge function
      const supabase = getBackendClient();
      const { data, error } = await supabase.functions.invoke('scan-receipt', {
        body: {
          imageBase64: base64,
          mimeType: blob.type,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.items && data.items.length > 0) {
        // Save items to database
        const savedItems = await addReceiptItems(
          user.id,
          receipt.id,
          household?.id || null,
          data.items.map((item: { name: string; quantity: number; unit_price: number | null; total_price: number }) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            totalPrice: item.total_price,
          }))
        );
        setItems(savedItems);
        toast.success(`${savedItems.length} article(s) extrait(s) !`);
      } else {
        toast.info('Aucun article détecté sur ce ticket');
      }
    } catch (error) {
      console.error('Error rescanning receipt:', error);
      toast.error('Erreur lors de l\'analyse du ticket');
    } finally {
      setIsScanning(false);
    }
  }, [user, receipt.id, receipt.url, household?.id]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors text-sm">
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <Package className="w-4 h-4 text-primary" />
        <span className="font-medium">Détail des articles</span>
        {hasFetched && items.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {totalItems} article{totalItems > 1 ? 's' : ''}
          </Badge>
        )}
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 ml-6 space-y-1">
          {isLoading ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Chargement...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-3 space-y-3">
              <p className="text-sm text-muted-foreground italic">
                Aucun détail disponible pour ce ticket
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRescan}
                disabled={isScanning}
                className="w-full"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <ScanLine className="w-4 h-4 mr-2" />
                    Analyser le ticket
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left py-2 px-3 font-medium">Article</th>
                      <th className="text-center py-2 px-3 font-medium w-16">Qté</th>
                      <th className="text-right py-2 px-3 font-medium w-24">Prix</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr 
                        key={item.id} 
                        className={cn(
                          "border-t border-border",
                          index % 2 === 1 && "bg-muted/20"
                        )}
                      >
                        <td className="py-2 px-3">
                          <span className="line-clamp-1">{item.name}</span>
                        </td>
                        <td className="py-2 px-3 text-center text-muted-foreground">
                          {item.quantity > 1 ? item.quantity : ''}
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30">
                      <td className="py-2 px-3 font-semibold">Total</td>
                      <td className="py-2 px-3 text-center text-muted-foreground">
                        {totalItems}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-primary">
                        {formatCurrency(totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface ReceiptItemsCompactProps {
  items: ReceiptItem[];
}

export function ReceiptItemsCompact({ items }: ReceiptItemsCompactProps) {
  if (items.length === 0) return null;

  const total = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div className="space-y-1">
      {items.slice(0, 3).map((item) => (
        <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
          <span className="truncate flex-1 mr-2">
            {item.quantity > 1 && `${item.quantity}x `}
            {item.name}
          </span>
          <span className="font-medium">{formatCurrency(item.totalPrice)}</span>
        </div>
      ))}
      {items.length > 3 && (
        <div className="text-xs text-muted-foreground italic">
          +{items.length - 3} autres articles...
        </div>
      )}
      <div className="flex justify-between text-sm font-medium pt-1 border-t border-border">
        <span>Total</span>
        <span className="text-primary">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
