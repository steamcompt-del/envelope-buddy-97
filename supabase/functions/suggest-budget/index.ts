import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { envelopes, totalIncome, monthlyHistory } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const envelopeData = envelopes.map((e: { name: string; allocated: number; spent: number }) => 
      `${e.name}: alloué ${e.allocated}€, dépensé ${e.spent}€`
    ).join("\n");

    const historyText = monthlyHistory?.length > 0 
      ? `\n\nHistorique des mois précédents:\n${monthlyHistory.map((m: { month: string; envelopes: Array<{ name: string; spent: number }> }) => 
          `${m.month}: ${m.envelopes.map(e => `${e.name}: ${e.spent}€`).join(", ")}`
        ).join("\n")}`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          {
            role: "system",
            content: `Tu es un conseiller financier personnel. Tu aides à optimiser les budgets mensuels.
Analyse les dépenses et suggère des allocations budgétaires équilibrées.
Réponds en français de manière concise et pratique.`,
          },
          {
            role: "user",
            content: `Mon revenu mensuel est de ${totalIncome}€.

Mes enveloppes actuelles:
${envelopeData}${historyText}

Donne-moi 3 conseils personnalisés pour optimiser mon budget, et suggère des montants d'allocation pour chaque enveloppe.
Réponds sous forme de liste courte et actionnable.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez plus tard." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits épuisés, veuillez ajouter des crédits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erreur du service AI");
    }

    const data = await response.json();
    const suggestions = data.choices?.[0]?.message?.content || "Aucune suggestion disponible.";

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("suggest-budget error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
