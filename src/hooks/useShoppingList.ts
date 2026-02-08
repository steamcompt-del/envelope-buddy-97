import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBudget } from '@/contexts/BudgetContext';
import { toast } from 'sonner';
import {
  ShoppingItem,
  ShoppingListArchive,
  fetchShoppingList,
  addShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  clearCheckedItems,
  getFrequentItems,
  archiveShoppingList,
  fetchArchives,
  deleteArchive,
  CreateShoppingItemInput,
} from '@/lib/shoppingListDb';

export function useShoppingList() {
  const { user } = useAuth();
  const { household } = useBudget();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [archives, setArchives] = useState<ShoppingListArchive[]>([]);
  const [frequentItems, setFrequentItems] = useState<Array<{ name: string; count: number; avgPrice: number }>>([]);
  const [loading, setLoading] = useState(true);

  const householdId = household?.id ?? null;

  const loadData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [listItems, frequent, archiveList] = await Promise.all([
        fetchShoppingList(householdId),
        getFrequentItems(householdId, 15),
        fetchArchives(householdId),
      ]);
      setItems(listItems);
      setFrequentItems(frequent);
      setArchives(archiveList);
    } catch (error) {
      console.error('Error loading shopping list:', error);
      toast.error('Erreur lors du chargement de la liste');
    } finally {
      setLoading(false);
    }
  }, [user, householdId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addItem = useCallback(async (input: CreateShoppingItemInput) => {
    if (!user) return;
    
    try {
      const newItem = await addShoppingItem(user.id, householdId, input);
      if (newItem) {
        setItems(prev => [newItem, ...prev]);
        toast.success('Article ajouté');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error("Erreur lors de l'ajout");
      throw error;
    }
  }, [user, householdId]);

  const toggleItem = useCallback(async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    try {
      await updateShoppingItem(itemId, { isChecked: !item.isChecked });
      setItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, isChecked: !i.isChecked } : i
      ).sort((a, b) => {
        if (a.isChecked !== b.isChecked) return a.isChecked ? 1 : -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }));
    } catch (error) {
      console.error('Error toggling item:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  }, [items]);

  const updateItem = useCallback(async (itemId: string, updates: { quantity?: number; estimatedPrice?: number | null }) => {
    try {
      await updateShoppingItem(itemId, updates);
      setItems(prev => prev.map(i =>
        i.id === itemId
          ? {
              ...i,
              quantity: updates.quantity ?? i.quantity,
              estimatedPrice: updates.estimatedPrice !== undefined ? updates.estimatedPrice : i.estimatedPrice,
            }
          : i
      ));
      toast.success('Article mis à jour');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    try {
      await deleteShoppingItem(itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
      toast.success('Article supprimé');
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Erreur lors de la suppression');
    }
  }, []);

  const clearChecked = useCallback(async () => {
    try {
      await clearCheckedItems(householdId);
      setItems(prev => prev.filter(i => !i.isChecked));
      toast.success('Articles cochés supprimés');
    } catch (error) {
      console.error('Error clearing checked items:', error);
      toast.error('Erreur lors de la suppression');
    }
  }, [householdId]);

  const archiveChecked = useCallback(async () => {
    if (!user) return;
    
    try {
      const archive = await archiveShoppingList(user.id, householdId, items);
      if (archive) {
        setArchives(prev => [archive, ...prev]);
        setItems(prev => prev.filter(i => !i.isChecked));
        toast.success('Liste archivée avec succès');
      }
    } catch (error) {
      console.error('Error archiving list:', error);
      toast.error("Erreur lors de l'archivage");
    }
  }, [user, householdId, items]);

  const removeArchive = useCallback(async (archiveId: string) => {
    try {
      await deleteArchive(archiveId);
      setArchives(prev => prev.filter(a => a.id !== archiveId));
      toast.success('Archive supprimée');
    } catch (error) {
      console.error('Error deleting archive:', error);
      toast.error('Erreur lors de la suppression');
    }
  }, []);

  const checkedCount = items.filter(i => i.isChecked).length;
  const uncheckedCount = items.filter(i => !i.isChecked).length;
  const estimatedTotal = items
    .filter(i => !i.isChecked)
    .reduce((sum, i) => sum + (i.estimatedPrice || 0) * i.quantity, 0);

  return {
    items,
    archives,
    frequentItems,
    loading,
    addItem,
    toggleItem,
    updateItem,
    removeItem,
    clearChecked,
    archiveChecked,
    removeArchive,
    refresh: loadData,
    checkedCount,
    uncheckedCount,
    estimatedTotal,
  };
}
