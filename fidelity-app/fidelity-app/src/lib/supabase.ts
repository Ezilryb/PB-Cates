import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client côté navigateur (clé publique anon, RLS actif)
// Utilisé UNIQUEMENT pour les opérations ne nécessitant pas d'accès privilégié.
// La plupart des opérations passent par les routes API qui utilisent supabase-server.
let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}
