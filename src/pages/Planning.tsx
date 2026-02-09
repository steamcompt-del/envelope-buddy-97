import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useBudget } from '@/contexts/BudgetContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlanningExpensesList, PlanningExpense } from '@/components/budget/PlanningExpensesList';
import { AISuggestionsCard } from '@/components/budget/AISuggestionsCard';
import { ArrowLeft, Receipt, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function Planning() {
  const { envelopes, incomes } = useBudget();
  const [planningExpenses, setPlanningExpenses] = useState<PlanningExpense[]>([]);
  
  // Categories for expense input
  const expenseCategories = useMemo(() => 
    envelopes.map(env => ({ id: env.id, name: env.name })),
    [envelopes]
  );
  
  // Total income for the month
  const totalIncome = useMemo(() => 
    incomes.reduce((sum, i) => sum + i.amount, 0),
    [incomes]
  );
  
  // Total expenses entered
  const totalExpenses = useMemo(() => 
    planningExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    [planningExpenses]
  );

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
              Mes dépenses du mois
            </h1>
            <p className="text-sm text-muted-foreground">
              Entrez vos dépenses pour obtenir des conseils IA
            </p>
          </div>
        </div>
      </header>
      
      <main className="container py-6 pb-24 space-y-6">
        {/* Summary Card */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Wallet className="h-4 w-4" />
                Revenus du mois
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totalIncome)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Receipt className="h-4 w-4" />
                Total dépensé
              </div>
              <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Real expenses input */}
        <PlanningExpensesList
          expenses={planningExpenses}
          onExpensesChange={setPlanningExpenses}
          categories={expenseCategories}
        />
        
        {/* AI Suggestions */}
        <AISuggestionsCard
          expenses={planningExpenses}
          totalIncome={totalIncome}
          categories={expenseCategories}
        />
      </main>
    </div>
  );
}
