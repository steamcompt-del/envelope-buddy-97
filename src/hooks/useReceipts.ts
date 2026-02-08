import { useState, useEffect, useCallback } from 'react';
import { Receipt, fetchReceiptsForTransaction, fetchReceiptsForTransactions, addReceiptDb, deleteReceiptDb } from '@/lib/receiptsDb';
import { uploadReceipt, deleteReceipt as deleteReceiptStorage } from '@/lib/receiptStorage';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useReceipts(transactionId?: string) {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch receipts for a single transaction
  const fetchReceipts = useCallback(async () => {
    if (!transactionId) return;
    
    setIsLoading(true);
    try {
      const data = await fetchReceiptsForTransaction(transactionId);
      setReceipts(data);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    if (transactionId) {
      fetchReceipts();
    }
  }, [transactionId, fetchReceipts]);

  // Add a new receipt
  const addReceipt = useCallback(async (file: File) => {
    if (!user || !transactionId) return null;

    try {
      // Generate unique ID for this receipt
      const receiptId = crypto.randomUUID();
      const uploadResult = await uploadReceipt(file, `${transactionId}_${receiptId}`);
      
      const newReceipt = await addReceiptDb(
        user.id,
        transactionId,
        uploadResult.url,
        uploadResult.path,
        file.name
      );
      
      setReceipts((prev) => [...prev, newReceipt]);
      toast.success('Ticket ajouté !');
      return newReceipt;
    } catch (error) {
      console.error('Error adding receipt:', error);
      toast.error('Erreur lors de l\'ajout du ticket');
      return null;
    }
  }, [user, transactionId]);

  // Delete a receipt
  const removeReceipt = useCallback(async (receiptId: string) => {
    const receipt = receipts.find((r) => r.id === receiptId);
    if (!receipt) return;

    try {
      // Delete from storage first
      await deleteReceiptStorage(receipt.path);
      // Then delete from database
      await deleteReceiptDb(receiptId);
      
      setReceipts((prev) => prev.filter((r) => r.id !== receiptId));
      toast.success('Ticket supprimé');
    } catch (error) {
      console.error('Error deleting receipt:', error);
      toast.error('Erreur lors de la suppression du ticket');
    }
  }, [receipts]);

  return {
    receipts,
    isLoading,
    addReceipt,
    removeReceipt,
    refresh: fetchReceipts,
  };
}

// Hook to fetch receipts for multiple transactions at once
export function useTransactionsReceipts(transactionIds: string[]) {
  const [receiptsMap, setReceiptsMap] = useState<Map<string, Receipt[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  
  // Stable string key for dependency tracking
  const idsKey = transactionIds.join(',');

  const fetchAll = useCallback(async () => {
    if (transactionIds.length === 0) {
      setReceiptsMap(new Map());
      return;
    }
    
    setIsLoading(true);
    try {
      const map = await fetchReceiptsForTransactions(transactionIds);
      setReceiptsMap(map);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const getReceiptsForTransaction = useCallback((transactionId: string): Receipt[] => {
    return receiptsMap.get(transactionId) || [];
  }, [receiptsMap]);

  return {
    receiptsMap,
    isLoading,
    getReceiptsForTransaction,
    refresh: fetchAll,
  };
}
