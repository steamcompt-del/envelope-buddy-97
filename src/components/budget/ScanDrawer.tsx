import { useState, useCallback } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { MultiReceiptUploader, PendingReceipt } from './MultiReceiptUploader';
import { useReceiptScanner, type ScanResult } from '@/hooks/useReceiptScanner';
import { useBudget } from '@/contexts/BudgetContext';
import type { ScannedExpenseData } from './AddExpenseDrawer';

interface ScanDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanComplete: (data: ScannedExpenseData) => void;
}

export function ScanDrawer({ open, onOpenChange, onScanComplete }: ScanDrawerProps) {
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([]);
  const { scanReceipt, isScanning, progress } = useReceiptScanner();
  const { envelopes } = useBudget();

  const handleAddReceipts = useCallback((files: File[]) => {
    const newReceipts: PendingReceipt[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingReceipts(prev => [...prev, ...newReceipts]);
  }, []);

  const handleRemoveReceipt = useCallback((id: string) => {
    setPendingReceipts(prev => {
      const removed = prev.find(r => r.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter(r => r.id !== id);
    });
  }, []);

  const handleScanReceipt = useCallback(async (file: File) => {
    const result = await scanReceipt(file);
    if (!result) return;

    const { data: scannedData } = result;
    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const catNorm = normalize(scannedData.category);
    const matchingEnvelope = envelopes.find(
      env => normalize(env.name) === catNorm
    ) || envelopes.find(
      env => normalize(env.name).includes(catNorm) || catNorm.includes(normalize(env.name))
    );

    // Close drawer and open expense form with scanned data
    onOpenChange(false);
    setPendingReceipts([]);
    onScanComplete({
      amount: scannedData.amount,
      description: scannedData.description,
      merchant: scannedData.merchant,
      envelopeId: matchingEnvelope?.id,
      receiptFile: file,
    });
  }, [scanReceipt, envelopes, onOpenChange, onScanComplete]);

  const handleClose = useCallback((open: boolean) => {
    if (!open) {
      pendingReceipts.forEach(r => URL.revokeObjectURL(r.previewUrl));
      setPendingReceipts([]);
    }
    onOpenChange(open);
  }, [pendingReceipts, onOpenChange]);

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Scanner un ticket</DrawerTitle>
          <DrawerDescription>
            Prenez une photo ou sélectionnez une image de votre ticket de caisse
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6">
          <MultiReceiptUploader
            pendingReceipts={pendingReceipts}
            onAddReceipts={handleAddReceipts}
            onRemoveReceipt={handleRemoveReceipt}
            onScanReceipt={handleScanReceipt}
            isScanning={isScanning}
            scanProgress={progress}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
