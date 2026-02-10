import { useState, useMemo, useRef } from 'react';
import { useBudget, Envelope } from '@/contexts/BudgetContext';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import { useActivity } from '@/hooks/useActivity';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInDays, differenceInMonths, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  PiggyBank, Target, TrendingUp, Plus, Minus, ArrowRightLeft,
  Trash2, Settings, History, Flag, Calendar, Sparkles, Star, Pencil, Pause, Play, RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SavingsPriority } from '@/lib/savingsGoalsDb';
import { CircularProgress } from './CircularProgress';
import { SavingsGoalDialog } from './SavingsGoalDialog';

interface SavingsDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelopeId: string;
  onTransfer: () => void;
  savingsGoalsHook?: ReturnType<typeof useSavingsGoals>;
}

// Milestone percentages
const MILESTONES = [25, 50, 75, 100];

export function SavingsDetailsDialog({ 
  open, 
  onOpenChange, 
  envelopeId,
  onTransfer,
  savingsGoalsHook,
}: SavingsDetailsDialogProps) {
  const { envelopes, toBeBudgeted, allocateToEnvelope, deallocateFromEnvelope, deleteEnvelope, updateEnvelope } = useBudget();
  const fallbackGoals = useSavingsGoals();
  const { getGoalForEnvelope, createGoal, updateGoal, deleteGoal } = savingsGoalsHook || fallbackGoals;
  const { activities } = useActivity();
  
  const [allocateAmount, setAllocateAmount] = useState('');
  const [showAllocate, setShowAllocate] = useState(false);
  const [allocateMode, setAllocateMode] = useState<'add' | 'remove'>('add');
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  const envelope = envelopes.find(e => e.id === envelopeId);
  const savingsGoal = getGoalForEnvelope(envelopeId);
  
  // Filter allocation activities for this envelope
  const allocationHistory = useMemo(() => {
    if (!envelope) return [];
    return activities
      .filter(a => 
        a.action === 'allocation_made' && 
        a.entityId === envelopeId
      )
      .slice(0, 10);
  }, [activities, envelopeId, envelope]);
  
  if (!envelope) return null;
  
  const targetAmount = savingsGoal?.target_amount || 0;
  const percentComplete = targetAmount > 0 
    ? Math.min((envelope.allocated / targetAmount) * 100, 100)
    : 0;
  const isComplete = envelope.allocated >= targetAmount && targetAmount > 0;
  const remaining = Math.max(0, targetAmount - envelope.allocated);
  
  // Calculate days remaining
  let daysRemaining: number | null = null;
  if (savingsGoal?.target_date) {
    const targetDate = parseISO(savingsGoal.target_date);
    daysRemaining = differenceInDays(targetDate, new Date());
  }
  
  // Calculate projection
  const calculateProjection = () => {
    if (allocationHistory.length < 2 || !savingsGoal || isComplete) return null;
    
    // Calculate average monthly contribution based on history
    const recentAllocations = allocationHistory.slice(0, 5);
    const totalAllocated = recentAllocations.reduce((sum, a) => {
      const amount = (a.details as any)?.amount || 0;
      return sum + amount;
    }, 0);
    
    if (totalAllocated <= 0) return null;
    
    const avgPerAllocation = totalAllocated / recentAllocations.length;
    const allocationsNeeded = Math.ceil(remaining / avgPerAllocation);
    const estimatedDate = addMonths(new Date(), allocationsNeeded);
    
    return {
      avgContribution: avgPerAllocation,
      allocationsNeeded,
      estimatedDate,
    };
  };
  
  const projection = calculateProjection();
  
  // Get milestone status
  const getMilestoneStatus = (milestone: number) => {
    return percentComplete >= milestone;
  };

  const handleAllocate = async () => {
    const parsedAmount = parseFloat(allocateAmount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    
    if (allocateMode === 'add') {
      // Use cents comparison to avoid floating point precision issues
      if (Math.round(parsedAmount * 100) <= Math.round(toBeBudgeted * 100)) {
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
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <PiggyBank className="w-6 h-6 text-primary" />
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
                  <DialogTitle className="text-xl flex items-center gap-2">
                    {envelope.name}
                    {isComplete && <Star className="w-5 h-5 text-envelope-yellow fill-envelope-yellow" />}
                  </DialogTitle>
                  <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
              {savingsGoal?.name && (
                <p className="text-sm text-muted-foreground">{savingsGoal.name}</p>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Main Progress Section */}
          <div className="flex flex-col items-center py-4">
            <CircularProgress value={percentComplete} size={140} strokeWidth={10}>
              <div className="text-center">
                <span className={cn(
                  "text-3xl font-bold",
                  isComplete ? "text-envelope-green" : "text-foreground"
                )}>
                  {Math.round(percentComplete)}%
                </span>
                {isComplete && (
                  <p className="text-xs text-envelope-green font-medium">Objectif atteint !</p>
                )}
              </div>
            </CircularProgress>
            
            <div className="mt-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {envelope.allocated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
              {targetAmount > 0 && (
                <p className="text-sm text-muted-foreground">
                  sur {targetAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
              )}
              {remaining > 0 && (
                <p className="text-sm text-primary font-medium mt-1">
                  Il manque {remaining.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
              )}
            </div>
          </div>
          
          {/* Milestones */}
          {targetAmount > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <Flag className="w-4 h-4" />
                Étapes
              </Label>
              <div className="flex items-center justify-between gap-1">
                {MILESTONES.map((milestone) => {
                  const achieved = getMilestoneStatus(milestone);
                  const milestoneAmount = (targetAmount * milestone) / 100;
                  return (
                    <div 
                      key={milestone}
                      className={cn(
                        "flex-1 text-center p-2 rounded-lg transition-all",
                        achieved 
                          ? "bg-primary/20 border border-primary/30" 
                          : "bg-muted/50 border border-transparent"
                      )}
                    >
                      <p className={cn(
                        "text-sm font-semibold",
                        achieved ? "text-primary" : "text-muted-foreground"
                      )}>
                        {milestone}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {milestoneAmount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€
                      </p>
                      {achieved && (
                        <Sparkles className="w-3 h-3 mx-auto mt-1 text-primary" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Projection */}
          {projection && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Projection</span>
              </div>
              <p className="text-sm text-muted-foreground">
                À ce rythme (~{projection.avgContribution.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} par versement), 
                vous atteindrez votre objectif vers <span className="font-medium text-foreground">{format(projection.estimatedDate, 'MMMM yyyy', { locale: fr })}</span>
              </p>
            </div>
          )}
          
          {/* Deadline warning */}
          {daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0 && !isComplete && (
            <div className="p-3 rounded-xl bg-envelope-orange/10 border border-envelope-orange/30">
              <p className="text-sm text-envelope-orange font-medium">
                ⏰ Plus que {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} avant l'échéance !
              </p>
            </div>
          )}
          
          {/* Actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowAllocate(true); setAllocateMode('add'); }}
              className="rounded-xl flex-col h-auto py-3 border-primary/30 hover:bg-primary/10"
            >
              <Plus className="w-4 h-4 mb-1 text-primary" />
              <span className="text-xs">Ajouter</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowAllocate(true); setAllocateMode('remove'); }}
              className="rounded-xl flex-col h-auto py-3"
              disabled={envelope.allocated <= 0}
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
          
          {showAllocate && (
            <div className="p-3 bg-muted rounded-xl space-y-3">
              <Label>
                {allocateMode === 'add' 
                  ? `Ajouter (max: ${toBeBudgeted.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })})`
                  : `Retirer (max: ${envelope.allocated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })})`
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
                    (allocateMode === 'add' && Math.round(parseFloat(allocateAmount.replace(',', '.')) * 100) > Math.round(toBeBudgeted * 100)) ||
                    (allocateMode === 'remove' && Math.round(parseFloat(allocateAmount.replace(',', '.')) * 100) > Math.round(envelope.allocated * 100))
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
          
          {/* History */}
          {allocationHistory.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground flex items-center gap-2">
                <History className="w-4 h-4" />
                Historique des versements
              </Label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {allocationHistory.map((activity) => {
                  const amount = Number((activity.details as any)?.amount || 0);
                  const isWithdrawal = amount < 0;

                  return (
                    <div 
                      key={activity.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {format(new Date(activity.createdAt), 'dd MMM', { locale: fr })}
                      </span>
                      <span className={cn(
                        "font-medium",
                        isWithdrawal ? "text-destructive" : "text-envelope-green"
                      )}>
                        {isWithdrawal ? '-' : '+'}{Math.abs(amount).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Priority & Status badges */}
          {savingsGoal && (
            <div className="flex flex-wrap gap-2 items-center">
              {savingsGoal.priority && (
                <Badge variant="outline" className={cn(
                  "text-xs",
                  savingsGoal.priority === 'essential' && 'bg-red-500/15 text-red-400 border-red-500/30',
                  savingsGoal.priority === 'high' && 'bg-orange-500/15 text-orange-400 border-orange-500/30',
                  savingsGoal.priority === 'medium' && 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
                  savingsGoal.priority === 'low' && 'bg-green-500/15 text-green-400 border-green-500/30',
                )}>
                  {savingsGoal.priority === 'essential' && '🔴 Essentiel'}
                  {savingsGoal.priority === 'high' && '🟠 Haute'}
                  {savingsGoal.priority === 'medium' && '🟡 Moyenne'}
                  {savingsGoal.priority === 'low' && '🟢 Basse'}
                </Badge>
              )}
              {savingsGoal.auto_contribute && (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Auto
                  {savingsGoal.monthly_contribution && ` ${savingsGoal.monthly_contribution}€/mois`}
                  {savingsGoal.contribution_percentage && ` ${savingsGoal.contribution_percentage}%`}
                </Badge>
              )}
              {savingsGoal.is_paused && (
                <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
                  ⏸️ En pause
                </Badge>
              )}
            </div>
          )}

          {/* Pause toggle */}
          {savingsGoal && savingsGoal.auto_contribute && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await updateGoal(savingsGoal.id, { is_paused: !savingsGoal.is_paused });
              }}
              className="rounded-lg w-full"
            >
              {savingsGoal.is_paused ? (
                <><Play className="w-4 h-4 mr-2 text-primary" /> Reprendre les contributions</>
              ) : (
                <><Pause className="w-4 h-4 mr-2" /> Mettre en pause</>
              )}
            </Button>
          )}

          {/* Bottom actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGoalDialog(true)}
              className="rounded-lg flex-1"
            >
              <Target className="w-4 h-4 mr-2" />
              {savingsGoal ? 'Modifier objectif' : 'Définir objectif'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <SavingsGoalDialog
          open={showGoalDialog}
          onOpenChange={setShowGoalDialog}
          envelopeId={envelopeId}
          envelopeName={envelope.name}
          existingGoal={savingsGoal}
          onSave={handleSaveGoal}
          onDelete={savingsGoal ? handleDeleteGoal : undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
