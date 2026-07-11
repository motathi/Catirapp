"use server";

import { createSupabaseServer } from "@/lib/supabase-server";

export interface ChatMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

type StartResult =
  | { ok: true; conversationId: string }
  | { ok: false; error: string; needsLogin?: boolean };

// Inicia (ou reaproveita) a conversa com o dono do anúncio e envia a 1ª mensagem
export async function startListingMessage(
  listingId: string,
  body: string,
): Promise<StartResult> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Escreva uma mensagem." };

  const supabase = await createSupabaseServer();
  if (!supabase) return { ok: false, error: "Serviço indisponível." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { ok: false, error: "Entre para enviar mensagem.", needsLogin: true };

  const { data, error } = await supabase.rpc("send_listing_message", {
    p_listing_id: listingId,
    p_body: text,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, conversationId: data as string };
}

type SendResult =
  | { ok: true; message: ChatMessage }
  | { ok: false; error: string };

// Envia mensagem numa conversa já existente
export async function sendConversationMessage(
  conversationId: string,
  body: string,
): Promise<SendResult> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Escreva uma mensagem." };

  const supabase = await createSupabaseServer();
  if (!supabase) return { ok: false, error: "Serviço indisponível." };

  const { data, error } = await supabase.rpc("send_conversation_message", {
    p_conversation_id: conversationId,
    p_body: text,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, message: data as ChatMessage };
}
