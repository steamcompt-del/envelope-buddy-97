import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export interface PlanningExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
}

interface PlanningExpensesListProps {
  expenses: PlanningExpense[];
  onExpensesChange: (expenses: PlanningExpense[]) => void;
  categories: Array<{ id: string; name: string }>;
}

export function PlanningExpensesList({ 
  expenses, 
  onExpensesChange,
  categories 
}: PlanningExpensesListProps) {
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const addExpense = useCallback(() => {
    if (!newDescription.trim() || !newAmount || !newCategory) return;
    
    const expense: PlanningExpense = {
      id: crypto.randomUUID(),
      description: newDescription.trim(),
      amount: Number(newAmount),
      category: newCategory,
    };
    
    onExpensesChange([...expenses, expense]);
    setNewDescription('');
    setNewAmount('');
    setNewCategory('');
  }, [newDescription, newAmount, newCategory, expenses, onExpensesChange]);

  const removeExpense = useCallback((id: string) => {
    onExpensesChange(expenses.filter(e => e.id !== id));
  }, [expenses, onExpensesChange]);

  const totalByCategory = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const grandTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Mes dépenses réelles du mois
        </CardTitle>
        <CardDescription>
          Entrez vos dépenses pour que l'IA vous conseille sur la taille des enveloppes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new expense form */}
        <div className="grid grid-cols-12 gap-2">
          <Input
            placeholder="Description (ex: Carrefour)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="col-span-4"
          />
          <Input
            type="number"
            placeholder="Montant"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            className="col-span-3"
          />
          <Select value={newCategory} onValueChange={setNewCategory}>
            <SelectTrigger className="col-span-4">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            size="icon" 
            onClick={addExpense}
            disabled={!newDescription.trim() || !newAmount || !newCategory}
            className="col-span-1"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Expenses list */}
        {expenses.length > 0 && (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {expenses.map((expense) => {
                const categoryName = categories.find(c => c.id === expense.category)?.name || 'Inconnu';
                return (
                  <div 
                    key={expense.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">{categoryName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeExpense(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Summary by category */}
        {expenses.length > 0 && (
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Résumé par catégorie:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(totalByCategory).map(([catId, total]) => {
                const categoryName = categories.find(c => c.id === catId)?.name || 'Inconnu';
                return (
                  <div key={catId} className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">{categoryName}</p>
                    <p className="font-semibold">{formatCurrency(total)}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-medium">Total général:</span>
              <span className="text-xl font-bold">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        )}

        {expenses.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Aucune dépense ajoutée. Commencez par entrer vos achats du mois.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
