import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FrequentItem {
  name: string;
  count: number;
  avgPrice: number;
}

interface CurrentItem {
  name: string;
}

interface AISuggestion {
  name: string;
  reason: string;
}

export function useAISuggestions() {
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const fetchAISuggestions = useCallback(async (
    frequentItems: FrequentItem[],
    currentItems: CurrentItem[]
  ) => {
    if (frequentItems.length === 0) {
      setAiSuggestions([]);
      return;
    }

    setIsLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-shopping-items', {
        body: {
          frequentItems,
          currentItems,
        },
      });

      if (error) {
        console.error('AI suggestions error:', error);
        // Don't show error toast for AI suggestions - it's a nice-to-have feature
        setAiSuggestions([]);
        return;
      }

      setAiSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Failed to fetch AI suggestions:', error);
      setAiSuggestions([]);
    } finally {
      setIsLoadingAI(false);
    }
  }, []);

  const clearAISuggestions = useCallback(() => {
    setAiSuggestions([]);
  }, []);

  const dismissSuggestion = useCallback((name: string) => {
    setAiSuggestions(prev => prev.filter(s => s.name !== name));
  }, []);

  return {
    aiSuggestions,
    isLoadingAI,
    fetchAISuggestions,
    clearAISuggestions,
    dismissSuggestion,
  };
}
