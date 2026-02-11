import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useBudget, Envelope, Transaction, EnvelopeCategory } from '@/contexts/BudgetContext';
import { useTransactionsReceipts, useReceipts } from '@/hooks/useReceipts';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
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
import { 
  ShoppingCart, Utensils, Car, Gamepad2, Heart, ShoppingBag, 
  Receipt, PiggyBank, Home, Plane, Gift, Music, Wifi, Smartphone, 
  Coffee, Wallet, Trash2, ArrowRightLeft, Plus, Pencil, Check, X, ImageIcon, Expand, CalendarIcon, Target
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ComponentType } from 'react';
import { ReceiptLightbox, ReceiptImage } from './ReceiptLightbox';
import { ReceiptGallery } from './ReceiptGallery';
import { SwipeableRow } from './SwipeableRow';
import { TransactionNotesField } from './TransactionNotesField';
import { SavingsGoalDialog } from './SavingsGoalDialog';
import { SavingsGoalProgress } from './SavingsGoalProgress';
import { RolloverConfigSection } from './RolloverConfigSection';
import { RolloverHistoryDialog } from './RolloverHistoryDialog';
import { SplitBadge } from './SplitBadge';

interface EnvelopeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelopeId: string;
  onTransfer: () => void;
  onAddExpense: () => void;
}

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  ShoppingCart, Utensils, Car, Gamepad2, Heart, ShoppingBag, 
  Receipt, PiggyBank, Home, Plane, Gift, Music, Wifi, Smartphone, 
  Coffee, Wallet,
};

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = iconMap[name] || Wallet;
  return <Icon className={className} />;
}

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
  const { envelopes, transactions, toBeBudgeted, allocateToEnvelope, deallocateFromEnvelope, deleteEnvelope, updateEnvelope, updateTransaction, deleteTransaction } = useBudget();
  const { getGoalForEnvelope, createGoal, updateGoal, deleteGoal } = useSavingsGoals();
  
  const [showAllocate, setShowAllocate] = useState(false);
  const [allocationInput, setAllocationInput] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editMerchant, setEditMerchant] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editEnvelopeId, setEditEnvelopeId] = useState<string>('');
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<ReceiptImage[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  // ALL HOOKS MUST BE BEFORE EARLY RETURN
  const envelope = envelopes.find(e => e.id === envelopeId);
  
  // Fetch split transaction IDs and their amounts for this envelope
  const [splitParentIds, setSplitParentIds] = useState<Set<string>>(new Set());
  const [splitAmounts, setSplitAmounts] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    if (!envelopeId) { setSplitParentIds(new Set()); setSplitAmounts(new Map()); return; }
    (async () => {
      const { getBackendClient } = await import('@/lib/backendClient');
      const client = getBackendClient();
      const { data } = await client
        .from('transaction_splits')
        .select('parent_transaction_id, amount')
        .eq('envelope_id', envelopeId);
      const ids = new Set((data || []).map(r => r.parent_transaction_id));
      const amounts = new Map((data || []).map(r => [r.parent_transaction_id, r.amount]));
      setSplitParentIds(ids);
      setSplitAmounts(amounts);
    })();
  }, [envelopeId, transactions]);

  const envelopeTransactions = useMemo(() => {
    if (!envelope) return [];
    return transactions
      .filter(t => t.envelopeId === envelopeId || splitParentIds.has(t.id))
      .sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [transactions, envelopeId, envelope, splitParentIds]);
  
  const transactionIds = useMemo(() => envelopeTransactions.map(t => t.id), [envelopeTransactions]);
  const { getReceiptsForTransaction } = useTransactionsReceipts(transactionIds);
  
  const { 
    receipts: editTransactionReceipts, 
    addReceipt, 
    removeReceipt,
    isLoading: isLoadingReceipts 
  } = useReceipts(editingTransaction || undefined);
  
  const handleAddReceiptToTransaction = useCallback(async () => {
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
    } finally {
      setIsUploadingReceipt(false);
      if (receiptInputRef.current) {
        receiptInputRef.current.value = '';
      }
    }
  }, [addReceipt]);

  // NOW WE CAN CHECK IF ENVELOPE EXISTS
  if (!envelope) return null;
  
  const remaining = envelope.allocated - envelope.spent;
  const percentUsed = envelope.allocated > 0 ? (envelope.spent / envelope.allocated) * 100 : 0;
  const isOverspent = envelope.spent > envelope.allocated;
  const colorStyle = colorClasses[envelope.color] || colorClasses.blue;
  const savingsGoal = getGoalForEnvelope(envelopeId);

  const handleSaveGoal = async (params: import('@/lib/savingsGoalsDb').CreateSavingsGoalParams & { id?: string }) => {
    if (savingsGoal) {
      await updateGoal(savingsGoal.id, {
        target_amount: params.targetAmount,
        target_date: params.targetDate || null,
        name: params.name || null,
        priority: params.priority,
        auto_contribute: params.auto_contribute,
        monthly_contribution: params.monthly_contribution,
        contribution_percentage: params.contribution_percentage,
        celebration_threshold: params.celebration_threshold,
      });
    } else {
      await createGoal(params);
    }
  };

  const handleDeleteGoal = async () => {
    if (savingsGoal) {
      await deleteGoal(savingsGoal.id);
    }
  };

  const handleStartEditAllocation = () => {
    setAllocationInput(envelope.allocated.toString().replace('.', ','));
    setShowAllocate(true);
  };

  const handleSaveAllocation = async () => {
    const newTotal = parseFloat(allocationInput.replace(',', '.'));
    if (isNaN(newTotal) || newTotal < 0) return;
    
    const currentAllocated = envelope.allocated;
    const difference = newTotal - currentAllocated;
    
    if (difference > 0) {
      // Adding allocation - check if we have enough toBeBudgeted
      if (Math.round(difference * 100) > Math.round(toBeBudgeted * 100)) return;
      await allocateToEnvelope(envelopeId, difference);
    } else if (difference < 0) {
      // Removing allocation - check if we can remove this much (can't go below spent)
      const maxRemovable = currentAllocated - envelope.spent;
      if (Math.abs(difference) > maxRemovable) return;
      await deallocateFromEnvelope(envelopeId, Math.abs(difference));
    }
    
    setAllocationInput('');
    setShowAllocate(false);
  };

  const handleCancelEditAllocation = () => {
    setShowAllocate(false);
    setAllocationInput('');
  };

  // Calculate max and min for validation hint
  const maxAllocation = envelope.allocated + toBeBudgeted;
  const minAllocation = envelope.spent;
  
  const handleDelete = async () => {
    if (confirm(`Supprimer l'enveloppe "${envelope.name}" ?`)) {
      await deleteEnvelope(envelopeId);
      onOpenChange(false);
    }
  };

  const startEditName = () => {
    setEditName(envelope.name);
    setIsEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const cancelEditName = () => {
    setIsEditingName(false);
    setEditName('');
  };

  const saveEnvelopeName = async () => {
    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== envelope.name) {
      await updateEnvelope(envelopeId, { name: trimmedName });
    }
    setIsEditingName(false);
    setEditName('');
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEnvelopeName();
    } else if (e.key === 'Escape') {
      cancelEditName();
    }
  };
  
  const startEditTransaction = (t: Transaction) => {
    setEditingTransaction(t.id);
    setEditAmount(t.amount.toString().replace('.', ','));
    setEditMerchant(t.merchant || '');
    setEditDescription(t.description);
    setEditNotes(t.notes || '');
    setEditDate(new Date(t.date));
    setEditEnvelopeId(t.envelopeId);
  };
  
  const cancelEditTransaction = () => {
    setEditingTransaction(null);
    setEditAmount('');
    setEditMerchant('');
    setEditDescription('');
    setEditNotes('');
    setEditDate(undefined);
    setEditEnvelopeId('');
    setDatePopoverOpen(false);
  };
  
  const saveEditTransaction = async (id: string) => {
    const parsedAmount = parseFloat(editAmount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    
    await updateTransaction(id, {
      amount: parsedAmount,
      merchant: editMerchant || undefined,
      description: editDescription || 'Dépense',
      notes: editNotes || undefined,
      date: editDate ? editDate.toISOString() : undefined,
      envelopeId: editEnvelopeId !== envelopeId ? editEnvelopeId : undefined,
    });
    cancelEditTransaction();
    
    // Si la transaction a été déplacée vers une autre enveloppe, fermer la dialog
    if (editEnvelopeId !== envelopeId) {
      onOpenChange(false);
    }
  };
  
  const handleDeleteTransaction = async (id: string) => {
    if (confirm('Supprimer cette dépense ?')) {
      await deleteTransaction(id);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              colorStyle.bg
            )}>
              <DynamicIcon name={envelope.icon} className={cn("w-6 h-6", colorStyle.text)} />
            </div>
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    ref={nameInputRef}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    onBlur={saveEnvelopeName}
                    className="h-8 text-lg font-semibold rounded-lg"
                    placeholder="Nom de l'enveloppe"
                  />
                </div>
              ) : (
                <button 
                  onClick={startEditName}
                  className="flex items-center gap-2 group text-left"
                >
                  <DialogTitle className="text-xl">{envelope.name}</DialogTitle>
                  <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
              <p className="text-sm text-muted-foreground">
                {envelope.spent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} dépensé sur {envelope.allocated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-1">Restant</p>
            <p className={cn(
              "text-4xl font-bold",
              isOverspent ? "text-destructive" : "text-foreground"
            )}>
              {remaining.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
          
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
          
          {/* Savings Goal Section - Only for savings envelopes */}
          {envelope.icon === 'PiggyBank' && (
            savingsGoal ? (
              <SavingsGoalProgress
                goal={savingsGoal}
                currentAmount={envelope.allocated}
                onClick={() => setShowGoalDialog(true)}
              />
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowGoalDialog(true)}
                className="w-full rounded-xl gap-2"
              >
                <Target className="w-4 h-4" />
                Définir un objectif d'épargne
              </Button>
            )
          )}
          
          {/* Allocation Section */}
          <div className="p-3 bg-muted/50 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-sm">Allocation</Label>
              {!showAllocate && (
                <button
                  onClick={handleStartEditAllocation}
                  className="flex items-center gap-1.5 group"
                >
                  <span className="text-lg font-semibold">
                    {envelope.allocated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
            
            {showAllocate && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={allocationInput}
                      onChange={(e) => setAllocationInput(e.target.value)}
                      className="pr-8 rounded-lg text-lg font-semibold"
                      autoFocus
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                  </div>
                  <Button
                    onClick={handleSaveAllocation}
                    size="sm"
                    className="rounded-lg px-3"
                    disabled={(() => {
                      const newTotal = parseFloat(allocationInput.replace(',', '.'));
                      if (isNaN(newTotal) || newTotal < 0) return true;
                      // Use cents comparison to avoid floating point precision issues
                      if (Math.round(newTotal * 100) < Math.round(minAllocation * 100)) return true;
                      if (Math.round(newTotal * 100) > Math.round(maxAllocation * 100)) return true;
                      return false;
                    })()}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEditAllocation}
                    className="rounded-lg px-3"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Min: {minAllocation.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} (dépensé) • 
                  Max: {maxAllocation.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} (disponible)
                </p>
              </div>
            )}
          </div>

          {/* Category Selector */}
          <div className="p-3 bg-muted/50 rounded-xl">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-sm">Catégorie</Label>
              <Select
                value={envelope.category || 'essentiels'}
                onValueChange={(value: EnvelopeCategory) => {
                  updateEnvelope(envelopeId, { category: value });
                }}
              >
                <SelectTrigger className="w-[160px] h-8 rounded-lg text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="essentiels">🔵 Essentiels</SelectItem>
                  <SelectItem value="lifestyle">🟣 Lifestyle</SelectItem>
                  <SelectItem value="epargne">🟢 Épargne</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Rollover Configuration */}
          <div className="p-3 bg-muted/50 rounded-xl">
            <RolloverConfigSection
              enabled={envelope.rollover}
              onEnabledChange={async (checked) => {
                await updateEnvelope(envelopeId, {
                  rollover: checked,
                  rolloverStrategy: checked ? (envelope.rolloverStrategy || 'full') : 'none',
                });
              }}
              strategy={envelope.rolloverStrategy || 'full'}
              onStrategyChange={async (strategy) => {
                await updateEnvelope(envelopeId, { rolloverStrategy: strategy });
              }}
              percentage={envelope.rolloverPercentage ?? 50}
              onPercentageChange={async (value) => {
                await updateEnvelope(envelopeId, { rolloverPercentage: value });
              }}
              maxAmount={envelope.maxRolloverAmount?.toString() ?? ''}
              onMaxAmountChange={async (value) => {
                const parsed = parseFloat(value);
                await updateEnvelope(envelopeId, {
                  maxRolloverAmount: isNaN(parsed) ? undefined : parsed,
                });
              }}
            />
            {envelope.rollover && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryOpen(true)}
                className="mt-2 w-full text-xs gap-1"
              >
                <CalendarIcon className="h-3 w-3" />
                Historique des reports
              </Button>
            )}
          </div>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { onOpenChange(false); onTransfer(); }}
              className="rounded-xl flex-col h-auto py-3"
            >
              <ArrowRightLeft className="w-4 h-4 mb-1" />
              <span className="text-xs">Transférer</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onAddExpense}
              className="rounded-xl flex-col h-auto py-3"
            >
              <Plus className="w-4 h-4 mb-1" />
              <span className="text-xs">Dépense</span>
            </Button>
          </div>
          
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
                        <div className="grid grid-cols-2 gap-2">
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
                          <div>
                            <Label className="text-xs">Date</Label>
                            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full h-8 justify-start text-left font-normal text-sm rounded-lg",
                                    !editDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-3 w-3" />
                                  {editDate ? format(editDate, "dd/MM/yyyy", { locale: fr }) : "Choisir"}
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
                                  className={cn("p-3 pointer-events-auto")}
                                  locale={fr}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-xs">Transférer vers</Label>
                          <Select value={editEnvelopeId} onValueChange={setEditEnvelopeId}>
                            <SelectTrigger className="h-8 text-sm rounded-lg">
                              <SelectValue placeholder="Choisir une enveloppe" />
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
                        
                        <TransactionNotesField
                          notes={editNotes}
                          onSave={setEditNotes}
                          isEditing
                        />
                        
                        <div className="space-y-2">
                          <Label className="text-xs">Tickets</Label>
                          <ReceiptGallery
                            receipts={editTransactionReceipts}
                            onAdd={handleAddReceiptToTransaction}
                            onDelete={removeReceipt}
                            canEdit
                            isAdding={isUploadingReceipt}
                            isDeleting={isLoadingReceipts}
                            showItems
                          />
                        </div>
                        
                        <input
                          ref={receiptInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleReceiptFileChange}
                          className="hidden"
                        />
                        
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
                      <SwipeableRow
                        onEdit={() => startEditTransaction(t)}
                        onDelete={() => handleDeleteTransaction(t.id)}
                      >
                        <div 
                          className="flex items-center justify-between py-2 px-3 cursor-pointer hover:bg-muted transition-colors group"
                          onClick={() => startEditTransaction(t)}
                        >
                          <div className="flex items-center gap-2">
                            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                            {(() => {
                              const transactionReceipts = getReceiptsForTransaction(t.id);
                              if (transactionReceipts.length > 0) {
                                return (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const images: ReceiptImage[] = transactionReceipts.map(r => ({
                                        id: r.id,
                                        url: r.url,
                                        fileName: r.fileName,
                                      }));
                                      setLightboxImages(images);
                                      setLightboxIndex(0);
                                      setLightboxOpen(true);
                                    }}
                                    className="relative flex-shrink-0 group/img"
                                  >
                                    <img 
                                      src={transactionReceipts[0].url} 
                                      alt="Ticket" 
                                      className="w-8 h-8 object-cover rounded border border-border hover:opacity-80 transition-opacity"
                                    />
                                    {transactionReceipts.length > 1 && (
                                      <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[9px] font-medium w-4 h-4 rounded-full flex items-center justify-center">
                                        {transactionReceipts.length}
                                      </span>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 rounded opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                      <Expand className="w-3 h-3 text-white" />
                                    </div>
                                  </button>
                                );
                              }
                              return (
                                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                  <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                                </div>
                              );
                            })()}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate">{t.merchant || t.description}</p>
                                {t.isSplit && (
                                  <SplitBadge
                                    transactionId={t.id}
                                    totalAmount={t.amount}
                                    currentEnvelopeId={envelopeId}
                                    compact
                                  />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(t.date).toLocaleDateString('fr-FR')}
                                <span className="ml-1 opacity-70">
                                  · Créé le {new Date(t.createdAt).toLocaleDateString('fr-FR')} à {new Date(t.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </p>
                              <TransactionNotesField notes={t.notes} onSave={() => {}} compact />
                            </div>
                          </div>
                          <span className="font-medium text-destructive">
                            -{(splitAmounts.get(t.id) ?? t.amount).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </span>
                        </div>
                      </SwipeableRow>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
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
        
        <ReceiptLightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
        />
        
        <SavingsGoalDialog
          open={showGoalDialog}
          onOpenChange={setShowGoalDialog}
          envelopeId={envelopeId}
          envelopeName={envelope.name}
          existingGoal={savingsGoal}
          onSave={handleSaveGoal}
          onDelete={savingsGoal ? handleDeleteGoal : undefined}
        />
        
        <RolloverHistoryDialog
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          envelopeId={envelopeId}
        />
      </DialogContent>
    </Dialog>
  );
}
