import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Client com SERVICE ROLE (ignora RLS). Uso EXCLUSIVO server-side — nunca
// importar em componente client. Serve para operações privilegiadas que o
// usuário não pode fazer sozinho, como marcar a identidade como verificada
// (protegida por trigger contra escrita do próprio usuário).
export function createSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
