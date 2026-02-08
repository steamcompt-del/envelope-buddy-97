import { useState, useRef } from 'react';
import { useBudget, Envelope, Transaction } from '@/contexts/BudgetContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  ShoppingCart, Utensils, Car, Gamepad2, Heart, ShoppingBag, 
  Receipt, PiggyBank, Home, Plane, Gift, Music, Wifi, Smartphone, 
  Coffee, Wallet, Trash2, ArrowRightLeft, Plus, Minus, Pencil, Check, X, ImageIcon, Upload
} from 'lucide-react';
import { ComponentType } from 'react';

interface EnvelopeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelopeId: string;
  onTransfer: () => void;
  onAddExpense: () => void;
}

// Icon mapping for type safety
const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  ShoppingCart, Utensils, Car, Gamepad2, Heart, ShoppingBag, 
  Receipt, PiggyBank, Home, Plane, Gift, Music, Wifi, Smartphone, 
  Coffee, Wallet,
};

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] || Wallet;
  return <Icon className={className} />;
}

// Color mapping
const colorClasses: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-envelope-blue/15', text: 'text-envelope-blue' },
  green: { bg: 'bg-envelope-green/15', text: 'text-envelope-green' },
  orange: { bg: 'bg-envelope-orange/15', text: 'text-envelope-orange' },
  pink: { bg: 'bg-envelope-pink/15', text: 'text-envelope-pink' },
  purple: { bg: 'bg-envelope-purple/15', text: 'text-envelope-purple' },
  yellow: { bg: 'bg-envelope-yellow/15', text: 'text-envelope-yellow' },
  red: { bg: 'bg-envelope-red/15', text: 'text-envelope-red' },
  teal: { bg: 'bg-envelope-teal/15', text: 'text-envelope-teal' },
};

