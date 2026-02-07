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
    const { description, envelopes } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const envelopeNames = envelopes.map((e: { name: string }) => e.name).join(", ");

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
            content: `Tu es un assistant de catégorisation de dépenses. L'utilisateur a les enveloppes budgétaires suivantes : ${envelopeNames}. 
Quand on te donne une description de dépense, tu dois retourner le nom de l'enveloppe la plus appropriée.
Retourne UNIQUEMENT le nom exact de l'enveloppe, sans explication. Si aucune enveloppe ne correspond, retourne "Autre".`,
          },
          {
            role: "user",
            content: `Catégorise cette dépense : "${description}"`,
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
    const suggestedCategory = data.choices?.[0]?.message?.content?.trim() || "Autre";

    // Find matching envelope
    const matchedEnvelope = envelopes.find(
      (e: { id: string; name: string }) => 
        e.name.toLowerCase() === suggestedCategory.toLowerCase()
    );

    return new Response(
      JSON.stringify({ 
        category: suggestedCategory,
        envelopeId: matchedEnvelope?.id || null 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("categorize-expense error:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
