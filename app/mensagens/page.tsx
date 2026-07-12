import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { ensureVerified } from "@/lib/identity";
import BottomNav from "@/components/BottomNav";

export const revalidate = 0;

interface ConversationRow {
  conversation_id: string;
  listing_id: string;
  listing_title: string;
  other_name: string;
  i_am_seller: boolean;
  last_message_at: string;
  unread: boolean;
  last_body: string | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

export default async function MensagensPage() {
  const supabase = await createSupabaseServer();
  if (!supabase) redirect("/entrar");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  await ensureVerified(supabase, user.id);

  const { data } = await supabase.rpc("my_conversations");
  const conversations = (data ?? []) as ConversationRow[];

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-24 pt-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Mensagens</h1>
      <p className="mt-1 text-sm text-mute">
        Suas conversas com compradores e vendedores.
      </p>

      {conversations.length === 0 ? (
        <div className="mt-10 rounded-2xl bg-card p-6 text-center">
          <p className="text-sm text-mute">
            Você ainda não tem conversas. Abra um anúncio no{" "}
            <Link href="/feed" className="font-semibold text-emerald-500">
              Descobrir
            </Link>{" "}
            e toque em Contato para começar.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {conversations.map((c) => (
            <li key={c.conversation_id}>
              <Link
                href={`/mensagens/${c.conversation_id}`}
                className="flex items-center gap-3 rounded-2xl bg-card p-3.5 transition hover:bg-card-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{c.other_name}</p>
                    <span className="shrink-0 text-[11px] text-mute">
                      {timeAgo(c.last_message_at)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-emerald-600 dark:text-emerald-400">
                    {c.i_am_seller ? "Interessado em" : "Sobre"}:{" "}
                    {c.listing_title}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-mute">
                    {c.last_body ?? ""}
                  </p>
                </div>
                {c.unread && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500"
                    aria-label="Não lida"
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <BottomNav />
    </main>
  );
}
