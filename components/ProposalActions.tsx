"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  cancelTradeProposal,
  respondTradeProposal,
} from "@/app/propostas/actions";

export default function ProposalActions({
  proposalId,
  role,
}: {
  proposalId: string;
  role: "sent" | "received";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Não foi possível concluir.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-3">
      {role === "received" ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => run(() => respondTradeProposal(proposalId, true))}
            disabled={pending}
            className="rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-40"
          >
            Aceitar
          </button>
          <button
            onClick={() => run(() => respondTradeProposal(proposalId, false))}
            disabled={pending}
            className="rounded-xl bg-card-2 py-2.5 text-sm font-semibold text-mute transition hover:text-ink disabled:opacity-40"
          >
            Recusar
          </button>
        </div>
      ) : (
        <button
          onClick={() => run(() => cancelTradeProposal(proposalId))}
          disabled={pending}
          className="w-full rounded-xl bg-card-2 py-2.5 text-sm font-semibold text-mute transition hover:text-ink disabled:opacity-40"
        >
          Cancelar proposta
        </button>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
