import { useState } from 'react';
import { useBudget } from '@/contexts/BudgetContext';
import { useAI } from '@/hooks/useAI';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
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
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-full bg-primary/10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            Analyse budgétaire IA
          </DialogTitle>
          <DialogDescription className="text-sm">
            Conseils personnalisés basés sur vos habitudes de dépenses
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0">
          {!suggestions ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="font-medium">Prêt à analyser votre budget</p>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  L'IA analysera vos enveloppes et dépenses pour vous proposer des conseils personnalisés.
                </p>
              </div>
              <Button
                onClick={handleGetSuggestions}
                disabled={isLoading || envelopes.length === 0}
                size="lg"
                className="gap-2 mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Lancer l'analyse
                  </>
                )}
              </Button>
              {envelopes.length === 0 && (
                <p className="text-sm text-destructive mt-2">
                  Créez d'abord des enveloppes pour obtenir des suggestions.
                </p>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[50vh] pr-4">
              <div className="ai-suggestions-content space-y-4">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-xl font-bold mb-3 text-foreground">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <div className="flex items-center gap-2 mt-5 mb-3">
                        <h2 className="text-base font-semibold text-foreground">{children}</h2>
                      </div>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold mt-4 mb-2 text-foreground">{children}</h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-foreground">{children}</strong>
                    ),
                    ul: ({ children }) => (
                      <ul className="space-y-2 my-3">{children}</ul>
                    ),
                    li: ({ children }) => (
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="leading-relaxed">{children}</span>
                      </li>
                    ),
                  }}
                >
                  {suggestions}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          )}
        </div>
        
        {suggestions && (
          <div className="flex gap-3 pt-4 border-t mt-auto">
            <Button
              variant="outline"
              onClick={() => {
                setSuggestions(null);
                handleGetSuggestions();
              }}
              disabled={isLoading}
              className="flex-1 gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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
      </DialogContent>
    </Dialog>
  );
}
