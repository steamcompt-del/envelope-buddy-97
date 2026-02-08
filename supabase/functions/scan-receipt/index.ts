import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number | null;
  total_price: number;
}

interface ScanResult {
  merchant: string;
  amount: number;
  category: string;
  description: string;
  items: ReceiptItem[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image base64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Lovable AI with vision capability
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Tu es un assistant spécialisé dans l'extraction de données de tickets de caisse.
                
Analyse cette image de ticket de caisse et extrais les informations suivantes au format JSON:
{
  "merchant": "nom du magasin/commerce",
  "amount": nombre (montant total en euros, sans symbole €),
  "category": "une catégorie parmi: Courses, Restaurant, Transport, Loisirs, Santé, Shopping, Factures",
  "description": "description courte de l'achat",
  "items": [
    {
      "name": "nom de l'article",
      "quantity": nombre (quantité, 1 par défaut),
      "unit_price": nombre ou null (prix unitaire si indiqué),
      "total_price": nombre (prix total pour cet article)
    }
  ]
}

IMPORTANT: 
- Réponds UNIQUEMENT avec le JSON, sans texte avant ou après
- Le montant doit être un nombre décimal (ex: 45.50)
- Extrais TOUS les articles visibles sur le ticket avec leurs prix
- Si la quantité n'est pas spécifiée, mets 1
- Si le prix unitaire n'est pas visible, mets null
- Le total_price est obligatoire pour chaque article
- Si tu ne peux pas lire une information, fais une estimation raisonnable basée sur le contexte`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", errorText);
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the JSON response
    let result: ScanResult;
    try {
      // Remove potential markdown code blocks
      const cleanedContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      result = JSON.parse(cleanedContent);
      
      // Ensure items array exists
      if (!result.items || !Array.isArray(result.items)) {
        result.items = [];
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return default values if parsing fails
      result = {
        merchant: "Inconnu",
        amount: 0,
        category: "Shopping",
        description: "Achat",
        items: [],
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in scan-receipt:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Une erreur est survenue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
