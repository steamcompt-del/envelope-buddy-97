import { useState, useEffect, useMemo } from 'react';
import { useBudget, Envelope } from '@/contexts/BudgetContext';
import { useSavingsGoals } from '@/hooks/useSavingsGoals';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Calendar, 
  Copy, 
  ArrowRight, 
  PiggyBank, 
  AlertTriangle,
  Check,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

interface MonthlyManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [year, month] = monthKey.split('-').map(Number);
  return { year, month };
}

function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatMonthDisplay(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

interface RolloverPreview {
  envelope: Envelope;
  netBalance: number;
  targetAmount: number | null;
  carryOverAmount: number;
  isCapped: boolean;
}

export function MonthlyManagementDialog({ open, onOpenChange }: MonthlyManagementDialogProps) {
  const { currentMonthKey, copyEnvelopesToMonth, setCurrentMonth, envelopes } = useBudget();
  const { goals, getGoalForEnvelope } = useSavingsGoals();
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Target month input state
  const { year: currentYear, month: currentMonth } = parseMonthKey(currentMonthKey);
  
  // Default to next month
  const defaultNextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const defaultNextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
  
  const [targetYear, setTargetYear] = useState(defaultNextYear);
  const [targetMonth, setTargetMonth] = useState(defaultNextMonth);

  // Reset target to next month when dialog opens or source month changes
  useEffect(() => {
    if (open) {
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      setTargetMonth(nextMonth);
      setTargetYear(nextYear);
      setShowConfirmation(false);
    }
  }, [open, currentMonth, currentYear]);

  const targetMonthKey = formatMonthKey(targetYear, targetMonth);
  const isSameMonth = targetMonthKey === currentMonthKey;

  // Filter envelopes with rollover enabled
  const rolloverEnvelopes = useMemo(() => {
    return envelopes.filter(env => env.rollover);
  }, [envelopes]);

  // Preview what will be carried over
  const rolloverPreviews: RolloverPreview[] = useMemo(() => {
    return rolloverEnvelopes.map(envelope => {
      const netBalance = Math.max(0, envelope.allocated - envelope.spent);
      const goal = getGoalForEnvelope(envelope.id);
      const targetAmount = goal?.target_amount || null;
      
      // Apply strategy
      const strategy = envelope.rolloverStrategy || 'full';
      let carryOverAmount = netBalance;
      let isCapped = false;
      
      switch (strategy) {
        case 'none': carryOverAmount = 0; break;
        case 'percentage': carryOverAmount = netBalance * ((envelope.rolloverPercentage ?? 100) / 100); break;
        case 'capped': 
          if (envelope.maxRolloverAmount != null) {
            carryOverAmount = Math.min(netBalance, envelope.maxRolloverAmount);
            isCapped = carryOverAmount < netBalance;
          }
          break;
        case 'full': default: break;
      }
      
      if (targetAmount && carryOverAmount > targetAmount) {
        carryOverAmount = targetAmount;
        isCapped = true;
      }
      
      carryOverAmount = Math.round(carryOverAmount * 100) / 100;
      
      return {
        envelope,
        netBalance,
        targetAmount,
        carryOverAmount,
        isCapped,
      };
    });
  }, [rolloverEnvelopes, getGoalForEnvelope]);

  const totalCarryOver = useMemo(() => {
    return rolloverPreviews.reduce((sum, p) => sum + p.carryOverAmount, 0);
  }, [rolloverPreviews]);

  const noRolloverEnvelopes = useMemo(() => {
    return envelopes.filter(env => !env.rollover);
  }, [envelopes]);

  const handleProceed = () => {
    if (isSameMonth) {
      toast.error('Sélectionnez un mois différent');
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const result = await copyEnvelopesToMonth(targetMonthKey);
      const formatCurrencyVal = (amount: number) => amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
      toast.success(`Enveloppes transférées vers ${formatMonthDisplay(targetMonthKey)}`, {
        description: result.count > 0 
          ? `${result.count} enveloppe(s) reportée(s) pour un total de ${formatCurrencyVal(result.total)}`
          : 'Aucun report de solde'
      });
      
      // Show overdraft warnings
      if (result.overdrafts && result.overdrafts.length > 0) {
        const overdraftList = result.overdrafts
          .map(o => `${o.envelopeName}: -${o.overdraftAmount.toFixed(2)}€`)
          .join('\n');
        toast.warning(
          `⚠️ ${result.overdrafts.length} découvert(s) détecté(s)`,
          { description: overdraftList, duration: 10000 }
        );
      }
      
      setCurrentMonth(targetMonthKey);
      onOpenChange(false);
    } catch (error) {
      console.error('Error copying envelopes:', error);
      toast.error('Erreur lors du transfert des enveloppes');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gestion mensuelle
          </DialogTitle>
          <DialogDescription>
            {showConfirmation 
              ? 'Confirmez le passage au nouveau mois'
              : 'Transférez vos enveloppes vers un autre mois avec report automatique des soldes.'
            }
          </DialogDescription>
        </DialogHeader>

        {!showConfirmation ? (
          <>
            <div className="space-y-4 py-4">
              {/* Source month */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Depuis :</span>
                <span className="font-medium">{formatMonthDisplay(currentMonthKey)}</span>
              </div>

              {/* Target month selector */}
              <div className="space-y-3">
                <Label>Vers quel mois ?</Label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Mois</Label>
                    <select
                      value={targetMonth}
                      onChange={(e) => setTargetMonth(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                    >
                      {MONTH_NAMES.map((name, index) => (
                        <option key={index} value={index + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <Label className="text-xs text-muted-foreground mb-1 block">Année</Label>
                    <Input
                      type="number"
                      value={targetYear}
                      onChange={(e) => setTargetYear(Number(e.target.value))}
                      min={2020}
                      max={2100}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>

              {isSameMonth && (
                <p className="text-sm text-destructive">
                  Veuillez sélectionner un mois différent du mois actuel.
                </p>
              )}

              {/* Summary of what will happen */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Enveloppes avec report de solde
                  <Badge variant="secondary" className="ml-auto">
                    {rolloverEnvelopes.length}
                  </Badge>
                </h4>
                
                {rolloverEnvelopes.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Le solde restant (alloué - dépensé) sera automatiquement reporté.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Aucune enveloppe avec l'option "Report de solde" activée.
                  </p>
                )}

                {noRolloverEnvelopes.length > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">
                        {noRolloverEnvelopes.length} enveloppe(s) ne seront pas copiées
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Les enveloppes sans l'option "Report de solde" ne sont pas transférées.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleProceed} 
                disabled={isSameMonth || rolloverEnvelopes.length === 0}
              >
                Continuer
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Confirmation step */}
            <div className="flex-1 min-h-0 py-4 space-y-4">
              {/* Transfer summary */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatMonthDisplay(currentMonthKey)}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-primary">{formatMonthDisplay(targetMonthKey)}</span>
                </div>
              </div>

              {/* Rollover details */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Détail des reports</h4>
                <ScrollArea className="h-[200px] rounded-lg border">
                  <div className="p-3 space-y-2">
                    {rolloverPreviews.map((preview) => (
                      <div 
                        key={preview.envelope.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          {preview.envelope.icon === 'PiggyBank' && (
                            <PiggyBank className="h-4 w-4 text-primary" />
                          )}
                          <span className="text-sm font-medium">{preview.envelope.name}</span>
                          {preview.isCapped && (
                            <Badge variant="outline" className="text-xs">
                              Plafonné
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "text-sm font-medium",
                            preview.carryOverAmount > 0 ? "text-primary" : "text-muted-foreground"
                          )}>
                            {formatCurrency(preview.carryOverAmount)}
                          </span>
                          {preview.isCapped && preview.targetAmount && (
                            <p className="text-xs text-muted-foreground">
                              sur {formatCurrency(preview.netBalance)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="font-medium">Total reporté</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(totalCarryOver)}
                </span>
              </div>

              {/* Warning about non-rollover envelopes */}
              {noRolloverEnvelopes.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    <strong>{noRolloverEnvelopes.length}</strong> enveloppe(s) sans report ne seront pas copiées : {' '}
                    {noRolloverEnvelopes.slice(0, 3).map(e => e.name).join(', ')}
                    {noRolloverEnvelopes.length > 3 && `, +${noRolloverEnvelopes.length - 3} autre(s)`}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                Retour
              </Button>
              <Button 
                onClick={handleConfirm} 
                disabled={loading}
                className="gap-2"
              >
                {loading ? 'Transfert en cours...' : (
                  <>
                    <Check className="h-4 w-4" />
                    Confirmer le transfert
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
