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
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? "";
  return key;
}

export function getBackendClient(): SupabaseClient {
  if (client) return client;

  const url = resolveBackendUrl();
  const key = resolvePublishableKey();

  if (!url) {
    throw new Error(
      "Le backend n'est pas prêt (URL manquante). Clique sur ↻ puis réessaie."
    );
  }
  if (!key) {
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
