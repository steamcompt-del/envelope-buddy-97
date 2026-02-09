import { useState, useRef, useCallback, useEffect } from 'react';
import { useBudget, Transaction } from '@/contexts/BudgetContext';
import { useReceipts } from '@/hooks/useReceipts';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Trash2, CalendarIcon, Loader2, Receipt } from 'lucide-react';
import { ReceiptGallery } from './ReceiptGallery';
import { TransactionNotesField } from './TransactionNotesField';
import { ReceiptItemsList } from './ReceiptItemsList';
import { toast } from 'sonner';

interface EditTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

export function EditTransactionSheet({
  open,
  onOpenChange,
  transaction,
}: EditTransactionSheetProps) {
  const { envelopes, updateTransaction, deleteTransaction } = useBudget();
  
  const [editAmount, setEditAmount] = useState('');
  const [editMerchant, setEditMerchant] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editEnvelopeId, setEditEnvelopeId] = useState<string>('');
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const receiptInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    receipts, 
    addReceipt, 
    removeReceipt,
    isLoading: isLoadingReceipts 
  } = useReceipts(transaction?.id);
  
  // Initialize form when transaction changes
  useEffect(() => {
    if (transaction && open) {
      setEditAmount(transaction.amount.toString().replace('.', ','));
      setEditMerchant(transaction.merchant || '');
      setEditDescription(transaction.description);
      setEditNotes(transaction.notes || '');
      setEditDate(new Date(transaction.date));
      setEditEnvelopeId(transaction.envelopeId);
    }
  }, [transaction, open]);
  
  const handleAddReceipt = useCallback(async () => {
    receiptInputRef.current?.click();
  }, []);
  
  const handleReceiptFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingReceipt(true);
    try {
      for (const file of files) {
        await addReceipt(file);
      }
    } catch (error) {
      console.error('Error adding receipt:', error);
      toast.error('Erreur lors de l\'ajout du ticket');
    } finally {
      setIsUploadingReceipt(false);
      if (receiptInputRef.current) {
        receiptInputRef.current.value = '';
      }
    }
  }, [addReceipt]);
  
  const handleSave = async () => {
    if (!transaction) return;
    
    const parsedAmount = parseFloat(editAmount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Montant invalide');
      return;
    }
    
    setIsSaving(true);
    try {
      await updateTransaction(transaction.id, {
        amount: parsedAmount,
        merchant: editMerchant || undefined,
        description: editDescription || 'Dépense',
        notes: editNotes || undefined,
        date: editDate ? editDate.toISOString() : undefined,
        envelopeId: editEnvelopeId !== transaction.envelopeId ? editEnvelopeId : undefined,
      });
      toast.success('Dépense modifiée');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (!transaction) return;
    
    if (confirm('Supprimer cette dépense ?')) {
      try {
        await deleteTransaction(transaction.id);
        toast.success('Dépense supprimée');
        onOpenChange(false);
      } catch (error) {
        console.error('Error deleting transaction:', error);
        toast.error('Erreur lors de la suppression');
      }
    }
  };
  
  if (!transaction) return null;
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <SheetTitle>Modifier la dépense</SheetTitle>
              <SheetDescription>
                {format(new Date(transaction.date), 'd MMMM yyyy', { locale: fr })}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        
        <div className="space-y-4 pb-6">
          {/* Hidden file input for receipts */}
          <input
            type="file"
            ref={receiptInputRef}
            onChange={handleReceiptFileChange}
            accept="image/*"
            multiple
            className="hidden"
          />
          
          {/* Envelope selector */}
          <div className="space-y-2">
            <Label>Enveloppe</Label>
            <Select value={editEnvelopeId} onValueChange={setEditEnvelopeId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {envelopes.map((env) => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Amount */}
          <div className="space-y-2">
            <Label>Montant</Label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="text-2xl font-semibold pr-12 rounded-xl"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                €
              </span>
            </div>
          </div>
          
          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal rounded-xl",
                    !editDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {editDate ? format(editDate, "d MMMM yyyy", { locale: fr }) : <span>Sélectionner</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={editDate}
                  onSelect={(date) => {
                    setEditDate(date);
                    setDatePopoverOpen(false);
                  }}
                  initialFocus
                  locale={fr}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Merchant & Description */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Marchand</Label>
              <Input
                type="text"
                placeholder="Ex: Carrefour"
                value={editMerchant}
                onChange={(e) => setEditMerchant(e.target.value)}
                className="rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                type="text"
                placeholder="Ex: Courses"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          
          {/* Notes */}
          <TransactionNotesField
            notes={editNotes}
            onSave={setEditNotes}
            isEditing={true}
          />
          
          {/* Receipts */}
          <div className="space-y-2">
            <Label>Tickets de caisse</Label>
            <ReceiptGallery
              receipts={receipts}
              onAdd={handleAddReceipt}
              onDelete={removeReceipt}
              isAdding={isUploadingReceipt}
              canEdit={true}
            />
          </div>
          
          {/* Receipt items detail */}
          {receipts.length > 0 && (
            <div className="space-y-2">
              {receipts.map((receipt) => (
                <ReceiptItemsList key={receipt.id} receipt={receipt} />
              ))}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={handleDelete}
              className="rounded-xl"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={!editEnvelopeId || !editAmount || parseFloat(editAmount.replace(',', '.')) <= 0 || isSaving || isUploadingReceipt}
              className="flex-1 rounded-xl"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
