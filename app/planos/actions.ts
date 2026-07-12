"use server";

import { createSupabaseServer } from "@/lib/supabase-server";

// Registra o interesse do usuário logado num plano/pacote (lead comercial).
export async function registerPlanInterest(
  planCode: string,
): Promise<{ ok: boolean; needsLogin?: boolean; error?: string }> {
  const supabase = await createSupabaseServer();
  if (!supabase) return { ok: false, error: "Serviço indisponível." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, needsLogin: true };

  const { error } = await supabase
    .from("plan_interests")
    .insert({ user_id: user.id, plan_code: planCode });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
