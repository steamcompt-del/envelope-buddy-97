import { useState, useEffect, useMemo } from 'react';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useAISuggestions } from '@/hooks/useAISuggestions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SwipeableRow } from './SwipeableRow';
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  Loader2,
  Package,
  Check,
  X,
  Archive,
  History,
  ChevronRight,
  ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShoppingListContentProps {
  storeMode?: boolean;
}

export function ShoppingListContent({ storeMode = false }: ShoppingListContentProps) {
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

  const {
    aiSuggestions,
    isLoadingAI,
    fetchAISuggestions,
    dismissSuggestion,
  } = useAISuggestions();

  const [newItemName, setNewItemName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const [itemsListOpen, setItemsListOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('1');
  const [editPrice, setEditPrice] = useState('0');
  const [showHistory, setShowHistory] = useState(false);
  const [expandedArchive, setExpandedArchive] = useState<string | null>(null);

  useEffect(() => {
    if (frequentItems.length > 0) {
      fetchAISuggestions(
        frequentItems,
        items.map(i => ({ name: i.name }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frequentItems.length]);

  // Sort items: unchecked first, checked at bottom (only in store mode)
  const sortedItems = useMemo(() => {
    if (!storeMode) return items;
    return [...items].sort((a, b) => {
      if (a.isChecked === b.isChecked) return 0;
      return a.isChecked ? 1 : -1;
    });
  }, [items, storeMode]);

  // Estimated total of unchecked items only
  const uncheckedTotal = useMemo(() => {
    return items
      .filter(i => !i.isChecked)
      .reduce((sum, i) => sum + (i.estimatedPrice || 0) * (i.quantity || 1), 0);
  }, [items]);

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
    if (storeMode) return; // Disable inline edit in store mode
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

  const availableSuggestions = frequentItems.filter(
    suggestion => !items.some(item => 
      item.name.toLowerCase() === suggestion.name.toLowerCase()
    )
  );

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
    } catch {
      // Error handled in hook
    } finally {
      setIsAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Add Item Form */}
      {!storeMode && (
        <form onSubmit={handleAddItem} className="space-y-3">
          <div className="relative">
            <Input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Ajouter un article..."
              disabled={isAdding}
              className="rounded-xl"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isAdding || !newItemName.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 gap-1"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>

          {autocompleteSuggestions.length > 0 && (
            <div className="bg-muted rounded-lg border p-2 space-y-1">
              {autocompleteSuggestions.map((suggestion) => (
                <button
                  key={suggestion.name}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-background transition-colors text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span>{suggestion.name}</span>
                    {suggestion.avgPrice > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ~{suggestion.avgPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </form>
      )}

      {/* Stats and Actions */}
      {items.length > 0 && !storeMode && (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-primary" />
              <span className="font-medium">
                {uncheckedCount} à acheter • {checkedCount} fait{checkedCount > 1 ? 's' : ''}
              </span>
            </div>
            <span className="font-semibold text-primary">
              {estimatedTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>

          {checkedCount > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={archiveChecked}
                className="flex-1 gap-1 rounded-xl"
              >
                <Archive className="w-4 h-4" />
                Archiver {checkedCount}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearChecked}
                className="flex-1 gap-1 rounded-xl"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Receipt-based Suggestions */}
      {availableSuggestions.length > 0 && !storeMode && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Achetés récemment
          </p>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.slice(0, 10).map((suggestion) => (
              <button
                key={suggestion.name}
                type="button"
                onClick={() => handleAddSuggestion(suggestion.name, suggestion.avgPrice)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-muted/50 hover:bg-primary/10 hover:border-primary/30 transition-colors text-sm"
              >
                <Plus className="w-3 h-3 text-primary" />
                <span>{suggestion.name}</span>
                {suggestion.avgPrice > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ~{suggestion.avgPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Items List */}
      {storeMode ? (
        /* ─── STORE MODE: flat list with swipe gestures ─── */
        <div className="space-y-2">
          {sortedItems.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Aucun article</p>
          ) : (
            <>
              {/* Counter header */}
              <div className="flex items-center justify-between px-1 mb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  {uncheckedCount} restant{uncheckedCount > 1 ? 's' : ''}
                </span>
                {checkedCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={archiveChecked}
                    className="text-xs gap-1 h-7"
                  >
                    <Archive className="w-3 h-3" />
                    Archiver ({checkedCount})
                  </Button>
                )}
              </div>

              {sortedItems.map((item) => (
                <SwipeableRow
                  key={item.id}
                  onEdit={() => toggleItem(item.id)}
                  onDelete={() => removeItem(item.id)}
                  editLabel="Fait"
                  editIcon={<Check className="w-5 h-5" />}
                  editClassName="bg-envelope-green text-white"
                >
                  <div
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl border transition-all',
                      item.isChecked
                        ? 'bg-muted/30 opacity-50 border-border/50'
                        : 'bg-card border-border'
                    )}
                    onClick={() => toggleItem(item.id)}
                  >
                    {/* Check indicator */}
                    <div className={cn(
                      'h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                      item.isChecked
                        ? 'bg-envelope-green border-envelope-green'
                        : 'border-muted-foreground/30'
                    )}>
                      {item.isChecked && <Check className="w-4 h-4 text-white" />}
                    </div>

                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-lg font-medium transition-all',
                        item.isChecked && 'line-through text-muted-foreground'
                      )}>
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.quantity > 1 && (
                          <span className="text-sm text-muted-foreground">×{item.quantity}</span>
                        )}
                        {item.estimatedPrice != null && item.estimatedPrice > 0 && (
                          <span className="text-sm text-muted-foreground">
                            {(item.estimatedPrice * (item.quantity || 1)).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </SwipeableRow>
              ))}
            </>
          )}
        </div>
      ) : (
        /* ─── NORMAL MODE: collapsible list ─── */
        <Collapsible open={itemsListOpen} onOpenChange={setItemsListOpen} className="space-y-2">
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between rounded-xl"
            >
              <span>Articles ({items.length})</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="h-[300px] rounded-xl border p-4">
              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Aucun article</p>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'p-3 rounded-xl border transition-colors',
                        item.isChecked ? 'bg-muted/50' : 'bg-background'
                      )}
                    >
                      {editingId === item.id ? (
                        <div className="space-y-3">
                          <p className="text-sm font-medium">{item.name}</p>
                          <div className="flex gap-2 items-end">
                            <div className="flex-1 space-y-1">
                              <label className="text-xs text-muted-foreground">Quantité</label>
                              <Input
                                type="number"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(e.target.value)}
                                min="1"
                                className="h-9 rounded-lg text-sm"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <label className="text-xs text-muted-foreground">Prix estimé (€)</label>
                              <Input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                min="0"
                                step="0.01"
                                className="h-9 rounded-lg text-sm"
                              />
                            </div>
                            <Button size="icon" onClick={handleSaveEdit} className="h-9 w-9 shrink-0 rounded-lg">
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="outline" onClick={handleCancelEdit} className="h-9 w-9 shrink-0 rounded-lg">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={item.isChecked}
                            onCheckedChange={() => toggleItem(item.id)}
                          />
                          <div className="flex-1 min-w-0" onClick={() => handleStartEdit(item)}>
                            <p className={cn('text-sm cursor-pointer', item.isChecked && 'line-through text-muted-foreground')}>
                              {item.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {item.quantity > 1 && (
                                <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                              )}
                              {item.estimatedPrice != null && item.estimatedPrice > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {item.estimatedPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeItem(item.id)}
                            className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Archives (hidden in store mode) */}
      {archives.length > 0 && !storeMode && (
        <Collapsible open={showHistory} onOpenChange={setShowHistory} className="space-y-2">
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between rounded-xl"
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" />
                <span>Historique ({archives.length})</span>
              </div>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2">
            {archives.map((archive) => (
              <Collapsible
                key={archive.id}
                open={expandedArchive === archive.id}
                onOpenChange={(open) => setExpandedArchive(open ? archive.id : null)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{archive.name}</span>
                      <Badge variant="outline">{archive.itemsCount} articles</Badge>
                      <span className="text-xs text-muted-foreground">
                        {archive.totalEstimated && archive.totalEstimated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2 pl-4 border-l">
                  {archive.items && Array.isArray(archive.items) && archive.items.map((item: any, idx: number) => (
                    <div key={idx} className="text-sm text-muted-foreground p-2 rounded hover:bg-muted">
                      {item.name}
                      {item.estimatedPrice && (
                        <span className="ml-2 font-medium text-foreground">
                          {item.estimatedPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                      )}
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeArchive(archive.id)}
                    className="w-full gap-1 rounded-lg mt-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    Supprimer
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {items.length === 0 && archives.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Pas encore de liste</p>
        </div>
      )}

      {/* ─── Floating Total Bar (Store Mode only) ─── */}
      {storeMode && items.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-40 px-4">
          <div className="container max-w-lg mx-auto">
            <div className="flex items-center justify-between px-5 py-3.5 rounded-2xl bg-card border shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">
                  {uncheckedCount} article{uncheckedCount > 1 ? 's' : ''} restant{uncheckedCount > 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-xl font-bold text-primary">
                {uncheckedTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
