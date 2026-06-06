import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client côté serveur (service_role — bypass RLS)
// NE JAMAIS exposer cette clé côté client.
// Utilisé exclusivement dans les routes API et les Server Components.
export function getSupabaseServerClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
