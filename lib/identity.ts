import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

// A verificação de identidade só é exigida quando o serviço de facematch está
// configurado (FACE_VERIFY_URL). Antes disso o gate fica dormente, para não
// travar o app enquanto o serviço não está no ar. Uma vez configurado, passa a
// valer para todo mundo que ainda não é verificado.
export function verificationEnabled() {
  return Boolean(process.env.FACE_VERIFY_URL);
}

// Redireciona para a verificação de identidade quando o usuário logado ainda
// não passou pelo facematch. Usar nas páginas/ações que exigem conta verificada.
export async function ensureVerified(supabase: SupabaseClient, userId: string) {
  if (!verificationEnabled()) return;
  const { data } = await supabase
    .from("profiles")
    .select("identity_verified")
    .eq("id", userId)
    .single();
  if (!data?.identity_verified) redirect("/verificar-identidade");
}
