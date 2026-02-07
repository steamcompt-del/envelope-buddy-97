import { useState } from 'react';
import { useBudget } from '@/contexts/BudgetContext';
import { useAI } from '@/hooks/useAI';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface BudgetSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BudgetSuggestionsDialog({ open, onOpenChange }: BudgetSuggestionsDialogProps) {
  const { envelopes, incomes, months, currentMonthKey } = useBudget();
  const { suggestBudget, isLoading } = useAI();
  const [suggestions, setSuggestions] = useState<string | null>(null);

  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);

  // Get history from previous months
  const getMonthlyHistory = () => {
    const sortedMonths = Object.keys(months).sort().reverse();
    const history: Array<{ month: string; envelopes: Array<{ name: string; spent: number }> }> = [];
    
    for (const monthKey of sortedMonths) {
      if (monthKey === currentMonthKey) continue;
      if (history.length >= 3) break; // Max 3 months of history
      
      const month = months[monthKey];
      history.push({
        month: monthKey,
        envelopes: month.envelopes.map(e => ({ name: e.name, spent: e.spent }))
      });
    }
    
    return history;
  };

  const handleGetSuggestions = async () => {
    const history = getMonthlyHistory();
    const result = await suggestBudget(envelopes, totalIncome, history);
    if (result) {
      setSuggestions(result);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Suggestions de budget IA
          </DialogTitle>
          <DialogDescription>
            Obtenez des conseils personnalisés basés sur vos habitudes de dépenses.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          {!suggestions ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                L'IA analysera vos enveloppes et votre historique pour vous proposer des optimisations budgétaires.
              </p>
              <Button
                onClick={handleGetSuggestions}
                disabled={isLoading || envelopes.length === 0}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Obtenir des suggestions
                  </>
                )}
              </Button>
              {envelopes.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Créez d'abord des enveloppes pour obtenir des suggestions.
                </p>
              )}
            </div>
          ) : (
            <ScrollArea className="max-h-[50vh] pr-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{suggestions}</ReactMarkdown>
              </div>
            </ScrollArea>
          )}
          
          {suggestions && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setSuggestions(null)}
                className="flex-1"
              >
                Nouvelle analyse
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Fermer
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
