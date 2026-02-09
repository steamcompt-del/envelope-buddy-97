import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useBudget } from '@/contexts/BudgetContext';
import { usePlanningData, PlanningItem } from '@/hooks/usePlanningData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Calculator, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  History,
  Target,
  Lightbulb,
  Loader2,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface PlannedEnvelope {
  id: string;
  name: string;
  icon: string;
  color: string;
  plannedAmount: number;
  historyAverage: number;
  historyMax: number;
  currentAllocated: number;
  isManuallySet: boolean;
}

export default function Planning() {
  const { envelopes, allocateToEnvelope, toBeBudgeted, incomes } = useBudget();
  const { envelopeStats, incomeStats } = usePlanningData();
  
  // Initialize planned amounts from history or current allocation
  const [plannedEnvelopes, setPlannedEnvelopes] = useState<PlannedEnvelope[]>(() => 
    envelopeStats.map(stat => ({
      id: stat.envelopeId,
      name: stat.name,
      icon: stat.icon,
      color: stat.color,
      plannedAmount: stat.averageSpent > 0 ? Math.round(stat.averageSpent) : stat.currentAllocated,
      historyAverage: stat.averageSpent,
      historyMax: stat.maxSpent,
      currentAllocated: stat.currentAllocated,
      isManuallySet: false,
    }))
  );
  
  const [expectedIncome, setExpectedIncome] = useState<number>(
    incomeStats.averageIncome > 0 ? Math.round(incomeStats.averageIncome) : incomes.reduce((s, i) => s + i.amount, 0)
  );
  
  const [isApplying, setIsApplying] = useState(false);
  
  // Calculate totals
  const totalPlanned = useMemo(() => 
    plannedEnvelopes.reduce((sum, env) => sum + env.plannedAmount, 0),
    [plannedEnvelopes]
  );
  
  const remaining = expectedIncome - totalPlanned;
  const currentlyAllocated = useMemo(() => 
    envelopes.reduce((sum, env) => sum + env.allocated, 0),
    [envelopes]
  );
  
  // Update a specific envelope's planned amount
  const updatePlannedAmount = useCallback((id: string, amount: number) => {
    setPlannedEnvelopes(prev => 
      prev.map(env => 
        env.id === id 
          ? { ...env, plannedAmount: Math.max(0, amount), isManuallySet: true }
          : env
      )
    );
  }, []);
  
  // Use history average for an envelope
  const useHistoryAverage = useCallback((id: string) => {
    setPlannedEnvelopes(prev => 
      prev.map(env => 
        env.id === id && env.historyAverage > 0
          ? { ...env, plannedAmount: Math.round(env.historyAverage), isManuallySet: false }
          : env
      )
    );
  }, []);
  
  // Use max from history
  const useHistoryMax = useCallback((id: string) => {
    setPlannedEnvelopes(prev => 
      prev.map(env => 
        env.id === id && env.historyMax > 0
          ? { ...env, plannedAmount: Math.round(env.historyMax), isManuallySet: false }
          : env
      )
    );
  }, []);
  
  // Apply planned amounts to actual envelopes
  const applyToEnvelopes = async () => {
    setIsApplying(true);
    try {
      // Calculate how much more needs to be allocated to each envelope
      const allocationsNeeded = plannedEnvelopes
        .map(planned => {
          const current = envelopes.find(e => e.id === planned.id);
          const diff = planned.plannedAmount - (current?.allocated || 0);
          return { id: planned.id, name: planned.name, diff };
        })
        .filter(a => a.diff > 0);
      
      const totalNeeded = allocationsNeeded.reduce((sum, a) => sum + a.diff, 0);
      
      if (totalNeeded > toBeBudgeted) {
        toast.error(`Fonds insuffisants. Il manque ${formatCurrency(totalNeeded - toBeBudgeted)}`);
        return;
      }
      
      // Apply allocations
      for (const allocation of allocationsNeeded) {
        await allocateToEnvelope(allocation.id, allocation.diff);
      }
      
      toast.success(`${allocationsNeeded.length} enveloppe(s) mise(s) à jour`);
    } catch (error) {
      console.error('Error applying allocations:', error);
      toast.error('Erreur lors de l\'application');
    } finally {
      setIsApplying(false);
    }
  };
  
  // Get icon component
  const getIconComponent = (iconName: string) => {
    const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
    const IconComponent = icons[iconName];
    return IconComponent || LucideIcons.Wallet;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex items-center gap-4 py-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Planification du Budget
            </h1>
            <p className="text-sm text-muted-foreground">
              Prévoyez vos dépenses et allouez vos fonds
            </p>
          </div>
        </div>
      </header>
      
      <main className="container py-6 pb-24 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Wallet className="h-4 w-4" />
                Revenu prévu
              </div>
              <Input
                type="number"
                value={expectedIncome}
                onChange={(e) => setExpectedIncome(Number(e.target.value) || 0)}
                className="text-lg font-bold h-10"
              />
              {incomeStats.averageIncome > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Moy. historique: {formatCurrency(incomeStats.averageIncome)}
                </p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Target className="h-4 w-4" />
                Total prévu
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totalPlanned)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Actuellement: {formatCurrency(currentlyAllocated)}
              </p>
            </CardContent>
          </Card>
          
          <Card className={remaining < 0 ? 'border-destructive' : remaining > 0 ? 'border-primary' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                {remaining < 0 ? <TrendingDown className="h-4 w-4 text-destructive" /> : <TrendingUp className="h-4 w-4 text-primary" />}
                Reste
              </div>
              <p className={cn(
                "text-2xl font-bold",
                remaining < 0 ? "text-destructive" : remaining > 0 ? "text-primary" : ""
              )}>
                {formatCurrency(remaining)}
              </p>
              {remaining < 0 && (
                <p className="text-xs text-destructive mt-1">Dépassement!</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <CheckCircle2 className="h-4 w-4" />
                À budgétiser
              </div>
              <p className="text-2xl font-bold">{formatCurrency(toBeBudgeted)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Disponible maintenant
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Progress bar */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Progression de l'allocation</span>
              <span>{Math.min(100, Math.round((totalPlanned / expectedIncome) * 100))}%</span>
            </div>
            <Progress 
              value={Math.min(100, (totalPlanned / expectedIncome) * 100)} 
              className={cn("h-3", totalPlanned > expectedIncome && "[&>div]:bg-destructive")}
            />
          </CardContent>
        </Card>
        
        {/* Envelope Planning Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Feuille de calcul
            </CardTitle>
            <CardDescription>
              Ajustez les montants prévus pour chaque enveloppe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3">
                {plannedEnvelopes.map((env) => {
                  const IconComponent = getIconComponent(env.icon);
                  const diff = env.plannedAmount - env.currentAllocated;
                  
                  return (
                    <div 
                      key={env.id}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `var(--${env.color}-500, hsl(var(--primary)))` }}
                        >
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{env.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Actuel: {formatCurrency(env.currentAllocated)}</span>
                            {diff !== 0 && (
                              <Badge variant={diff > 0 ? "default" : "secondary"} className="text-xs">
                                {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            Montant prévu
                          </label>
                          <Input
                            type="number"
                            value={env.plannedAmount}
                            onChange={(e) => updatePlannedAmount(env.id, Number(e.target.value) || 0)}
                            className="h-9"
                          />
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">
                            Suggestions
                          </label>
                          <div className="flex gap-1">
                            {env.historyAverage > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-9 flex-1"
                                onClick={() => useHistoryAverage(env.id)}
                              >
                                <History className="h-3 w-3 mr-1" />
                                Moy. {formatCurrency(env.historyAverage)}
                              </Button>
                            )}
                            {env.historyMax > 0 && env.historyMax !== env.historyAverage && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-9"
                                onClick={() => useHistoryMax(env.id)}
                                title={`Maximum: ${formatCurrency(env.historyMax)}`}
                              >
                                <TrendingUp className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          {env.historyAverage === 0 && (
                            <p className="text-xs text-muted-foreground italic">
                              Pas d'historique
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Tips */}
        {remaining < 0 && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-medium text-destructive">Budget dépassé</p>
                <p className="text-sm text-muted-foreground">
                  Vos dépenses prévues dépassent votre revenu de {formatCurrency(Math.abs(remaining))}.
                  Réduisez certaines catégories ou augmentez votre revenu prévu.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {remaining > 0 && remaining >= 50 && (
          <Card className="border-primary bg-primary/10">
            <CardContent className="pt-4 flex gap-3">
              <Lightbulb className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-medium">Fonds non alloués</p>
                <p className="text-sm text-muted-foreground">
                  Il vous reste {formatCurrency(remaining)} à allouer. 
                  Pensez à augmenter votre épargne ou à créer une enveloppe de sécurité.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      
      {/* Apply Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t">
        <div className="container">
          <Button 
            className="w-full h-12 text-base"
            onClick={applyToEnvelopes}
            disabled={isApplying || remaining < 0}
          >
            {isApplying ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Application...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Appliquer aux enveloppes
              </>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Les allocations seront ajustées selon vos prévisions
          </p>
        </div>
      </div>
    </div>
  );
}
