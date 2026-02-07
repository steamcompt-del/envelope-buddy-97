import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function resolveBackendUrl(): string {
  const explicit = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (explicit && explicit.length > 0) return explicit;

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
  if (projectId && projectId.length > 0) {
    // Fallback: build the backend URL from the project id
    return `https://${projectId}.supabase.co`;
  }

  return "";
}

function resolvePublishableKey(): string {
  // Lovable Cloud normally injects this as a VITE_* variable.
  // Some setups expose the anon key under different names.
  const key =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
    (import.meta.env.SUPABASE_ANON_KEY as string | undefined) ??
    "";

  // Last-resort fallback (public key) to avoid being blocked by missing env injection.
  // Note: This is a publishable key and safe to ship to the browser.
  return key ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljemJrb2lyd2J1Z3VscWRsc2FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MDQzMjUsImV4cCI6MjA4NjA4MDMyNX0.k5h93tpvXbCHTF7Fmm_WczgHuw7_Fnwkq7PselY_NoY";
}

export function getBackendClient(): SupabaseClient {
  if (client) return client;

  const url = resolveBackendUrl();
  const key = resolvePublishableKey();

  if (!url) {
    console.warn("[backendClient] Missing backend URL. env keys present:", {
      hasViteUrl: Boolean(import.meta.env.VITE_SUPABASE_URL),
      hasProjectId: Boolean(import.meta.env.VITE_SUPABASE_PROJECT_ID),
    });
    throw new Error(
      "Le backend n'est pas prêt (URL manquante). Clique sur ↻ puis réessaie."
    );
  }
  if (!key) {
    console.warn("[backendClient] Missing publishable key. env keys present:", {
      hasVitePublishable: Boolean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
      hasViteAnon: Boolean((import.meta.env as any).VITE_SUPABASE_ANON_KEY),
      hasAnon: Boolean((import.meta.env as any).SUPABASE_ANON_KEY),
    });
    throw new Error(
      "Le backend n'est pas prêt (clé manquante). Clique sur ↻ puis réessaie."
    );
  }

  client = createClient(url, key, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return client;
}
