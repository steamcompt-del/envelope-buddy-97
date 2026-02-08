import { useState } from 'react';
import { useShoppingList } from '@/hooks/useShoppingList';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Sparkles, 
  ChevronDown, 
  Loader2,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShoppingListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShoppingListSheet({ open, onOpenChange }: ShoppingListSheetProps) {
  const {
    items,
    frequentItems,
    loading,
    addItem,
    toggleItem,
    removeItem,
    clearChecked,
    checkedCount,
    uncheckedCount,
    estimatedTotal,
  } = useShoppingList();

  const [newItemName, setNewItemName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setIsAdding(true);
    try {
      await addItem({ name: newItemName.trim() });
      setNewItemName('');
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddSuggestion = async (name: string, avgPrice: number) => {
    try {
      await addItem({ 
        name, 
        estimatedPrice: avgPrice > 0 ? avgPrice : null,
        suggestedFromHistory: true 
      });
    } catch {
      // Error handled in hook
    }
  };

  // Filter out suggestions that are already in the list
  const availableSuggestions = frequentItems.filter(
    suggestion => !items.some(item => 
      item.name.toLowerCase() === suggestion.name.toLowerCase()
    )
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Liste de courses
          </SheetTitle>
          <SheetDescription>
            {uncheckedCount} article{uncheckedCount !== 1 ? 's' : ''} à acheter
            {estimatedTotal > 0 && (
              <span className="ml-2 text-primary font-medium">
                · ~{estimatedTotal.toFixed(2)} €
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[calc(85vh-180px)] pr-4">
            {/* Add item form */}
            <form onSubmit={handleAddItem} className="flex gap-2 mb-4">
              <Input
                placeholder="Ajouter un article..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={isAdding || !newItemName.trim()}>
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </form>

            {/* Suggestions from history */}
            {availableSuggestions.length > 0 && (
              <Collapsible open={suggestionsOpen} onOpenChange={setSuggestionsOpen} className="mb-4">
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Suggestions basées sur vos achats</span>
                  <ChevronDown className={cn(
                    "w-4 h-4 ml-auto transition-transform",
                    suggestionsOpen && "rotate-180"
                  )} />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="flex flex-wrap gap-2">
                    {availableSuggestions.slice(0, 8).map((suggestion) => (
                      <Badge
                        key={suggestion.name}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => handleAddSuggestion(suggestion.name, suggestion.avgPrice)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {suggestion.name}
                        {suggestion.avgPrice > 0 && (
                          <span className="ml-1 text-muted-foreground">
                            ~{suggestion.avgPrice.toFixed(2)}€
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Shopping list items */}
            {items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Votre liste est vide</p>
                <p className="text-sm mt-1">Ajoutez des articles ou utilisez les suggestions</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all",
                      item.isChecked 
                        ? "bg-muted/50 border-muted" 
                        : "bg-card border-border hover:border-primary/30"
                    )}
                  >
                    <Checkbox
                      checked={item.isChecked}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium truncate",
                        item.isChecked && "line-through text-muted-foreground"
                      )}>
                        {item.name}
                      </p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-muted-foreground">
                          Quantité: {item.quantity}
                        </p>
                      )}
                    </div>
                    {item.estimatedPrice && (
                      <span className={cn(
                        "text-sm",
                        item.isChecked ? "text-muted-foreground" : "text-primary"
                      )}>
                        ~{(item.estimatedPrice * item.quantity).toFixed(2)}€
                      </span>
                    )}
                    {item.suggestedFromHistory && !item.isChecked && (
                      <Sparkles className="w-3 h-3 text-primary/60" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        {/* Footer actions */}
        {checkedCount > 0 && (
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={clearChecked}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer les {checkedCount} article{checkedCount !== 1 ? 's' : ''} coché{checkedCount !== 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
