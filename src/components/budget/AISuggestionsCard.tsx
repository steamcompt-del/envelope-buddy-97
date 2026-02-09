import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';
import { getBackendClient } from '@/lib/backendClient';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { PlanningExpense } from './PlanningExpensesList';
import { formatCurrency } from '@/lib/utils';

interface AISuggestionsCardProps {
  expenses: PlanningExpense[];
  totalIncome: number;
  categories: Array<{ id: string; name: string }>;
}

export function AISuggestionsCard({ expenses, totalIncome, categories }: AISuggestionsCardProps) {
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getSuggestions = async () => {
    if (expenses.length === 0) {
      toast.error('Ajoutez des dépenses pour obtenir des conseils');
      return;
    }

    setIsLoading(true);
    setSuggestions(null);

    try {
      // Build expense summary by category
      const totalByCategory = expenses.reduce((acc, exp) => {
        const catName = categories.find(c => c.id === exp.category)?.name || 'Autre';
        acc[catName] = (acc[catName] || 0) + exp.amount;
        return acc;
      }, {} as Record<string, number>);

      const grandTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

      const envelopesData = Object.entries(totalByCategory).map(([name, spent]) => ({
        name,
        allocated: 0,
        spent,
      }));

      const supabase = getBackendClient();
      const { data, error } = await supabase.functions.invoke('suggest-budget', {
        body: {
          envelopes: envelopesData,
          totalIncome,
          monthlyHistory: [],
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setSuggestions(data?.suggestions || 'Aucune suggestion disponible.');
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      toast.error('Erreur lors de la génération des conseils');
    } finally {
      setIsLoading(false);
    }
  };

  const grandTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Conseils IA
        </CardTitle>
        <CardDescription>
          Obtenez des recommandations personnalisées pour dimensionner vos enveloppes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {expenses.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <p>Basé sur {expenses.length} dépense(s) totalisant {formatCurrency(grandTotal)}</p>
            {totalIncome > 0 && (
              <p>Revenu prévu: {formatCurrency(totalIncome)}</p>
            )}
          </div>
        )}

        <Button
          onClick={getSuggestions}
          disabled={isLoading || expenses.length === 0}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Obtenir des conseils
            </>
          )}
        </Button>

        {suggestions && (
          <div className="p-4 rounded-lg bg-background border">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{suggestions}</ReactMarkdown>
            </div>
          </div>
        )}

        {!suggestions && !isLoading && expenses.length === 0 && (
          <p className="text-center text-muted-foreground text-sm">
            Ajoutez vos dépenses réelles ci-dessus pour obtenir des conseils personnalisés.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
