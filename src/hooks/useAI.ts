import { useState } from 'react';
import { toast } from 'sonner';

interface Envelope {
  id: string;
  name: string;
  allocated: number;
  spent: number;
}

async function getFunctionsClient() {
  // Avoid crashing the whole app if Cloud env vars haven't been injected yet.
  // We import lazily so the module isn't evaluated at app start.
  try {
    const mod = await import('@/integrations/supabase/client');
    return mod.supabase;
  } catch (e) {
    console.error('Supabase client import failed:', e);
    throw new Error(
      "Le backend n'est pas prêt (VITE_SUPABASE_URL manquant). Rafraîchis la page ou redémarre le preview."
    );
  }
}

export function useAI() {
  const [isLoading, setIsLoading] = useState(false);

  const categorizeExpense = async (
    description: string,
    envelopes: Envelope[]
  ): Promise<{ category: string; envelopeId: string | null } | null> => {
    if (envelopes.length === 0) return null;

    setIsLoading(true);
    try {
      const supabase = await getFunctionsClient();

      const { data, error } = await supabase.functions.invoke('categorize-expense', {
        body: {
          description,
          envelopes: envelopes.map((e) => ({ id: e.id, name: e.name })),
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error categorizing expense:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la catégorisation automatique'
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const suggestBudget = async (
    envelopes: Envelope[],
    totalIncome: number,
    monthlyHistory?: Array<{ month: string; envelopes: Array<{ name: string; spent: number }> }>
  ): Promise<string | null> => {
    setIsLoading(true);
    try {
      const supabase = await getFunctionsClient();

      const { data, error } = await supabase.functions.invoke('suggest-budget', {
        body: { envelopes, totalIncome, monthlyHistory },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      return data?.suggestions ?? null;
    } catch (error) {
      console.error('Error getting budget suggestions:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la récupération des suggestions'
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    categorizeExpense,
    suggestBudget,
  };
}
