import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useBudget } from '@/contexts/BudgetContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Wallet, Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

export default function Planning() {
  const { envelopes, incomes } = useBudget();
  
  // Total income for the month
  const totalIncome = useMemo(() => 
    incomes.reduce((sum, i) => sum + i.amount, 0),
    [incomes]
  );
  
  // Total allocated
  const totalAllocated = useMemo(() => 
    envelopes.reduce((sum, env) => sum + env.allocated, 0),
    [envelopes]
  );
  
  // Total spent
  const totalSpent = useMemo(() => 
    envelopes.reduce((sum, env) => sum + env.spent, 0),
    [envelopes]
  );

  // Categorize envelopes
  const analysis = useMemo(() => {
    const overBudget = envelopes.filter(env => env.spent > env.allocated && env.allocated > 0);
    const underBudget = envelopes.filter(env => env.allocated > 0 && env.spent < env.allocated * 0.5);
    const onTrack = envelopes.filter(env => 
      env.allocated > 0 && 
      env.spent >= env.allocated * 0.5 && 
      env.spent <= env.allocated
    );
    const noAllocation = envelopes.filter(env => env.allocated === 0 && env.spent > 0);
    
    return { overBudget, underBudget, onTrack, noAllocation };
  }, [envelopes]);

  const getIcon = (iconName: string) => {
    const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
    return icons[iconName] || LucideIcons.Wallet;
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
              <Receipt className="h-5 w-5 text-primary" />
              Analyse Budget vs Réel
            </h1>
            <p className="text-sm text-muted-foreground">
              Comparez vos allocations avec vos dépenses réelles
            </p>
          </div>
        </div>
      </header>
      
      <main className="container py-6 pb-24 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Wallet className="h-3 w-3" />
                Revenus
              </div>
              <p className="text-lg font-bold">{formatCurrency(totalIncome)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingUp className="h-3 w-3" />
                Alloué
              </div>
              <p className="text-lg font-bold">{formatCurrency(totalAllocated)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Receipt className="h-3 w-3" />
                Dépensé
              </div>
              <p className="text-lg font-bold">{formatCurrency(totalSpent)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Global Progress */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Utilisation globale du budget</span>
              <span className="text-sm text-muted-foreground">
                {totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0}%
              </span>
            </div>
            <Progress 
              value={totalAllocated > 0 ? Math.min((totalSpent / totalAllocated) * 100, 100) : 0} 
              className="h-3"
            />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Dépensé: {formatCurrency(totalSpent)}</span>
              <span>Alloué: {formatCurrency(totalAllocated)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Over Budget Alert */}
        {analysis.overBudget.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Dépassement de budget ({analysis.overBudget.length})
              </CardTitle>
              <CardDescription>Ces enveloppes ont dépassé leur allocation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.overBudget.map(env => {
                const Icon = getIcon(env.icon);
                const overAmount = env.spent - env.allocated;
                const percentage = Math.round((env.spent / env.allocated) * 100);
                return (
                  <div key={env.id} className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${env.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: env.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{env.name}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-destructive font-semibold">+{formatCurrency(overAmount)}</span>
                        <span className="text-muted-foreground">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(env.spent)}</p>
                      <p className="text-xs text-muted-foreground">/ {formatCurrency(env.allocated)}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* No Allocation Warning */}
        {analysis.noAllocation.length > 0 && (
          <Card className="border-orange-500/50 bg-orange-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                Sans allocation ({analysis.noAllocation.length})
              </CardTitle>
              <CardDescription>Dépenses sans budget alloué</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.noAllocation.map(env => {
                const Icon = getIcon(env.icon);
                return (
                  <div key={env.id} className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${env.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: env.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{env.name}</p>
                      <p className="text-xs text-orange-600">Aucune allocation</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(env.spent)}</p>
                      <p className="text-xs text-muted-foreground">/ {formatCurrency(0)}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* On Track */}
        {analysis.onTrack.length > 0 && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Dans les temps ({analysis.onTrack.length})
              </CardTitle>
              <CardDescription>Ces enveloppes respectent leur budget</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.onTrack.map(env => {
                const Icon = getIcon(env.icon);
                const remaining = env.allocated - env.spent;
                const percentage = Math.round((env.spent / env.allocated) * 100);
                return (
                  <div key={env.id} className="flex items-center gap-3 p-3 rounded-lg bg-background border">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${env.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: env.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{env.name}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-green-600 font-semibold">Reste {formatCurrency(remaining)}</span>
                        <span className="text-muted-foreground">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(env.spent)}</p>
                      <p className="text-xs text-muted-foreground">/ {formatCurrency(env.allocated)}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Under Budget */}
        {analysis.underBudget.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-blue-500" />
                Sous-utilisées ({analysis.underBudget.length})
              </CardTitle>
              <CardDescription>Moins de 50% du budget utilisé</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.underBudget.map(env => {
                const Icon = getIcon(env.icon);
                const remaining = env.allocated - env.spent;
                const percentage = Math.round((env.spent / env.allocated) * 100);
                return (
                  <div key={env.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${env.color}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: env.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{env.name}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-blue-500 font-semibold">Économie {formatCurrency(remaining)}</span>
                        <span className="text-muted-foreground">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(env.spent)}</p>
                      <p className="text-xs text-muted-foreground">/ {formatCurrency(env.allocated)}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* All Envelopes Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Toutes les enveloppes</CardTitle>
            <CardDescription>Comparaison détaillée budget vs réel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {envelopes.map(env => {
                const Icon = getIcon(env.icon);
                const percentage = env.allocated > 0 ? (env.spent / env.allocated) * 100 : 0;
                const isOver = env.spent > env.allocated;
                const diff = env.spent - env.allocated;
                
                return (
                  <div key={env.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3 mb-2">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${env.color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: env.color }} />
                      </div>
                      <span className="font-medium flex-1">{env.name}</span>
                      <span className={`text-sm font-semibold ${isOver ? 'text-destructive' : 'text-green-600'}`}>
                        {isOver ? '+' : ''}{formatCurrency(Math.abs(diff))}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(percentage, 100)} 
                      className={`h-2 ${isOver ? '[&>div]:bg-destructive' : ''}`}
                    />
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>Dépensé: {formatCurrency(env.spent)}</span>
                      <span>Alloué: {formatCurrency(env.allocated)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
