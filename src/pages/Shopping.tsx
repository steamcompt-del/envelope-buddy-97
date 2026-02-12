import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShoppingListContent } from '@/components/budget/ShoppingListContent';
import { ScanDrawer } from '@/components/budget/ScanDrawer';
import { useShoppingList } from '@/hooks/useShoppingList';
import { ArrowLeft, ShoppingCart, Store, ScanLine, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ScannedExpenseData } from '@/components/budget/AddExpenseDrawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

export default function ShoppingPage() {
  const [storeMode, setStoreMode] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scannedItems, setScannedItems] = useState<Array<{ name: string; price: number; selected: boolean }>>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const { addItem } = useShoppingList();

  const handleScanComplete = useCallback((data: ScannedExpenseData) => {
    // If we have receipt items from scan, offer to import them
    // For now, create a single item from the scan result
    if (data.description) {
      setScannedItems([{
        name: data.description,
        price: data.amount || 0,
        selected: true,
      }]);
      setImportDialogOpen(true);
    }
  }, []);

  const handleImportItems = useCallback(async () => {
    const selected = scannedItems.filter(i => i.selected);
    if (selected.length === 0) return;

    let added = 0;
    for (const item of selected) {
      try {
        await addItem({
          name: item.name,
          estimatedPrice: item.price > 0 ? item.price : null,
        });
        added++;
      } catch {
        // Continue with other items
      }
    }

    toast.success(`${added} article${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''} à la liste`);
    setImportDialogOpen(false);
    setScannedItems([]);
  }, [scannedItems, addItem]);

  const toggleScannedItem = useCallback((index: number) => {
    setScannedItems(prev => prev.map((item, i) =>
      i === index ? { ...item, selected: !item.selected } : item
    ));
  }, []);

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Liste de courses
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Scan Button */}
            {!storeMode && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setScanOpen(true)}
                className="rounded-xl h-9 w-9"
              >
                <ScanLine className="h-4 w-4" />
              </Button>
            )}

            {/* Store Mode Toggle */}
            <button
              onClick={() => setStoreMode(!storeMode)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors text-sm font-medium',
                storeMode
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
              )}
            >
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Magasin</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container py-6">
        <ShoppingListContent storeMode={storeMode} />
      </div>

      {/* Scan Drawer */}
      <ScanDrawer
        open={scanOpen}
        onOpenChange={setScanOpen}
        onScanComplete={handleScanComplete}
      />

      {/* Import from Scan Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              Importer dans la liste
            </DialogTitle>
            <DialogDescription>
              Sélectionnez les articles à ajouter à votre liste de courses
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {scannedItems.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer',
                  item.selected ? 'bg-primary/5 border-primary/30' : 'bg-card'
                )}
                onClick={() => toggleScannedItem(idx)}
              >
                <Checkbox checked={item.selected} />
                <span className="flex-1 text-sm font-medium">{item.name}</span>
                {item.price > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {item.price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                )}
              </div>
            ))}
          </div>
          <Button onClick={handleImportItems} className="w-full rounded-xl gap-2">
            <Check className="w-4 h-4" />
            Ajouter {scannedItems.filter(i => i.selected).length} article{scannedItems.filter(i => i.selected).length > 1 ? 's' : ''}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
