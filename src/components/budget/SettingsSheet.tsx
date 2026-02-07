import { useBudget } from '@/contexts/BudgetContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Wallet,
  PieChart
} from 'lucide-react';

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenIncomeList?: () => void;
}

export function SettingsSheet({ open, onOpenChange, onOpenIncomeList }: SettingsSheetProps) {
  const { envelopes, transactions, incomes, toBeBudgeted, resetMonth } = useBudget();
  
  // Calculate totals
  const totalAllocated = envelopes.reduce((sum, env) => sum + env.allocated, 0);
  const totalSpent = envelopes.reduce((sum, env) => sum + env.spent, 0);
  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  
  const handleResetMonth = () => {
    if (confirm('Êtes-vous sûr de vouloir remettre à zéro les dépenses de toutes les enveloppes ? Cette action est irréversible.')) {
      resetMonth();
      onOpenChange(false);
    }
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Paramètres & Statistiques</SheetTitle>
          <SheetDescription>
            Gérez votre budget et consultez vos statistiques
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Monthly Stats */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Résumé du mois
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => onOpenIncomeList?.()}
                className="p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-left"
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Revenus</span>
                </div>
                <p className="text-xl font-bold text-primary">
                  {totalIncome.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Cliquer pour modifier</p>
              </button>
              
              <div className="p-4 rounded-xl bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-muted-foreground">Dépenses</span>
                </div>
                <p className="text-xl font-bold text-destructive">
                  {totalSpent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
              
              <div className="p-4 rounded-xl bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <PieChart className="w-4 h-4 text-foreground" />
                  <span className="text-sm text-muted-foreground">Alloué</span>
                </div>
                <p className="text-xl font-bold">
                  {totalAllocated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
              
              <div className="p-4 rounded-xl bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-foreground" />
                  <span className="text-sm text-muted-foreground">Non alloué</span>
                </div>
                <p className="text-xl font-bold">
                  {toBeBudgeted.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Envelope breakdown */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Par enveloppe
            </h3>
            
            {envelopes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune enveloppe créée
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {envelopes.map((env) => {
                  const percent = env.allocated > 0 ? (env.spent / env.allocated) * 100 : 0;
                  const isOver = env.spent > env.allocated;
                  
                  return (
                    <div key={env.id} className="flex items-center justify-between py-2">
                      <span className="font-medium">{env.name}</span>
                      <div className="text-right">
                        <span className={isOver ? "text-destructive" : "text-foreground"}>
                          {env.spent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                        <span className="text-muted-foreground">
                          {' / '}{env.allocated.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({Math.round(percent)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Monthly Reset */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Nouveau mois
            </h3>
            
            <p className="text-sm text-muted-foreground">
              Remet les dépenses à zéro pour toutes les enveloppes. Les montants alloués restent inchangés.
            </p>
            
            <Button
              onClick={handleResetMonth}
              variant="outline"
              className="w-full rounded-xl gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Nouveau mois
            </Button>
          </div>
          
          <Separator />
          
          {/* Info */}
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>{envelopes.length} enveloppe{envelopes.length !== 1 ? 's' : ''}</p>
            <p>{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</p>
            <p className="pt-2">Données stockées localement</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
