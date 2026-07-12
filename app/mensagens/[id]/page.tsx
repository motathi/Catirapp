import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { ensureVerified } from "@/lib/identity";
import Conversation from "@/components/Conversation";
import type { ChatMessage } from "@/app/mensagens/actions";

export const revalidate = 0;

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServer();
  if (!supabase) redirect("/entrar");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  await ensureVerified(supabase, user.id);

  // A RLS garante que só os participantes leem a conversa
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, listing_id, buyer_id, seller_id, listings(brand, model)")
    .eq("id", id)
    .maybeSingle();
  if (!conv) notFound();

  const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
  const [{ data: other }, { data: msgs }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", otherId).maybeSingle(),
    supabase
      .from("conversation_messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", id)
      .order("created_at"),
  ]);

  // Marca como lida ao abrir
  await supabase.rpc("mark_conversation_read", { p_conversation_id: id });

  const listing = Array.isArray(conv.listings)
    ? conv.listings[0]
    : conv.listings;
  const listingTitle = listing
    ? `${listing.brand} ${listing.model}`
    : "Anúncio";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur">
        <Link href="/mensagens" className="text-xl text-mute" aria-label="Voltar">
          ‹
        </Link>
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {other?.display_name ?? "Usuário"}
          </p>
          <Link
            href={`/anuncio/${conv.listing_id}`}
            className="truncate text-xs text-emerald-600 dark:text-emerald-400"
          >
            {listingTitle}
          </Link>
        </div>
      </header>

      <Conversation
        conversationId={id}
        currentUserId={user.id}
        initialMessages={(msgs ?? []) as ChatMessage[]}
      />
    </main>
  );
}
