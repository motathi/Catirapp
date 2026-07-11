import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import BottomNav from "@/components/BottomNav";
import ProposalActions from "@/components/ProposalActions";
import { formatBRL } from "@/lib/listings";

export const revalidate = 0;

type CashDirection = "none" | "proposer_pays" | "seller_pays";
type Status = "pending" | "accepted" | "rejected" | "cancelled";

interface ProposalRow {
  proposal_id: string;
  listing_id: string;
  listing_title: string;
  role: "sent" | "received";
  other_name: string;
  cash_amount: number;
  cash_direction: CashDirection;
  status: Status;
  message: string | null;
  created_at: string;
  items: { title: string; value: number | null }[];
}

const statusLabel: Record<Status, string> = {
  pending: "Pendente",
  accepted: "Aceita",
  rejected: "Recusada",
  cancelled: "Cancelada",
};

const statusClass: Record<Status, string> = {
  pending:
    "bg-amber-400/20 text-amber-700 dark:text-amber-300",
  accepted:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-card-2 text-mute",
  cancelled: "bg-card-2 text-mute",
};

// Frase da volta em dinheiro, do ponto de vista de quem está lendo
function cashPhrase(row: ProposalRow): string | null {
  if (row.cash_direction === "none" || !row.cash_amount) return null;
  const v = formatBRL(Number(row.cash_amount));
  const iAmProposer = row.role === "sent";
  if (row.cash_direction === "proposer_pays") {
    return iAmProposer ? `Você paga ${v} a mais` : `Você recebe ${v} a mais`;
  }
  return iAmProposer ? `Você recebe ${v} de volta` : `Você paga ${v} de volta`;
}

function ProposalCard({ row }: { row: ProposalRow }) {
  const cash = cashPhrase(row);
  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/anuncio/${row.listing_id}`}
            className="font-semibold text-emerald-600 dark:text-emerald-400"
          >
            {row.listing_title}
          </Link>
          <p className="mt-0.5 text-xs text-mute">
            {row.role === "received"
              ? `De ${row.other_name}`
              : `Para ${row.other_name}`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[row.status]}`}
        >
          {statusLabel[row.status]}
        </span>
      </div>

      <ul className="mt-3 space-y-1">
        {row.items.map((it, i) => (
          <li key={i} className="flex justify-between text-sm">
            <span className="text-ink">• {it.title}</span>
            {it.value ? (
              <span className="text-mute">{formatBRL(Number(it.value))}</span>
            ) : null}
          </li>
        ))}
      </ul>

      {cash && (
        <p className="mt-2 text-sm font-medium text-ink">💰 {cash}</p>
      )}

      {row.message && (
        <p className="mt-2 rounded-xl bg-card-2 px-3 py-2 text-sm text-mute">
          “{row.message}”
        </p>
      )}

      {row.status === "pending" && (
        <ProposalActions proposalId={row.proposal_id} role={row.role} />
      )}
    </div>
  );
}

export default async function PropostasPage() {
  const supabase = await createSupabaseServer();
  if (!supabase) redirect("/entrar");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data } = await supabase.rpc("my_trade_proposals");
  const rows = (data ?? []) as ProposalRow[];
  const received = rows.filter((r) => r.role === "received");
  const sent = rows.filter((r) => r.role === "sent");

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-24 pt-8">
      <h1 className="text-2xl font-extrabold tracking-tight">
        Propostas de catira
      </h1>
      <p className="mt-1 text-sm text-mute">
        Ofertas de troca que você enviou e recebeu.
      </p>

      {rows.length === 0 && (
        <div className="mt-10 rounded-2xl bg-card p-6 text-center">
          <p className="text-sm text-mute">
            Você ainda não tem propostas. Abra um anúncio no{" "}
            <Link href="/feed" className="font-semibold text-emerald-500">
              Descobrir
            </Link>{" "}
            e toque em Catira para propor uma troca.
          </p>
        </div>
      )}

      {received.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
            Recebidas
          </h2>
          <div className="mt-2 space-y-2">
            {received.map((r) => (
              <ProposalCard key={r.proposal_id} row={r} />
            ))}
          </div>
        </section>
      )}

      {sent.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
            Enviadas
          </h2>
          <div className="mt-2 space-y-2">
            {sent.map((r) => (
              <ProposalCard key={r.proposal_id} row={r} />
            ))}
          </div>
        </section>
      )}

      <BottomNav />
    </main>
  );
}
