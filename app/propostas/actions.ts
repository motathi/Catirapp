"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
import type { AssetCategory } from "@/lib/listings";

export interface InventoryItem {
  id: string;
  title: string;
  category: AssetCategory;
  estimated_value: number | null;
}

// Estoque (garagem digital) do usuário logado, para montar a proposta
export async function getMyAssets(): Promise<{
  ok: boolean;
  needsLogin?: boolean;
  assets: InventoryItem[];
}> {
  const supabase = await createSupabaseServer();
  if (!supabase) return { ok: false, assets: [] };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, needsLogin: true, assets: [] };

  const { data, error } = await supabase
    .from("assets")
    .select("id, title, category, estimated_value")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, assets: [] };
  return {
    ok: true,
    assets: (data ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      category: a.category as AssetCategory,
      estimated_value:
        a.estimated_value == null ? null : Number(a.estimated_value),
    })),
  };
}

export type CashDirection = "none" | "proposer_pays" | "seller_pays";

type SendResult =
  | { ok: true; proposalId: string }
  | { ok: false; error: string; needsLogin?: boolean };

// Envia a proposta de catira
export async function sendTradeProposal(input: {
  listingId: string;
  assetIds: string[];
  cashAmount: number;
  cashDirection: CashDirection;
  message?: string;
}): Promise<SendResult> {
  if (input.assetIds.length === 0)
    return { ok: false, error: "Selecione ao menos um item do seu estoque." };

  const supabase = await createSupabaseServer();
  if (!supabase) return { ok: false, error: "Serviço indisponível." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { ok: false, error: "Entre para enviar proposta.", needsLogin: true };

  const { data, error } = await supabase.rpc("send_trade_proposal", {
    p_listing_id: input.listingId,
    p_asset_ids: input.assetIds,
    p_cash_amount: input.cashDirection === "none" ? 0 : input.cashAmount,
    p_cash_direction: input.cashDirection,
    p_message: input.message ?? null,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, proposalId: data as string };
}

export async function respondTradeProposal(
  proposalId: string,
  accept: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServer();
  if (!supabase) return { ok: false, error: "Serviço indisponível." };
  const { error } = await supabase.rpc("respond_trade_proposal", {
    p_proposal_id: proposalId,
    p_accept: accept,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function cancelTradeProposal(
  proposalId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServer();
  if (!supabase) return { ok: false, error: "Serviço indisponível." };
  const { error } = await supabase.rpc("cancel_trade_proposal", {
    p_proposal_id: proposalId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
