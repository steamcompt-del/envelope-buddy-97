import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format, parseISO, addMonths, differenceInMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Target, Trash2, HelpCircle, RefreshCw } from 'lucide-react';
import { SavingsGoal, SavingsPriority, CreateSavingsGoalParams } from '@/lib/savingsGoalsDb';

const PRIORITY_CONFIG: Record<SavingsPriority, { label: string; emoji: string; color: string; description: string }> = {
  essential: { label: 'Essentiel', emoji: '🔴', color: 'border-red-500/50 bg-red-500/10', description: 'Urgence, réparation voiture' },
  high: { label: 'Haute', emoji: '🟠', color: 'border-orange-500/50 bg-orange-500/10', description: 'Vacances, gros achat prévu' },
  medium: { label: 'Moyenne', emoji: '🟡', color: 'border-yellow-500/50 bg-yellow-500/10', description: 'Projet à moyen terme' },
  low: { label: 'Basse', emoji: '🟢', color: 'border-green-500/50 bg-green-500/10', description: 'Objectif flexible' },
};

const CELEBRATION_OPTIONS = [25, 50, 75, 100];

interface SavingsGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  envelopeId: string;
  envelopeName: string;
  existingGoal?: SavingsGoal;
  onSave: (params: CreateSavingsGoalParams) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function SavingsGoalDialog({
  open,
  onOpenChange,
  envelopeId,
  envelopeName,
  existingGoal,
  onSave,
  onDelete,
}: SavingsGoalDialogProps) {
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [name, setName] = useState('');
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [priority, setPriority] = useState<SavingsPriority>('medium');
  const [autoContribute, setAutoContribute] = useState(false);
  const [contributionMode, setContributionMode] = useState<'fixed' | 'percentage'>('fixed');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [contributionPercentage, setContributionPercentage] = useState(10);
  const [celebrationThresholds, setCelebrationThresholds] = useState<number[]>([100]);

  useEffect(() => {
    if (existingGoal) {
      setTargetAmount(existingGoal.target_amount.toString().replace('.', ','));
      setTargetDate(existingGoal.target_date ? parseISO(existingGoal.target_date) : undefined);
      setName(existingGoal.name || '');
      setPriority(existingGoal.priority || 'medium');
      setAutoContribute(existingGoal.auto_contribute || false);
      setMonthlyContribution(existingGoal.monthly_contribution?.toString().replace('.', ',') || '');
      setContributionPercentage(existingGoal.contribution_percentage || 10);
      setContributionMode(existingGoal.contribution_percentage ? 'percentage' : 'fixed');
      setCelebrationThresholds(existingGoal.celebration_threshold || [100]);
    } else {
      setTargetAmount('');
      setTargetDate(undefined);
      setName('');
      setPriority('medium');
      setAutoContribute(false);
      setContributionMode('fixed');
      setMonthlyContribution('');
      setContributionPercentage(10);
      setCelebrationThresholds([100]);
    }
  }, [existingGoal, open]);

  const parsedAmount = parseFloat(targetAmount.replace(',', '.'));
  const parsedContribution = parseFloat(monthlyContribution.replace(',', '.'));

  // Projection calculation
  const projection = useMemo(() => {
    if (!parsedAmount || parsedAmount <= 0 || !autoContribute) return null;
    // Use envelope.allocated if available via existingGoal context, otherwise 0
    const remaining = parsedAmount;
    if (remaining <= 0) return null;

    let monthlyAmount = 0;
    if (contributionMode === 'fixed' && parsedContribution > 0) {
      monthlyAmount = parsedContribution;
    }
    // For percentage mode we can't calculate without knowing the budget
    if (monthlyAmount <= 0) return null;

    const monthsNeeded = Math.ceil(remaining / monthlyAmount);
    const estimatedDate = addMonths(new Date(), monthsNeeded);
    return { monthsNeeded, estimatedDate };
  }, [parsedAmount, autoContribute, contributionMode, parsedContribution]);

  // Target date validation
  const dateValidation = useMemo(() => {
    if (!targetDate) return { valid: true, message: null };
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    if (targetDate < now) {
      return { valid: false, message: '⚠️ La date cible est dans le passé' };
    }

    if (autoContribute && contributionMode === 'fixed' && parsedContribution > 0 && parsedAmount > 0) {
      const monthsAvailable = differenceInMonths(targetDate, now) || 1;
      const monthsNeeded = Math.ceil(parsedAmount / parsedContribution);
      
      if (monthsNeeded > monthsAvailable) {
        return {
          valid: false,
          message: `⚠️ Il faut ${monthsNeeded} mois mais il n'en reste que ${monthsAvailable}. Augmentez la contribution à ${Math.ceil(parsedAmount / monthsAvailable)}€/mois ou repoussez la date.`
        };
      }
    }

    return { valid: true, message: null };
  }, [targetDate, autoContribute, contributionMode, parsedContribution, parsedAmount]);

  const handleSave = async () => {
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    if (!dateValidation.valid) {
      toast.error('Corrigez les erreurs avant de sauvegarder');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        envelopeId,
        targetAmount: parsedAmount,
        targetDate: targetDate ? format(targetDate, 'yyyy-MM-dd') : undefined,
        name: name || undefined,
        priority,
        auto_contribute: autoContribute,
        monthly_contribution: autoContribute && contributionMode === 'fixed' && parsedContribution > 0 ? parsedContribution : undefined,
        contribution_percentage: autoContribute && contributionMode === 'percentage' ? contributionPercentage : undefined,
        celebration_threshold: celebrationThresholds,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving goal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Supprimer cet objectif d\'épargne ?')) return;

    setIsSaving(true);
    try {
      await onDelete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting goal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCelebration = (threshold: number) => {
    setCelebrationThresholds(prev =>
      prev.includes(threshold)
        ? prev.filter(t => t !== threshold)
        : [...prev, threshold].sort((a, b) => a - b)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>
                {existingGoal ? 'Modifier l\'objectif' : 'Définir un objectif'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">{envelopeName}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="goal-name">Nom de l'objectif (optionnel)</Label>
            <Input
              id="goal-name"
              placeholder="Ex: Fonds d'urgence, Vacances..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg"
            />
          </div>

          {/* Target Amount */}
          <div className="space-y-2">
            <Label htmlFor="target-amount">Montant cible *</Label>
            <div className="relative">
              <Input
                id="target-amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="pr-8 rounded-lg"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
            </div>
          </div>

          {/* Target Date */}
          <div className="space-y-2">
            <Label>Date limite (optionnel)</Label>
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal rounded-lg",
                    !targetDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(targetDate, "PPP", { locale: fr }) : "Choisir une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={targetDate}
                  onSelect={(date) => {
                    setTargetDate(date);
                    setDatePopoverOpen(false);
                  }}
                  initialFocus
                  locale={fr}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
            {targetDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTargetDate(undefined)}
                className="text-xs text-muted-foreground"
              >
                Effacer la date
              </Button>
            )}
          </div>

          {dateValidation.message && (
            <p className={cn(
              "text-xs px-3 py-2 rounded-lg",
              dateValidation.valid 
                ? "bg-primary/10 text-primary" 
                : "bg-destructive/10 text-destructive"
            )}>
              {dateValidation.message}
            </p>
          )}

          {/* Priority */}
          <div className="space-y-3">
            <TooltipProvider>
              <div className="flex items-center gap-2">
                <Label>Priorité</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[200px]">Les objectifs essentiels sont financés en premier lors des contributions automatiques</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(PRIORITY_CONFIG) as [SavingsPriority, typeof PRIORITY_CONFIG[SavingsPriority]][]).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPriority(key)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-all",
                    priority === key
                      ? config.color + ' ring-1 ring-primary/30'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{config.emoji}</span>
                    <span className="text-sm font-medium text-foreground">{config.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{config.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Auto Contribute */}
          <div className="space-y-3 p-3 bg-muted/50 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-primary" />
                <Label className="text-sm cursor-pointer">Contribuer automatiquement chaque mois</Label>
              </div>
              <Switch
                checked={autoContribute}
                onCheckedChange={setAutoContribute}
              />
            </div>

            {autoContribute && (
              <div className="space-y-3 pt-2 border-t border-border/50">
                {/* Fixed amount */}
                <button
                  type="button"
                  onClick={() => setContributionMode('fixed')}
                  className={cn(
                    "w-full p-3 rounded-lg border text-left transition-all",
                    contributionMode === 'fixed'
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                      contributionMode === 'fixed' ? 'border-primary' : 'border-muted-foreground/30'
                    )}>
                      {contributionMode === 'fixed' && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="text-sm font-medium text-foreground">Montant fixe</span>
                  </div>
                  {contributionMode === 'fixed' && (
                    <div className="relative ml-6">
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={monthlyContribution}
                        onChange={(e) => setMonthlyContribution(e.target.value)}
                        className="pr-16 rounded-lg h-9 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">€ / mois</span>
                    </div>
                  )}
                </button>

                {/* Percentage */}
                <button
                  type="button"
                  onClick={() => setContributionMode('percentage')}
                  className={cn(
                    "w-full p-3 rounded-lg border text-left transition-all",
                    contributionMode === 'percentage'
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                      contributionMode === 'percentage' ? 'border-primary' : 'border-muted-foreground/30'
                    )}>
                      {contributionMode === 'percentage' && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="text-sm font-medium text-foreground">Pourcentage du reste à budgéter</span>
                  </div>
                  {contributionMode === 'percentage' && (
                    <div className="ml-6 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <Slider
                        value={[contributionPercentage]}
                        onValueChange={([v]) => setContributionPercentage(v)}
                        min={1}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground text-center font-medium">
                        {contributionPercentage}% du reste à budgéter
                      </p>
                    </div>
                  )}
                </button>

                {/* Projection */}
                {projection && (
                  <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-xs text-foreground">
                      📊 À ce rythme, objectif atteint en <span className="font-semibold">{projection.monthsNeeded} mois</span>{' '}
                      ({format(projection.estimatedDate, 'MMMM yyyy', { locale: fr })})
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Celebrations */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              🎉 Célébrations
            </Label>
            <div className="flex flex-wrap gap-2">
              {CELEBRATION_OPTIONS.map((threshold) => (
                <label
                  key={threshold}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all",
                    celebrationThresholds.includes(threshold)
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                  )}
                >
                  <Checkbox
                    checked={celebrationThresholds.includes(threshold)}
                    onCheckedChange={() => toggleCelebration(threshold)}
                  />
                  <span className="text-sm text-foreground">{threshold}%</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Me féliciter quand j'atteins ces paliers</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {existingGoal && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
              className="rounded-lg w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          )}
          <div className="flex gap-2 flex-1 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="rounded-lg flex-1 sm:flex-none"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !targetAmount || isNaN(parsedAmount) || parsedAmount <= 0}
              className="rounded-lg flex-1 sm:flex-none"
            >
              {isSaving ? 'Enregistrement...' : existingGoal ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
