import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, Wand2, Check, Info } from 'lucide-react';
import { getBackendClient } from '@/lib/backendClient';
import { toast } from 'sonner';
import { PlanningExpense } from './PlanningExpensesList';
import { formatCurrency } from '@/lib/utils';
import { useBudget } from '@/contexts/BudgetContext';
import * as LucideIcons from 'lucide-react';

interface SuggestedEnvelope {
  name: string;
  allocation: number;
  reasoning: string;
  icon: string;
  color: string;
  selected: boolean;
}

interface AIEnvelopeCreatorProps {
  expenses: PlanningExpense[];
  totalIncome: number;
  categories: Array<{ id: string; name: string }>;
}

export function AIEnvelopeCreator({ expenses, totalIncome, categories }: AIEnvelopeCreatorProps) {
  const { createEnvelope, allocateToEnvelope, envelopes, toBeBudgeted, refreshData } = useBudget();
  const [suggestedEnvelopes, setSuggestedEnvelopes] = useState<SuggestedEnvelope[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const getSuggestions = async () => {
    if (expenses.length === 0) {
      toast.error('Ajoutez des dépenses pour obtenir des suggestions');
      return;
    }

    setIsLoading(true);
    setSuggestedEnvelopes([]);
    setSummary(null);

    try {
      // Build expense summary - use description as category if uncategorized
      const totalByCategory = expenses.reduce((acc, exp) => {
        const catName = exp.category === 'uncategorized' 
          ? exp.description 
          : (categories.find(c => c.id === exp.category)?.name || exp.description);
        acc[catName] = (acc[catName] || 0) + exp.amount;
        return acc;
      }, {} as Record<string, number>);

      const envelopesData = Object.entries(totalByCategory).map(([name, spent]) => ({
        name,
        spent,
      }));

      const supabase = getBackendClient();
      const { data, error } = await supabase.functions.invoke('suggest-budget', {
        body: {
          envelopes: envelopesData,
          totalIncome,
          mode: 'create',
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.envelopes) {
        setSuggestedEnvelopes(data.envelopes.map((env: Omit<SuggestedEnvelope, 'selected'>) => ({
          ...env,
          selected: true,
        })));
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      toast.error('Erreur lors de la génération des suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEnvelope = (index: number) => {
    setSuggestedEnvelopes(prev => 
      prev.map((env, i) => i === index ? { ...env, selected: !env.selected } : env)
    );
  };

  const applySelectedEnvelopes = async () => {
    const selected = suggestedEnvelopes.filter(env => env.selected);
    if (selected.length === 0) {
      toast.error('Sélectionnez au moins une enveloppe');
      return;
    }

    setIsApplying(true);
    
    try {
      let created = 0;
      let allocated = 0;

      for (const env of selected) {
        // Check if envelope already exists
        const existingEnvelope = envelopes.find(
          e => e.name.toLowerCase() === env.name.toLowerCase()
        );

        if (!existingEnvelope) {
          // Create new envelope
          await createEnvelope(env.name, env.icon, env.color);
          created++;
        }
      }

      // Refresh data to get new envelope IDs
      await refreshData();

      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success(
        `${created} enveloppe(s) créée(s). Utilisez "Allouer" sur chaque enveloppe pour définir les budgets.`
      );

      // Clear suggestions after applying
      setSuggestedEnvelopes([]);
      setSummary(null);
    } catch (error) {
      console.error('Error applying envelopes:', error);
      toast.error('Erreur lors de la création des enveloppes');
    } finally {
      setIsApplying(false);
    }
  };

  const selectedTotal = suggestedEnvelopes
    .filter(env => env.selected)
    .reduce((sum, env) => sum + env.allocation, 0);

  const grandTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Dynamic icon component
  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      ShoppingCart: LucideIcons.ShoppingCart,
      Utensils: LucideIcons.Utensils,
      Car: LucideIcons.Car,
      Fuel: LucideIcons.Fuel,
      Gamepad2: LucideIcons.Gamepad2,
      Heart: LucideIcons.Heart,
      ShoppingBag: LucideIcons.ShoppingBag,
      Shirt: LucideIcons.Shirt,
      Receipt: LucideIcons.Receipt,
      Zap: LucideIcons.Zap,
      Wifi: LucideIcons.Wifi,
      Phone: LucideIcons.Phone,
      Home: LucideIcons.Home,
      PiggyBank: LucideIcons.PiggyBank,
      CreditCard: LucideIcons.CreditCard,
      Play: LucideIcons.Play,
      Gift: LucideIcons.Gift,
      PawPrint: LucideIcons.PawPrint,
      GraduationCap: LucideIcons.GraduationCap,
      Plane: LucideIcons.Plane,
      Umbrella: LucideIcons.Umbrella,
      Dumbbell: LucideIcons.Dumbbell,
      Sparkles: LucideIcons.Sparkles,
      Shield: LucideIcons.Shield,
      Landmark: LucideIcons.Landmark,
      Wallet: LucideIcons.Wallet,
    };
    const IconComponent = icons[iconName] || LucideIcons.Wallet;
    return <IconComponent className="h-5 w-5" />;
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          Créer des enveloppes avec l'IA
        </CardTitle>
        <CardDescription>
          L'IA analyse vos dépenses et crée des enveloppes avec les budgets adaptés
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {expenses.length > 0 && !suggestedEnvelopes.length && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Basé sur {expenses.length} dépense(s) totalisant {formatCurrency(grandTotal)}
            </p>
            {totalIncome > 0 && (
              <p className="mt-1">Revenu prévu: {formatCurrency(totalIncome)}</p>
            )}
          </div>
        )}

        {!suggestedEnvelopes.length && (
          <Button
            onClick={getSuggestions}
            disabled={isLoading || expenses.length === 0}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Générer des enveloppes
              </>
            )}
          </Button>
        )}

        {summary && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm">{summary}</p>
          </div>
        )}

        {suggestedEnvelopes.length > 0 && (
          <>
            <ScrollArea className="max-h-[350px]">
              <div className="space-y-2 pr-2">
                {suggestedEnvelopes.map((env, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      env.selected 
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-muted/30 border-muted'
                    }`}
                    onClick={() => toggleEnvelope(index)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={env.selected}
                        onCheckedChange={() => toggleEnvelope(index)}
                        className="mt-1"
                      />
                      <div className="p-2 rounded-lg bg-muted">
                        {getIcon(env.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-medium">{env.name}</p>
                          <p className="font-bold text-primary">
                            {formatCurrency(env.allocation)}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {env.reasoning}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="pt-4 border-t space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {suggestedEnvelopes.filter(e => e.selected).length} enveloppe(s) sélectionnée(s)
                </span>
                <span className="font-bold">
                  Total: {formatCurrency(selectedTotal)}
                </span>
              </div>

              {toBeBudgeted < selectedTotal && (
                <p className="text-sm text-destructive">
                  ⚠️ Le total dépasse votre budget disponible ({formatCurrency(toBeBudgeted)})
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSuggestedEnvelopes([]);
                    setSummary(null);
                  }}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={applySelectedEnvelopes}
                  disabled={isApplying || suggestedEnvelopes.filter(e => e.selected).length === 0}
                  className="flex-1"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Créer les enveloppes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {!suggestedEnvelopes.length && !isLoading && expenses.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-4">
            Ajoutez vos dépenses ci-dessus pour que l'IA puisse créer des enveloppes adaptées.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
