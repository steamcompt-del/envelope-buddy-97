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

// ─── Retry with exponential backoff ──────────────────────────────

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) return response;

      if (response.status === 429 || response.status >= 500) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[scan-receipt] ${response.status}, retry in ${delay}ms (${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Non-retryable error
      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxRetries - 1) throw lastError;
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`[scan-receipt] Network error, retry in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageBase64, mimeType, userEnvelopes } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image base64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build category instruction based on user envelopes
    const categoryInstruction =
      userEnvelopes && userEnvelopes.length > 0
        ? `Choisis OBLIGATOIREMENT parmi ces catégories : ${userEnvelopes.join(", ")}. Utilise celle qui correspond le mieux.`
        : `Choisis une catégorie parmi: Courses, Restaurant, Transport, Loisirs, Santé, Shopping, Factures`;

    const response = await fetchWithRetry(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
  "category": "${categoryInstruction}",
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
- Si tu ne peux pas lire le montant total, calcule-le à partir des articles
- NE RETOURNE JAMAIS un amount de 0 si des articles sont visibles`,
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
      },
      3,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", errorText);
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let result: ScanResult;
    try {
      const cleanedContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      result = JSON.parse(cleanedContent);

      if (!result.items || !Array.isArray(result.items)) {
        result.items = [];
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return an explicit error instead of silent fallback
      return new Response(
        JSON.stringify({
          error:
            "Impossible d'analyser le ticket. L'image est peut-être floue ou le format inhabituel. Réessayez avec une photo plus nette.",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in scan-receipt:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Une erreur est survenue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
