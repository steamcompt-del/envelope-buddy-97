import { useState } from 'react';
import { toast } from 'sonner';
import { getBackendClient } from '@/lib/backendClient';

interface Envelope {
  id: string;
  name: string;
  allocated: number;
  spent: number;
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
      const supabase = getBackendClient();

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
      const supabase = getBackendClient();

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
