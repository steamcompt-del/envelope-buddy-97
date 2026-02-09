import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Icon mapping for common expense categories
const iconMapping: Record<string, { icon: string; color: string }> = {
  courses: { icon: "ShoppingCart", color: "green" },
  alimentation: { icon: "ShoppingCart", color: "green" },
  nourriture: { icon: "ShoppingCart", color: "green" },
  supermarché: { icon: "ShoppingCart", color: "green" },
  restaurant: { icon: "Utensils", color: "orange" },
  resto: { icon: "Utensils", color: "orange" },
  transport: { icon: "Car", color: "blue" },
  essence: { icon: "Fuel", color: "blue" },
  carburant: { icon: "Fuel", color: "blue" },
  loisirs: { icon: "Gamepad2", color: "purple" },
  divertissement: { icon: "Gamepad2", color: "purple" },
  santé: { icon: "Heart", color: "pink" },
  pharmacie: { icon: "Heart", color: "pink" },
  médecin: { icon: "Heart", color: "pink" },
  shopping: { icon: "ShoppingBag", color: "yellow" },
  vêtements: { icon: "Shirt", color: "yellow" },
  factures: { icon: "Receipt", color: "teal" },
  électricité: { icon: "Zap", color: "teal" },
  internet: { icon: "Wifi", color: "teal" },
  téléphone: { icon: "Phone", color: "teal" },
  loyer: { icon: "Home", color: "slate" },
  logement: { icon: "Home", color: "slate" },
  épargne: { icon: "PiggyBank", color: "green" },
  économies: { icon: "PiggyBank", color: "green" },
  abonnements: { icon: "CreditCard", color: "indigo" },
  streaming: { icon: "Play", color: "red" },
  cadeaux: { icon: "Gift", color: "pink" },
  animaux: { icon: "PawPrint", color: "amber" },
  éducation: { icon: "GraduationCap", color: "blue" },
  voyages: { icon: "Plane", color: "sky" },
  vacances: { icon: "Umbrella", color: "sky" },
  sport: { icon: "Dumbbell", color: "emerald" },
  beauté: { icon: "Sparkles", color: "pink" },
  assurance: { icon: "Shield", color: "slate" },
  impôts: { icon: "Landmark", color: "slate" },
};

function getIconForCategory(categoryName: string): { icon: string; color: string } {
  const lowerName = categoryName.toLowerCase();
  for (const [key, value] of Object.entries(iconMapping)) {
    if (lowerName.includes(key)) {
      return value;
    }
  }
  return { icon: "Wallet", color: "blue" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { envelopes, totalIncome, monthlyHistory, mode } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Mode "create" = suggest new envelopes with allocations
    if (mode === "create") {
      const expenseData = envelopes.map((e: { name: string; spent: number }) => 
        `- ${e.name}: ${e.spent}€`
      ).join("\n");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `Tu es un expert en gestion budgétaire. Analyse les dépenses fournies et suggère des enveloppes budgétaires adaptées.

IMPORTANT: Tu dois répondre UNIQUEMENT avec un JSON valide sans texte additionnel.

Le JSON doit avoir cette structure exacte:
{
  "envelopes": [
    {
      "name": "Nom de l'enveloppe",
      "allocation": 150,
      "reasoning": "Explication courte"
    }
  ],
  "summary": "Résumé des suggestions en 2-3 phrases"
}

Règles:
- Crée des enveloppes logiques basées sur les catégories de dépenses
- L'allocation suggérée doit être légèrement supérieure aux dépenses réelles (marge de 10-20%)
- Si le revenu total est fourni, assure-toi que le total des allocations ne dépasse pas ce revenu
- Limite à 8-10 enveloppes maximum
- Utilise des noms d'enveloppe clairs et simples en français`,
            },
            {
              role: "user",
              content: `Revenu mensuel: ${totalIncome}€

Dépenses réelles du mois:
${expenseData}

Suggère des enveloppes budgétaires adaptées avec les montants d'allocation appropriés.`,
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
      const content = data.choices?.[0]?.message?.content;
      
      try {
        const parsed = JSON.parse(content);
        
        // Add icons and colors to each envelope
        const enrichedEnvelopes = parsed.envelopes.map((env: { name: string; allocation: number; reasoning: string }) => {
          const { icon, color } = getIconForCategory(env.name);
          return {
            ...env,
            icon,
            color,
          };
        });

        return new Response(
          JSON.stringify({ 
            envelopes: enrichedEnvelopes,
            summary: parsed.summary,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (parseError) {
        console.error("Failed to parse AI response:", content);
        return new Response(
          JSON.stringify({ error: "Erreur lors de l'analyse de la réponse IA" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Default mode: just get text suggestions
    const envelopeData = envelopes.map((e: { name: string; allocated: number; spent: number }) => 
      `${e.name}: alloué ${e.allocated}€, dépensé ${e.spent}€`
    ).join("\n");

    const historyText = monthlyHistory?.length > 0 
      ? `\n\nHistorique des mois précédents:\n${monthlyHistory.map((m: { month: string; envelopes: Array<{ name: string; spent: number }> }) => 
          `${m.month}: ${m.envelopes.map(e => `${e.name}: ${e.spent}€`).join(", ")}`
        ).join("\n")}`
      : "";

    // Calculate spending analysis
    const spendingAnalysis = envelopes.map((e: { name: string; allocated: number; spent: number }) => {
      const percentUsed = e.allocated > 0 ? Math.round((e.spent / e.allocated) * 100) : 0;
      const status = percentUsed > 100 ? 'DÉPASSÉ' : percentUsed > 80 ? 'ATTENTION' : 'OK';
      return `- ${e.name}: ${e.spent}€ dépensés sur ${e.allocated}€ alloués (${percentUsed}%) [${status}]`;
    }).join("\n");

    const totalSpent = envelopes.reduce((sum: number, e: { spent: number }) => sum + e.spent, 0);
    const totalAllocated = envelopes.reduce((sum: number, e: { allocated: number }) => sum + e.allocated, 0);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Tu es un coach budgétaire personnel expert. Tu analyses UNIQUEMENT les dépenses et la gestion du budget de l'utilisateur.

RÈGLES STRICTES:
- Parle UNIQUEMENT de ses dépenses, enveloppes et budget
- Identifie les catégories où il dépense trop par rapport à son allocation
- Compare ses dépenses à des ratios budgétaires sains (ex: courses max 15-20% du revenu, loisirs max 10%, etc.)
- Donne des conseils CONCRETS et PERSONNALISÉS basés sur SES données
- Si une enveloppe est dépassée, explique pourquoi c'est problématique
- Suggère des ajustements de budget réalistes
- Sois direct et pratique, pas de généralités

FORMAT DE RÉPONSE:
1. 📊 **Analyse de tes dépenses** - Points clés sur ses habitudes
2. ⚠️ **Alertes** - Catégories problématiques (si applicable)
3. 💡 **Conseils personnalisés** - 2-3 actions concrètes

Réponds en français, sois concis mais percutant.`,
          },
          {
            role: "user",
            content: `Analyse mon budget:

💰 Revenu mensuel: ${totalIncome}€
📊 Total alloué: ${totalAllocated}€
💸 Total dépensé: ${totalSpent}€
📈 Reste à budgétiser: ${totalIncome - totalAllocated}€

Détail par enveloppe:
${spendingAnalysis}${historyText}

Dis-moi si je dépense trop dans certaines catégories et comment améliorer ma gestion.`,
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
