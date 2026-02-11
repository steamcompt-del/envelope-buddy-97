import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useBudget } from '@/contexts/BudgetContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/hooks/useHousehold';
import { useAI } from '@/hooks/useAI';
import { useReceiptScanner, ScannedReceiptItem, type ScanResult } from '@/hooks/useReceiptScanner';
import { uploadReceipt } from '@/lib/receiptStorage';
import { addReceiptDb } from '@/lib/receiptsDb';
import { addReceiptItems } from '@/lib/receiptItemsDb';
import { createTransactionSplits, adjustSpentForSplits, SplitInput } from '@/lib/transactionSplitsDb';
import { ReceiptValidationDialog } from './ReceiptValidationDialog';
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
import { Switch } from '@/components/ui/switch';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Receipt, Sparkles, CalendarIcon, Plus, X, Split, AlertCircle } from 'lucide-react';
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

interface SplitLine {
  id: string;
  envelopeId: string;
  amount: string;
}

const fmt = (v: number) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export function AddExpenseDrawer({ 
  open, 
  onOpenChange,
  preselectedEnvelopeId,
  scannedData,
}: AddExpenseDrawerProps) {
  const { envelopes, addTransaction, refreshData, currentMonthKey } = useBudget();
  const { user } = useAuth();
  const { household } = useHousehold();
  const { categorizeExpense, isLoading: isCategorizingAI } = useAI();
  const envelopeNames = envelopes.map(e => e.name);
  const { scanReceipt, isScanning } = useReceiptScanner(envelopeNames);
  
  const [selectedEnvelope, setSelectedEnvelope] = useState(preselectedEnvelopeId || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceiptWithItems[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  
  // Validation dialog state
  const [showValidation, setShowValidation] = useState(false);
  const [pendingScanResult, setPendingScanResult] = useState<ScanResult | null>(null);
  const [pendingScanFile, setPendingScanFile] = useState<File | null>(null);
  
  // Split state
  const [isSplit, setIsSplit] = useState(false);
  const [splitLines, setSplitLines] = useState<SplitLine[]>([
    { id: crypto.randomUUID(), envelopeId: '', amount: '' },
    { id: crypto.randomUUID(), envelopeId: '', amount: '' },
  ]);
  
  const parsedAmount = useMemo(() => parseFloat(amount.replace(',', '.')) || 0, [amount]);
  
  const splitTotal = useMemo(() => {
    return splitLines.reduce((sum, l) => sum + (parseFloat(l.amount.replace(',', '.')) || 0), 0);
  }, [splitLines]);
  
  const splitRemaining = parsedAmount - splitTotal;
  const splitValid = Math.abs(Math.round(splitRemaining * 100)) === 0 && splitLines.every(l => l.envelopeId && (parseFloat(l.amount.replace(',', '.')) || 0) > 0);
  
  // Pre-fill form with scanned data when provided
  useEffect(() => {
    if (scannedData && open) {
      setAmount(scannedData.amount.toString().replace('.', ','));
      setDescription(scannedData.description);
      setMerchant(scannedData.merchant);
      if (scannedData.envelopeId) {
        setSelectedEnvelope(scannedData.envelopeId);
      }
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
    if (!description || description.length < 3 || selectedEnvelope || envelopes.length === 0 || isSplit) return;
    
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
  }, [description, envelopes, selectedEnvelope, categorizeExpense, isSplit]);
  
  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      pendingReceipts.forEach(r => URL.revokeObjectURL(r.previewUrl));
    };
  }, []);

  const handleAddSplitLine = () => {
    setSplitLines(prev => [...prev, { id: crypto.randomUUID(), envelopeId: '', amount: '' }]);
  };

  const handleRemoveSplitLine = (id: string) => {
    if (splitLines.length <= 2) return;
    setSplitLines(prev => prev.filter(l => l.id !== id));
  };

  const handleSplitLineChange = (id: string, field: 'envelopeId' | 'amount', value: string) => {
    setSplitLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleDistributeEvenly = () => {
    if (parsedAmount <= 0 || splitLines.length === 0) return;
    const perLine = Math.floor((parsedAmount / splitLines.length) * 100) / 100;
    const remainder = Math.round((parsedAmount - perLine * splitLines.length) * 100) / 100;
    setSplitLines(prev => prev.map((l, i) => ({
      ...l,
      amount: (i === 0 ? perLine + remainder : perLine).toString().replace('.', ','),
    })));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (parsedAmount <= 0) return;
    
    if (isSplit) {
      if (!splitValid) return;
    } else {
      if (!selectedEnvelope) return;
    }
    
    try {
      const dateString = selectedDate ? selectedDate.toISOString().split('T')[0] : undefined;
      
      if (isSplit) {
        const splits: SplitInput[] = splitLines.map(l => ({
          envelopeId: l.envelopeId,
          amount: parseFloat(l.amount.replace(',', '.')) || 0,
        }));

        // Validation : somme des splits = montant total
        const splitsSum = splits.reduce((sum, s) => sum + s.amount, 0);
        const diff = Math.abs(splitsSum - parsedAmount);
        if (diff > 0.01) {
          toast.error(`Erreur : Répartition (${splitsSum.toFixed(2)}€) ≠ Total (${parsedAmount.toFixed(2)}€)`);
          return;
        }

        // Create ONE parent transaction with the first split's envelope
        const primarySplit = splits[0];
        const result = await addTransaction(
          primarySplit.envelopeId,
          parsedAmount,
          description || 'Dépense',
          merchant || undefined,
          undefined,
          undefined,
          dateString
        );

        const parentTxId = result.transactionId;

        // Mark as split
        const supabase = (await import('@/lib/backendClient')).getBackendClient();
        await supabase
          .from('transactions')
          .update({ is_split: true })
          .eq('id', parentTxId);

        // Create split records
        await createTransactionSplits(
          user.id,
          household?.id || null,
          parentTxId,
          parsedAmount,
          splits
        );

        // Adjust spent: addTransaction added primarySplit.amount to primary envelope
        // We need to redistribute across all split envelopes
        await adjustSpentForSplits(
          user.id,
          household?.id || null,
          currentMonthKey,
          primarySplit.envelopeId,
          parsedAmount,
          splits
        );

        await refreshData();
        await uploadReceiptsForTransaction(parentTxId);
        toast.success('Dépense fractionnée enregistrée !');
      } else {
        const result = await addTransaction(
          selectedEnvelope, 
          parsedAmount, 
          description || 'Dépense', 
          merchant || undefined,
          undefined,
          undefined,
          dateString
        );
        
        await uploadReceiptsForTransaction(result.transactionId);
        
        if (result.alert) {
          if (result.alert.isOver) {
            toast.error(`⚠️ ${result.alert.envelopeName} : Budget dépassé ! (${result.alert.percent}%)`, { duration: 5000 });
          } else {
            toast.warning(`⚠️ ${result.alert.envelopeName} : ${result.alert.percent}% du budget utilisé`, { duration: 4000 });
          }
        }
      }
      
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add expense:', error);
      toast.error('Erreur lors de l\'ajout de la dépense');
    }
  };

  const uploadReceiptsForTransaction = async (transactionId: string) => {
    if (pendingReceipts.length === 0 || !user) return;
    setIsUploading(true);
    try {
      for (let i = 0; i < pendingReceipts.length; i++) {
        const receipt = pendingReceipts[i];
        const uploadResult = await uploadReceipt(receipt.file, `${transactionId}_${i}`);
        const savedReceipt = await addReceiptDb(
          user.id,
          transactionId,
          uploadResult.url,
          uploadResult.path,
          receipt.file.name,
          household?.id || null
        );
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
  };
  
  const resetForm = () => {
    setAmount('');
    setDescription('');
    setMerchant('');
    setSelectedEnvelope('');
    setSelectedDate(new Date());
    setIsSplit(false);
    setSplitLines([
      { id: crypto.randomUUID(), envelopeId: '', amount: '' },
      { id: crypto.randomUUID(), envelopeId: '', amount: '' },
    ]);
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
    const scanResult = await scanReceipt(file);
    
    if (scanResult) {
      // If there are warnings, show validation dialog
      if (scanResult.warnings.length > 0) {
        setPendingScanResult(scanResult);
        setPendingScanFile(file);
        setShowValidation(true);
      } else {
        applyScanResult(scanResult, file);
      }
    }
  }, [scanReceipt]);

  const applyScanResult = useCallback((scanResult: ScanResult, file?: File | null, correctedItems?: ScannedReceiptItem[]) => {
    const { data: scannedData } = scanResult;
    setAmount(scannedData.amount.toString().replace('.', ','));
    setDescription(scannedData.description);
    setMerchant(scannedData.merchant);

    // Fuzzy envelope matching
    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const catNorm = normalize(scannedData.category);
    const matchingEnvelope = envelopes.find(env => normalize(env.name) === catNorm)
      || envelopes.find(env => normalize(env.name).includes(catNorm) || catNorm.includes(normalize(env.name)));
    if (matchingEnvelope) {
      setSelectedEnvelope(matchingEnvelope.id);
      toast.success(`📂 Catégorie détectée : ${matchingEnvelope.name}`, { duration: 2000 });
    } else if (scannedData.category) {
      toast.info(`Catégorie "${scannedData.category}" non trouvée. Sélectionnez manuellement.`);
    }

    const items = correctedItems || scannedData.items;
    if (items && items.length > 0) {
      setPendingReceipts((prev) => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        const lastReceipt = updated[updated.length - 1];
        if (lastReceipt) {
          lastReceipt.scannedItems = items;
        }
        return updated;
      });
      toast.success(`${items.length} article(s) détecté(s) sur le ticket`, { duration: 3000 });
    }
  }, [envelopes]);

  const handleValidationAccept = useCallback((correctedItems: ScannedReceiptItem[]) => {
    if (pendingScanResult) {
      applyScanResult(pendingScanResult, pendingScanFile, correctedItems);
    }
    setShowValidation(false);
    setPendingScanResult(null);
    setPendingScanFile(null);
  }, [pendingScanResult, pendingScanFile, applyScanResult]);

  const handleValidationReject = useCallback(() => {
    setShowValidation(false);
    setPendingScanResult(null);
    setPendingScanFile(null);
  }, []);

  const canSubmit = isSplit
    ? parsedAmount > 0 && splitValid && !isUploading
    : !!selectedEnvelope && parsedAmount > 0 && !isUploading;
  
  return (
    <>
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
          
          <div className="p-4 pb-8 overflow-y-auto max-h-[70vh]">
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
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="expense-amount">Montant total</Label>
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

              {/* Split toggle - divide expense across envelopes */}
              {envelopes.length >= 2 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <Label htmlFor="split-toggle" className="flex items-center gap-2 cursor-pointer text-sm">
                    <Split className="w-4 h-4 text-muted-foreground" />
                    Diviser entre plusieurs enveloppes
                  </Label>
                  <Switch
                    id="split-toggle"
                    checked={isSplit}
                    onCheckedChange={setIsSplit}
                  />
                </div>
              )}

              {/* Envelope selection - single or split */}
              {isSplit ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Répartition</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDistributeEvenly}
                      className="text-xs text-primary h-auto py-1"
                      disabled={parsedAmount <= 0}
                    >
                      Répartir également
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {splitLines.map((line, index) => (
                      <div key={line.id} className="flex items-center gap-2">
                        <Select
                          value={line.envelopeId}
                          onValueChange={(v) => handleSplitLineChange(line.id, 'envelopeId', v)}
                        >
                          <SelectTrigger className="rounded-xl flex-1 h-9 text-sm">
                            <SelectValue placeholder="Enveloppe" />
                          </SelectTrigger>
                          <SelectContent>
                            {envelopes.map((env) => (
                              <SelectItem key={env.id} value={env.id}>
                                {env.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="relative w-24">
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={line.amount}
                            onChange={(e) => handleSplitLineChange(line.id, 'amount', e.target.value)}
                            className="rounded-xl h-9 text-sm pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">€</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSplitLine(line.id)}
                          className="h-9 w-9 shrink-0"
                          disabled={splitLines.length <= 2}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSplitLine}
                    className="w-full rounded-xl gap-1 text-xs"
                  >
                    <Plus className="w-3 h-3" />
                    Ajouter une enveloppe
                  </Button>

                  {/* Split summary */}
                  {parsedAmount > 0 && (
                    <div className="rounded-xl border p-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total alloué</span>
                        <span className={cn("font-medium", Math.abs(Math.round(splitRemaining * 100)) === 0 ? "text-envelope-green" : "text-muted-foreground")}>
                          {fmt(splitTotal)} / {fmt(parsedAmount)}
                        </span>
                      </div>
                      {Math.round(splitRemaining * 100) !== 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Reste à allouer</span>
                          <span className={cn("font-medium", splitRemaining < 0 ? "text-destructive" : "text-primary")}>
                            {fmt(splitRemaining)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {splitRemaining < 0 && (
                    <Alert variant="destructive" className="rounded-xl py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        La somme des montants dépasse le total de {fmt(Math.abs(splitRemaining))}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
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
                          {env.name} ({fmt(env.allocated - env.spent)} restant)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Date */}
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

              {/* Future date warning */}
              {selectedDate && selectedDate > new Date() && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    ⚠️ La date sélectionnée est dans le futur
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Merchant & Description */}
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
                  disabled={!canSubmit}
                  className="flex-1 rounded-xl bg-destructive hover:bg-destructive/90"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Upload...
                    </>
                  ) : isSplit ? (
                    <>
                      <Split className="w-4 h-4 mr-2" />
                      Diviser
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

    {/* Validation dialog for scan results */}
    {pendingScanResult && (
      <ReceiptValidationDialog
        open={showValidation}
        onOpenChange={setShowValidation}
        scannedData={pendingScanResult.data}
        warnings={pendingScanResult.warnings}
        onAccept={handleValidationAccept}
        onReject={handleValidationReject}
      />
    )}
    </>
  );
}
