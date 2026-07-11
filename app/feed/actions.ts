"use server";

import { createSupabaseServer } from "@/lib/supabase-server";

// Persiste o favorito no banco quando há usuário logado. Visitantes anônimos
// (o feed é público) continuam salvando localmente no navegador — ver
// components/ListingActions.tsx.
export async function toggleSavedListing(
  listingId: string,
): Promise<{ authenticated: boolean; saved: boolean }> {
  const supabase = await createSupabaseServer();
  if (!supabase) return { authenticated: false, saved: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { authenticated: false, saved: false };

  const { data, error } = await supabase.rpc("toggle_saved_listing", {
    p_listing_id: listingId,
  });
  if (error) {
    console.error("Erro ao salvar favorito:", error.message);
    return { authenticated: true, saved: false };
  }

  return { authenticated: true, saved: Boolean(data) };
}
