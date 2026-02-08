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
  Package,
  Edit2,
  Check,
  X,
  Archive,
  History,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShoppingListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShoppingListSheet({ open, onOpenChange }: ShoppingListSheetProps) {
  const {
    items,
    archives,
    frequentItems,
    loading,
    addItem,
    toggleItem,
    removeItem,
    updateItem,
    clearChecked,
    archiveChecked,
    removeArchive,
    checkedCount,
    uncheckedCount,
    estimatedTotal,
  } = useShoppingList();

  const [newItemName, setNewItemName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('1');
  const [editPrice, setEditPrice] = useState('0');
  const [showHistory, setShowHistory] = useState(false);
  const [expandedArchive, setExpandedArchive] = useState<string | null>(null);

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

  const handleStartEdit = (item: any) => {
    setEditingId(item.id);
    setEditQuantity(item.quantity.toString());
    setEditPrice((item.estimatedPrice || 0).toString());
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      const quantity = Math.max(1, parseFloat(editQuantity) || 1);
      const price = Math.max(0, parseFloat(editPrice) || 0);
      
      await updateItem(editingId, {
        quantity,
        estimatedPrice: price > 0 ? price : null,
      });
      setEditingId(null);
    } catch {
      // Error handled in hook
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Filter out suggestions that are already in the list
  const availableSuggestions = frequentItems.filter(
    suggestion => !items.some(item => 
      item.name.toLowerCase() === suggestion.name.toLowerCase()
    )
  );

  // Filter suggestions based on input for autocomplete
  const autocompleteSuggestions = newItemName.trim().length >= 2
    ? availableSuggestions.filter(suggestion =>
        suggestion.name.toLowerCase().includes(newItemName.toLowerCase())
      ).slice(0, 5)
    : [];

  const handleSelectSuggestion = async (suggestion: { name: string; avgPrice: number }) => {
    setIsAdding(true);
    try {
      await addItem({ 
        name: suggestion.name, 
        estimatedPrice: suggestion.avgPrice > 0 ? suggestion.avgPrice : null,
        suggestedFromHistory: true 
      });
      setNewItemName('');
    } finally {
      setIsAdding(false);
    }
  };

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
            {/* Add item form with autocomplete */}
            <div className="relative mb-4">
              <form onSubmit={handleAddItem} className="flex gap-2">
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
              
              {/* Autocomplete dropdown */}
              {autocompleteSuggestions.length > 0 && (
                <div className="absolute left-0 right-12 top-full mt-1 z-50 bg-popover border rounded-lg shadow-lg overflow-hidden">
                  {autocompleteSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.name}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center justify-between"
                      onClick={() => handleSelectSuggestion(suggestion)}
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-primary/60" />
                        <span>{suggestion.name}</span>
                      </span>
                      {suggestion.avgPrice > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ~{suggestion.avgPrice.toFixed(2)}€
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                       "p-3 rounded-lg border transition-all",
                       item.isChecked 
                         ? "bg-muted/50 border-muted" 
                         : "bg-card border-border hover:border-primary/30"
                     )}
                   >
                     {editingId === item.id ? (
                       // Edit mode
                       <div className="space-y-3">
                         <p className="font-medium">{item.name}</p>
                         <div className="grid grid-cols-2 gap-2">
                           <div>
                             <label className="text-xs text-muted-foreground mb-1 block">Quantité</label>
                             <Input
                               type="number"
                               min="1"
                               step="0.1"
                               value={editQuantity}
                               onChange={(e) => setEditQuantity(e.target.value)}
                               className="h-8"
                             />
                           </div>
                           <div>
                             <label className="text-xs text-muted-foreground mb-1 block">Prix unitaire (€)</label>
                             <Input
                               type="number"
                               min="0"
                               step="0.01"
                               value={editPrice}
                               onChange={(e) => setEditPrice(e.target.value)}
                               className="h-8"
                             />
                           </div>
                         </div>
                         <div className="flex gap-2">
                           <Button
                             size="sm"
                             variant="default"
                             className="flex-1 h-8"
                             onClick={handleSaveEdit}
                           >
                             <Check className="w-3 h-3 mr-1" />
                             Enregistrer
                           </Button>
                           <Button
                             size="sm"
                             variant="outline"
                             className="flex-1 h-8"
                             onClick={handleCancelEdit}
                           >
                             <X className="w-3 h-3 mr-1" />
                             Annuler
                           </Button>
                         </div>
                       </div>
                     ) : (
                       // View mode
                       <div className="flex items-center gap-3">
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
                           <p className="text-xs text-muted-foreground">
                             Quantité: {item.quantity}
                             {item.estimatedPrice && ` · ${item.estimatedPrice.toFixed(2)}€ l'unité`}
                           </p>
                         </div>
                         {item.estimatedPrice && (
                           <span className={cn(
                             "text-sm font-medium whitespace-nowrap",
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
                           className="h-8 w-8 text-muted-foreground hover:text-primary"
                           onClick={() => handleStartEdit(item)}
                         >
                           <Edit2 className="w-4 h-4" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="icon"
                           className="h-8 w-8 text-muted-foreground hover:text-destructive"
                           onClick={() => removeItem(item.id)}
                         >
                           <Trash2 className="w-4 h-4" />
                         </Button>
                       </div>
                     )}
                   </div>
                 ))}
               </div>
            )}
          </ScrollArea>
        )}

        {/* Footer actions */}
        <div className="pt-4 border-t space-y-2">
          {/* History toggle */}
          <Button
            variant="ghost"
            className="w-full justify-between"
            onClick={() => setShowHistory(!showHistory)}
          >
            <span className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Historique ({archives.length})
            </span>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              showHistory && "rotate-180"
            )} />
          </Button>

          {/* Archives list */}
          {showHistory && archives.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-2 py-2">
              {archives.map((archive) => (
                <div
                  key={archive.id}
                  className="p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <button
                    type="button"
                    className="w-full flex items-center justify-between text-left"
                    onClick={() => setExpandedArchive(expandedArchive === archive.id ? null : archive.id)}
                  >
                    <div>
                      <p className="font-medium text-sm">{archive.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {archive.itemsCount} article{archive.itemsCount !== 1 ? 's' : ''} · {archive.totalEstimated.toFixed(2)}€
                      </p>
                    </div>
                    <ChevronRight className={cn(
                      "w-4 h-4 transition-transform text-muted-foreground",
                      expandedArchive === archive.id && "rotate-90"
                    )} />
                  </button>
                  
                  {expandedArchive === archive.id && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {archive.items.map((item, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span>{item.name} × {item.quantity}</span>
                            {item.estimatedPrice && (
                              <span>{(item.estimatedPrice * item.quantity).toFixed(2)}€</span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 text-destructive hover:text-destructive"
                        onClick={() => removeArchive(archive.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Supprimer
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showHistory && archives.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Aucun historique
            </p>
          )}

          {/* Action buttons */}
          {checkedCount > 0 && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={archiveChecked}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archiver
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 text-destructive hover:text-destructive"
                onClick={clearChecked}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
