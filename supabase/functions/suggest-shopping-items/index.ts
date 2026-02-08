import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface FrequentItem {
  name: string;
  count: number;
  avgPrice: number;
}

interface CurrentItem {
  name: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { frequentItems, currentItems } = await req.json() as {
      frequentItems: FrequentItem[];
      currentItems: CurrentItem[];
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from purchase history
    const historyContext = frequentItems
      .slice(0, 20)
      .map(item => `${item.name} (acheté ${item.count} fois, ~${item.avgPrice.toFixed(2)}€)`)
      .join(", ");

    const currentItemsContext = currentItems.length > 0
      ? `Articles déjà dans la liste : ${currentItems.map(i => i.name).join(", ")}`
      : "La liste est vide pour le moment.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Tu es un assistant intelligent pour une liste de courses. Tu analyses l'historique d'achat de l'utilisateur pour suggérer des articles pertinents qu'il pourrait avoir besoin d'acheter.

Règles importantes :
- Suggère des articles basés sur les habitudes d'achat (fréquence, associations courantes)
- Ne suggère PAS d'articles déjà dans la liste actuelle
- Propose des articles complémentaires logiques (ex: si "pâtes" est fréquent, suggère "sauce tomate")
- Limite-toi à 5 suggestions maximum
- Sois concis avec des noms d'articles courts

Retourne UNIQUEMENT un JSON valide avec ce format :
{"suggestions": [{"name": "Article", "reason": "Courte raison"}]}`,
          },
          {
            role: "user",
            content: `Historique d'achats fréquents : ${historyContext}

${currentItemsContext}

Suggère des articles à ajouter à la liste de courses.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez plus tard.", suggestions: [] }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits épuisés.", suggestions: [] }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erreur du service AI");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "{}";

    // Parse AI response
    let suggestions: Array<{ name: string; reason: string }> = [];
    try {
      // Extract JSON from response (might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestions = parsed.suggestions || [];
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content, parseError);
      suggestions = [];
    }

    // Filter out items already in list
    const currentItemNames = currentItems.map(i => i.name.toLowerCase());
    suggestions = suggestions.filter(
      s => !currentItemNames.includes(s.name.toLowerCase())
    );

    return new Response(
      JSON.stringify({ suggestions: suggestions.slice(0, 5) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("suggest-shopping-items error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(
      JSON.stringify({ error: errorMessage, suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
