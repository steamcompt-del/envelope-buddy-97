import { useState, useEffect, useCallback } from 'react';
import { useBudget } from '@/contexts/BudgetContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAI } from '@/hooks/useAI';
import { useReceiptScanner } from '@/hooks/useReceiptScanner';
import { uploadReceipt } from '@/lib/receiptStorage';
import { addReceiptDb } from '@/lib/receiptsDb';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Receipt, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { MultiReceiptUploader, PendingReceipt } from './MultiReceiptUploader';

interface AddExpenseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedEnvelopeId?: string;
}

export function AddExpenseDrawer({ 
  open, 
  onOpenChange,
  preselectedEnvelopeId 
}: AddExpenseDrawerProps) {
  const { envelopes, addTransaction } = useBudget();
  const { user } = useAuth();
  const { categorizeExpense, isLoading: isCategorizingAI } = useAI();
  const { scanReceipt, isScanning } = useReceiptScanner();
  
  const [selectedEnvelope, setSelectedEnvelope] = useState(preselectedEnvelopeId || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Auto-categorize when description changes (debounced)
  useEffect(() => {
    if (!description || description.length < 3 || selectedEnvelope || envelopes.length === 0) return;
    
    const timer = setTimeout(async () => {
      setIsCategorizing(true);
      const result = await categorizeExpense(description, envelopes);
      if (result?.envelopeId) {
        setSelectedEnvelope(result.envelopeId);
        toast.success(`Catégorie suggérée : ${result.category}`, { duration: 2000 });
      }
      setIsCategorizing(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, [description, envelopes, selectedEnvelope, categorizeExpense]);
  
  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      pendingReceipts.forEach(r => URL.revokeObjectURL(r.previewUrl));
    };
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !selectedEnvelope || !user) return;
    
    try {
      // First create the transaction
      const result = await addTransaction(
        selectedEnvelope, 
        parsedAmount, 
        description || 'Dépense', 
        merchant || undefined
      );
      
      // Then upload all receipts
      if (pendingReceipts.length > 0 && result.transactionId) {
        setIsUploading(true);
        try {
          for (let i = 0; i < pendingReceipts.length; i++) {
            const receipt = pendingReceipts[i];
            const uploadResult = await uploadReceipt(receipt.file, `${result.transactionId}_${i}`);
            // Save receipt to database
            await addReceiptDb(
              user.id,
              result.transactionId,
              uploadResult.url,
              uploadResult.path,
              receipt.file.name
            );
          }
          toast.success(`${pendingReceipts.length} ticket${pendingReceipts.length > 1 ? 's' : ''} sauvegardé${pendingReceipts.length > 1 ? 's' : ''} !`);
        } catch (error) {
          console.error('Failed to upload receipts:', error);
          toast.error('Erreur lors de la sauvegarde des tickets');
        } finally {
          setIsUploading(false);
        }
      }
      
      // Show budget alert if threshold crossed
      if (result.alert) {
        if (result.alert.isOver) {
          toast.error(`⚠️ ${result.alert.envelopeName} : Budget dépassé ! (${result.alert.percent}%)`, {
            duration: 5000,
          });
        } else {
          toast.warning(`⚠️ ${result.alert.envelopeName} : ${result.alert.percent}% du budget utilisé`, {
            duration: 4000,
          });
        }
      }
      
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add expense:', error);
      toast.error('Erreur lors de l\'ajout de la dépense');
    }
  };
  
  const resetForm = () => {
    setAmount('');
    setDescription('');
    setMerchant('');
    setSelectedEnvelope('');
    pendingReceipts.forEach(r => URL.revokeObjectURL(r.previewUrl));
    setPendingReceipts([]);
  };
  
  const handleAddReceipts = useCallback((files: File[]) => {
    const newReceipts: PendingReceipt[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingReceipts((prev) => [...prev, ...newReceipts]);
  }, []);

  const handleRemoveReceipt = useCallback((id: string) => {
    setPendingReceipts((prev) => {
      const receipt = prev.find((r) => r.id === id);
      if (receipt) {
        URL.revokeObjectURL(receipt.previewUrl);
      }
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  const handleScanReceipt = useCallback(async (file: File) => {
    const scannedData = await scanReceipt(file);
    
    if (scannedData) {
      // Auto-fill the form with scanned data
      setAmount(scannedData.amount.toString().replace('.', ','));
      setDescription(scannedData.description);
      setMerchant(scannedData.merchant);
      
      // Try to match category to envelope
      const matchingEnvelope = envelopes.find(
        env => env.name.toLowerCase() === scannedData.category.toLowerCase()
      );
      if (matchingEnvelope) {
        setSelectedEnvelope(matchingEnvelope.id);
      }
    }
  }, [scanReceipt, envelopes]);
  
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-md">
          <DrawerHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <DrawerTitle>Ajouter une dépense</DrawerTitle>
                <DrawerDescription>
                  Entrez manuellement ou scannez un ticket
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>
          
          <div className="p-4 pb-8">
            {/* Multi-receipt uploader */}
            <div className="mb-4">
              <MultiReceiptUploader
                pendingReceipts={pendingReceipts}
                onAddReceipts={handleAddReceipts}
                onRemoveReceipt={handleRemoveReceipt}
                onScanReceipt={handleScanReceipt}
                isScanning={isScanning}
                disabled={isUploading}
              />
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="expense-envelope">Enveloppe</Label>
                  {(isCategorizing || isCategorizingAI) && (
                    <span className="text-xs text-primary flex items-center gap-1">
                      <Sparkles className="w-3 h-3 animate-pulse" />
                      Catégorisation IA...
                    </span>
                  )}
                </div>
                <Select value={selectedEnvelope} onValueChange={setSelectedEnvelope}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {envelopes.map((env) => (
                      <SelectItem key={env.id} value={env.id}>
                        {env.name} ({(env.allocated - env.spent).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} restant)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="expense-amount">Montant</Label>
                <div className="relative">
                  <Input
                    id="expense-amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-2xl font-semibold pr-12 rounded-xl"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                    €
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="expense-merchant">Marchand</Label>
                  <Input
                    id="expense-merchant"
                    type="text"
                    placeholder="Ex: Carrefour"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expense-description">Description</Label>
                  <Input
                    id="expense-description"
                    type="text"
                    placeholder="Ex: Courses"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 rounded-xl"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedEnvelope || !amount || parseFloat(amount.replace(',', '.')) <= 0 || isUploading}
                  className="flex-1 rounded-xl bg-destructive hover:bg-destructive/90"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Upload...
                    </>
                  ) : (
                    'Dépenser'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