export function EnvelopeDetailsDialog({ 
  open, 
  onOpenChange, 
  envelopeId,
  onTransfer,
  onAddExpense
}: EnvelopeDetailsDialogProps) {
  const { envelopes, transactions, toBeBudgeted, allocateToEnvelope, deallocateFromEnvelope, deleteEnvelope, updateTransaction, deleteTransaction } = useBudget();
  const [allocateAmount, setAllocateAmount] = useState('');
  const [showAllocate, setShowAllocate] = useState(false);
  const [allocateMode, setAllocateMode] = useState<'add' | 'remove'>('add');
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editMerchant, setEditMerchant] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editReceiptUrl, setEditReceiptUrl] = useState<string | null>(null);
  const [editReceiptPath, setEditReceiptPath] = useState<string | null>(null);
  const [editReceiptPreview, setEditReceiptPreview] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  
  const envelope = envelopes.find(e => e.id === envelopeId);
  if (!envelope) return null;
  
  const remaining = envelope.allocated - envelope.spent;
  const percentUsed = envelope.allocated > 0 ? (envelope.spent / envelope.allocated) * 100 : 0;
  const isOverspent = envelope.spent > envelope.allocated;
  const colorStyle = colorClasses[envelope.color] || colorClasses.blue;
  
  // Get recent transactions for this envelope
  const envelopeTransactions = transactions
    .filter(t => t.envelopeId === envelopeId)
    .slice(-5)
    .reverse();
  
  const handleAllocate = async () => {
    const parsedAmount = parseFloat(allocateAmount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    
    if (allocateMode === 'add') {
      if (parsedAmount <= toBeBudgeted) {
        await allocateToEnvelope(envelopeId, parsedAmount);
      }
    } else {
      await deallocateFromEnvelope(envelopeId, parsedAmount);
    }
    
    setAllocateAmount('');
    setShowAllocate(false);
  };
  
  const handleDelete = async () => {
    if (confirm(`Supprimer l'enveloppe "${envelope.name}" ?`)) {
      await deleteEnvelope(envelopeId);
      onOpenChange(false);
    }
  };
  
  const startEditTransaction = (t: Transaction) => {
    setEditingTransaction(t.id);
    setEditAmount(t.amount.toString().replace('.', ','));
    setEditMerchant(t.merchant || '');
    setEditDescription(t.description);
    setEditReceiptUrl(t.receiptUrl || null);
    setEditReceiptPath(t.receiptPath || null);
    setEditReceiptPreview(null);
  };
  
  const cancelEditTransaction = () => {
    setEditingTransaction(null);
    setEditAmount('');
    setEditMerchant('');
    setEditDescription('');
    setEditReceiptUrl(null);
    setEditReceiptPath(null);
    setEditReceiptPreview(null);
  };
  
  const saveEditTransaction = async (id: string) => {
    const parsedAmount = parseFloat(editAmount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    
    await updateTransaction(id, {
      amount: parsedAmount,
      merchant: editMerchant || undefined,
      description: editDescription || 'Dépense',
      receiptUrl: editReceiptUrl || undefined,
      receiptPath: editReceiptPath || undefined,
    });
    cancelEditTransaction();
  };
  
  const handleDeleteTransaction = async (id: string) => {
    if (confirm('Supprimer cette dépense ?')) {
      await deleteTransaction(id);
    }
  };

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const url = URL.createObjectURL(file);
    setEditReceiptPreview(url);

    // Upload the new receipt
    setIsUploadingReceipt(true);
    try {
      const { uploadReceipt, deleteReceipt } = await import('@/lib/receiptStorage');
      
      // Delete old receipt if exists
      if (editReceiptPath) {
        try {
          await deleteReceipt(editReceiptPath);
        } catch (error) {
          console.error('Failed to delete old receipt:', error);
        }
      }

      // Upload new receipt
      const uploadResult = await uploadReceipt(file, editingTransaction || 'temp');
      setEditReceiptUrl(uploadResult.url);
      setEditReceiptPath(uploadResult.path);
    } catch (error) {
      console.error('Error uploading receipt:', error);
      const { toast } = await import('sonner');
      toast.error('Erreur lors de l\'upload du ticket');
      setEditReceiptPreview(null);
    } finally {
      setIsUploadingReceipt(false);
      if (receiptInputRef.current) {
        receiptInputRef.current.value = '';
      }
    }
  };

  const handleRemoveReceipt = async () => {
    if (!editReceiptPath) return;
    
    if (confirm('Supprimer le ticket de caisse ?')) {
      try {
        const { deleteReceipt } = await import('@/lib/receiptStorage');
        await deleteReceipt(editReceiptPath);
        setEditReceiptUrl(null);
        setEditReceiptPath(null);
        setEditReceiptPreview(null);
      } catch (error) {
        console.error('Error deleting receipt:', error);
        const { toast } = await import('sonner');
        toast.error('Erreur lors de la suppression du ticket');
      }
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              colorStyle.bg
            )}>
              <DynamicIcon name={envelope.icon} className={cn("w-6 h-6", colorStyle.text)} />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{envelope.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {envelope.spent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} dépensé sur {envelope.allocated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Balance display */}
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-1">Restant</p>
            <p className={cn(
              "text-4xl font-bold",
              isOverspent ? "text-destructive" : "text-foreground"
            )}>
              {remaining.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
          
          {/* Progress bar */}
          <div>
            <Progress 
              value={Math.min(percentUsed, 100)} 
              className={cn(
                "h-3",
                isOverspent && "[&>div]:bg-destructive"
              )}
            />
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>{Math.round(percentUsed)}% utilisé</span>
              {isOverspent && (
                <span className="text-destructive font-medium">Dépassé !</span>
              )}
            </div>
          </div>
          
          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowAllocate(true); setAllocateMode('add'); }}
              className="rounded-xl flex-col h-auto py-3"
            >
              <Plus className="w-4 h-4 mb-1" />
              <span className="text-xs">Allouer</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowAllocate(true); setAllocateMode('remove'); }}
              className="rounded-xl flex-col h-auto py-3"
              disabled={remaining <= 0}
            >
              <Minus className="w-4 h-4 mb-1" />
              <span className="text-xs">Retirer</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { onOpenChange(false); onTransfer(); }}
              className="rounded-xl flex-col h-auto py-3"
            >
              <ArrowRightLeft className="w-4 h-4 mb-1" />
              <span className="text-xs">Transférer</span>
            </Button>
          </div>
          
          {/* Allocate/Deallocate form */}
          {showAllocate && (
            <div className="p-3 bg-muted rounded-xl space-y-3">
              <Label>
                {allocateMode === 'add' 
                  ? `Ajouter (max: ${toBeBudgeted.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })})`
                  : `Retirer (max: ${remaining.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })})`
                }
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={allocateAmount}
                    onChange={(e) => setAllocateAmount(e.target.value)}
                    className="pr-8 rounded-lg"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                </div>
                <Button
                  onClick={handleAllocate}
                  size="sm"
                  className="rounded-lg"
                  disabled={
                    !allocateAmount || 
                    parseFloat(allocateAmount.replace(',', '.')) <= 0 ||
                    (allocateMode === 'add' && parseFloat(allocateAmount.replace(',', '.')) > toBeBudgeted) ||
                    (allocateMode === 'remove' && parseFloat(allocateAmount.replace(',', '.')) > remaining)
                  }
                >
                  OK
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowAllocate(false); setAllocateAmount(''); }}
                  className="rounded-lg"
                >
                  ✕
                </Button>
              </div>
            </div>
          )}
          
          {/* Recent transactions */}
          {envelopeTransactions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Transactions récentes</Label>
              <div className="space-y-1">
                {envelopeTransactions.map((t) => (
                  <div key={t.id}>
                    {editingTransaction === t.id ? (
                      <div className="p-3 bg-muted rounded-lg space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Montant</Label>
                            <div className="relative">
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="pr-6 h-8 text-sm rounded-lg"
                                autoFocus
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">€</span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Marchand</Label>
                            <Input
                              type="text"
                              value={editMerchant}
                              onChange={(e) => setEditMerchant(e.target.value)}
                              placeholder="Ex: Carrefour"
                              className="h-8 text-sm rounded-lg"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Description</Label>
                          <Input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Ex: Courses"
                            className="h-8 text-sm rounded-lg"
                          />
                        </div>
                        
                        {/* Receipt management */}
                        <input
                          ref={receiptInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleReceiptChange}
                          className="hidden"
                        />
                        <div className="space-y-2">
                          {(editReceiptUrl || editReceiptPreview) && (
                            <div className="relative rounded border border-border overflow-hidden">
                              <img 
                                src={editReceiptPreview || editReceiptUrl || ''} 
                                alt="Ticket" 
                                className="w-full h-20 object-cover"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="destructive"
                                className="absolute top-1 right-1 h-6 w-6"
                                onClick={handleRemoveReceipt}
                                disabled={isUploadingReceipt}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => receiptInputRef.current?.click()}
                            disabled={isUploadingReceipt}
                            className="w-full h-8 rounded-lg text-xs"
                          >
                            {isUploadingReceipt ? (
                              <>Ajout...</>
                            ) : editReceiptUrl || editReceiptPreview ? (
                              <>
                                <Upload className="h-3 w-3 mr-1" />
                                Changer
                              </>
                            ) : (
                              <>
                                <Upload className="h-3 w-3 mr-1" />
                                Ajouter ticket
                              </>
                            )}
                          </Button>
                        </div>
                        
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={cancelEditTransaction}
                            className="h-7 w-7"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="h-7 w-7 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            onClick={() => saveEditTransaction(t.id)}
                            className="h-7 w-7"
                            disabled={!editAmount || parseFloat(editAmount.replace(',', '.')) <= 0 || isUploadingReceipt}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors group"
                        onClick={() => startEditTransaction(t)}
                      >
                        <div className="flex items-center gap-2">
                          <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          {t.receiptUrl && (
                            <a 
                              href={t.receiptUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex-shrink-0"
                            >
                              <img 
                                src={t.receiptUrl} 
                                alt="Ticket" 
                                className="w-8 h-8 object-cover rounded border border-border hover:opacity-80 transition-opacity"
                              />
                            </a>
                          )}
                          {!t.receiptUrl && (
                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium">{t.merchant || t.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(t.date).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <span className="font-medium text-destructive">
                          -{t.amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDelete}
              className="rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => { onOpenChange(false); onAddExpense(); }}
              className="flex-1 rounded-xl bg-destructive hover:bg-destructive/90"
            >
              Ajouter une dépense
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
