import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  // Ensure Cloud env vars are available at build time.
  // If VITE_* are missing, fall back to Cloud-provided secrets exposed to the build.
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
    ),
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
