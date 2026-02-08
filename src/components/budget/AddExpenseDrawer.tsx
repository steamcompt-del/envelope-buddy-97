import { useState, useEffect, useCallback, useRef } from 'react';
import { useBudget } from '@/contexts/BudgetContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/hooks/useHousehold';
import { useAI } from '@/hooks/useAI';
import { useReceiptScanner, ScannedReceiptItem } from '@/hooks/useReceiptScanner';
import { uploadReceipt } from '@/lib/receiptStorage';
import { addReceiptDb } from '@/lib/receiptsDb';
import { addReceiptItems } from '@/lib/receiptItemsDb';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Receipt, Sparkles, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { MultiReceiptUploader, PendingReceipt } from './MultiReceiptUploader';

interface PendingReceiptWithItems extends PendingReceipt {
  scannedItems?: ScannedReceiptItem[];
}

export interface ScannedExpenseData {
  amount: number;
  description: string;
  merchant: string;
  envelopeId?: string;
  receiptFile?: File;
}

interface AddExpenseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedEnvelopeId?: string;
  scannedData?: ScannedExpenseData | null;
}

export function AddExpenseDrawer({ 
  open, 
  onOpenChange,
  preselectedEnvelopeId,
  scannedData,
}: AddExpenseDrawerProps) {
  const { envelopes, addTransaction } = useBudget();
  const { user } = useAuth();
  const { household } = useHousehold();
  const { categorizeExpense, isLoading: isCategorizingAI } = useAI();
  const { scanReceipt, isScanning } = useReceiptScanner();
  
   const [selectedEnvelope, setSelectedEnvelope] = useState(preselectedEnvelopeId || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceiptWithItems[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  
  // Pre-fill form with scanned data when provided
  useEffect(() => {
    if (scannedData && open) {
      setAmount(scannedData.amount.toString().replace('.', ','));
      setDescription(scannedData.description);
      setMerchant(scannedData.merchant);
      if (scannedData.envelopeId) {
        setSelectedEnvelope(scannedData.envelopeId);
      }
      // Add the scanned receipt file to pending receipts
      if (scannedData.receiptFile) {
        const newReceipt: PendingReceiptWithItems = {
          id: crypto.randomUUID(),
          file: scannedData.receiptFile,
          previewUrl: URL.createObjectURL(scannedData.receiptFile),
          scannedItems: [],
        };
        setPendingReceipts([newReceipt]);
      }
    }
  }, [scannedData, open]);
  
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
      const dateString = selectedDate ? selectedDate.toISOString().split('T')[0] : undefined;
      const result = await addTransaction(
        selectedEnvelope, 
        parsedAmount, 
        description || 'Dépense', 
        merchant || undefined,
        undefined,
        undefined,
        dateString
      );
      
      // Then upload all receipts and their items
      if (pendingReceipts.length > 0 && result.transactionId) {
        setIsUploading(true);
        try {
          for (let i = 0; i < pendingReceipts.length; i++) {
            const receipt = pendingReceipts[i];
            const uploadResult = await uploadReceipt(receipt.file, `${result.transactionId}_${i}`);
            // Save receipt to database with household_id
            const savedReceipt = await addReceiptDb(
              user.id,
              result.transactionId,
              uploadResult.url,
              uploadResult.path,
              receipt.file.name,
              household?.id || null
            );
            
            // Save receipt items if available
            if (receipt.scannedItems && receipt.scannedItems.length > 0) {
              await addReceiptItems(
                user.id,
                savedReceipt.id,
                household?.id || null,
                receipt.scannedItems.map(item => ({
                  name: item.name,
                  quantity: item.quantity,
                  unitPrice: item.unit_price,
                  totalPrice: item.total_price,
                }))
              );
            }
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
    setSelectedDate(new Date());
    pendingReceipts.forEach(r => URL.revokeObjectURL(r.previewUrl));
    setPendingReceipts([]);
  };
  
  const handleAddReceipts = useCallback((files: File[]) => {
    const newReceipts: PendingReceiptWithItems[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      scannedItems: [],
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
      
      // Store scanned items with the first pending receipt
      if (scannedData.items && scannedData.items.length > 0) {
        setPendingReceipts((prev) => {
          if (prev.length === 0) return prev;
          const updated = [...prev];
          // Find the receipt for this file and add items to it
          const lastReceipt = updated[updated.length - 1];
          if (lastReceipt) {
            lastReceipt.scannedItems = scannedData.items;
          }
          return updated;
        });
        toast.success(`${scannedData.items.length} article(s) détecté(s) sur le ticket`, { duration: 3000 });
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
              
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal rounded-xl",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "d MMMM yyyy", { locale: fr }) : <span>Sélectionner une date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setDatePopoverOpen(false);
                      }}
                      initialFocus
                      locale={fr}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
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
