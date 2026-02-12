import { useState, useMemo } from 'react';
import { useShoppingList } from '@/hooks/useShoppingList';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SwipeableRow } from './SwipeableRow';
import { motion, AnimatePresence } from 'framer-motion';
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
  ShoppingCart,
  Users
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

  const [newItemName, setNewItemName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('1');
  const [editPrice, setEditPrice] = useState('0');
  const [showHistory, setShowHistory] = useState(false);
  const [expandedArchive, setExpandedArchive] = useState<string | null>(null);

  const sortedItems = useMemo(() => {
    if (!storeMode) return items;
    return [...items].sort((a, b) => {
      if (a.isChecked === b.isChecked) return 0;
      return a.isChecked ? 1 : -1;
    });
  }, [items, storeMode]);

  const uncheckedTotal = useMemo(() => {
    return items
      .filter(i => !i.isChecked)
      .reduce((sum, i) => sum + (i.estimatedPrice || 0) * (i.quantity || 1), 0);
  }, [items]);

  const progressPercent = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

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
    if (storeMode) return;
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
    <div className="space-y-5">
      {/* Progress Header */}
      {items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                {checkedCount}/{items.length} article{items.length > 1 ? 's' : ''}
              </span>
              <Badge variant="outline" className="text-xs gap-1">
                <Users className="w-3 h-3" />
                Partagé
              </Badge>
            </div>
            <span className="text-lg font-bold text-primary">
              {estimatedTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
          {/* Progress bar */}
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{uncheckedCount} restant{uncheckedCount > 1 ? 's' : ''}</span>
            <span>{progressPercent}%</span>
          </div>
        </motion.div>
      )}

      {/* Add Item Form */}
      {!storeMode && (
        <form onSubmit={handleAddItem} className="relative">
          <div className="relative">
            <Input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Ajouter un article..."
              disabled={isAdding}
              className="rounded-xl pr-12 h-12 text-base"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isAdding || !newItemName.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg h-9 w-9"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>

          {autocompleteSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border rounded-xl shadow-lg overflow-hidden"
            >
              {autocompleteSuggestions.map((suggestion) => (
                <button
                  key={suggestion.name}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left px-4 py-3 hover:bg-muted transition-colors text-sm flex items-center justify-between"
                >
                  <span className="font-medium">{suggestion.name}</span>
                  {suggestion.avgPrice > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ~{suggestion.avgPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </form>
      )}

      {/* Actions */}
      {checkedCount > 0 && !storeMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex gap-2"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={archiveChecked}
            className="flex-1 gap-1.5 rounded-xl h-10"
          >
            <Archive className="w-4 h-4" />
            Archiver {checkedCount}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearChecked}
            className="flex-1 gap-1.5 rounded-xl h-10 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </Button>
        </motion.div>
      )}

      {/* Receipt-based Suggestions */}
      {availableSuggestions.length > 0 && !storeMode && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Achetés récemment
          </p>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.slice(0, 10).map((suggestion) => (
              <motion.button
                key={suggestion.name}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAddSuggestion(suggestion.name, suggestion.avgPrice)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border bg-card hover:bg-primary/10 hover:border-primary/30 transition-colors text-sm"
              >
                <Plus className="w-3 h-3 text-primary" />
                <span className="font-medium">{suggestion.name}</span>
                {suggestion.avgPrice > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ~{suggestion.avgPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Items List */}
      {storeMode ? (
        <div className="space-y-2">
          {sortedItems.length === 0 ? (
            <EmptyState />
          ) : (
            <>
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

              <AnimatePresence initial={false}>
                {sortedItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SwipeableRow
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
                        <div className={cn(
                          'h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                          item.isChecked
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground/30'
                        )}>
                          {item.isChecked && <Check className="w-4 h-4 text-primary-foreground" />}
                        </div>

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
                  </motion.div>
                ))}
              </AnimatePresence>
            </>
          )}
        </div>
      ) : (
        /* ─── NORMAL MODE ─── */
        <div className="space-y-2">
          {items.length === 0 ? (
            <EmptyState />
          ) : (
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    'p-3 rounded-xl border transition-colors',
                    item.isChecked ? 'bg-muted/40 border-border/50' : 'bg-card border-border'
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
                          <label className="text-xs text-muted-foreground">Prix (€)</label>
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
                      <button
                        onClick={() => toggleItem(item.id)}
                        className={cn(
                          'h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                          item.isChecked
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground/40 hover:border-primary'
                        )}
                      >
                        {item.isChecked && <Check className="w-3 h-3 text-primary-foreground" />}
                      </button>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleStartEdit(item)}>
                        <p className={cn('text-sm font-medium', item.isChecked && 'line-through text-muted-foreground')}>
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
                      {item.estimatedPrice != null && item.estimatedPrice > 0 && (
                        <span className="text-sm font-semibold text-primary whitespace-nowrap">
                          {(item.estimatedPrice * (item.quantity || 1)).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(item.id)}
                        className="h-7 w-7 shrink-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* Archives */}
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
              <ChevronDown className={cn("w-4 h-4 transition-transform", showHistory && "rotate-180")} />
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
                    className="w-full justify-between rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{archive.name}</span>
                      <Badge variant="outline" className="text-xs">{archive.itemsCount}</Badge>
                      {archive.totalEstimated > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {archive.totalEstimated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                      )}
                    </div>
                    <ChevronRight className={cn("w-4 h-4 transition-transform", expandedArchive === archive.id && "rotate-90")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-1 pl-4 border-l-2 border-primary/20">
                  {archive.items && Array.isArray(archive.items) && archive.items.map((item: any, idx: number) => (
                    <div key={idx} className="text-sm text-muted-foreground p-2 rounded-lg hover:bg-muted/50 flex justify-between">
                      <span>{item.name}</span>
                      {item.estimatedPrice > 0 && (
                        <span className="font-medium text-foreground">
                          {item.estimatedPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                      )}
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeArchive(archive.id)}
                    className="w-full gap-1 rounded-lg mt-1 text-destructive/70 hover:text-destructive"
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

      {items.length === 0 && archives.length === 0 && !storeMode && (
        <EmptyState />
      )}

      {/* Floating Total Bar (Store Mode only) */}
      {storeMode && items.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-40 px-4">
          <div className="container max-w-lg mx-auto">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center justify-between px-5 py-3.5 rounded-2xl bg-card border shadow-lg backdrop-blur-sm"
            >
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">
                  {uncheckedCount} article{uncheckedCount > 1 ? 's' : ''} restant{uncheckedCount > 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-xl font-bold text-primary">
                {uncheckedTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-16"
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
        <ShoppingCart className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <p className="text-muted-foreground font-medium">Liste vide</p>
      <p className="text-sm text-muted-foreground/70 mt-1">Ajoutez des articles pour commencer</p>
    </motion.div>
  );
}
