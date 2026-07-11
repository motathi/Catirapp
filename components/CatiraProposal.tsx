"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  getMyAssets,
  sendTradeProposal,
  type CashDirection,
  type InventoryItem,
} from "@/app/propostas/actions";
import { categoryLabel, formatBRL } from "@/lib/listings";

const directions: { value: CashDirection; label: string; hint: string }[] = [
  { value: "none", label: "Sem volta", hint: "Troca sem dinheiro" },
  { value: "proposer_pays", label: "Eu pago a mais", hint: "Você complementa" },
  { value: "seller_pays", label: "Vendedor me paga", hint: "Ele complementa" },
];

export default function CatiraProposal({
  listingId,
  listingTitle,
  listingPrice,
}: {
  listingId: string;
  listingTitle?: string;
  listingPrice?: number;
}) {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<InventoryItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [direction, setDirection] = useState<CashDirection>("none");
  const [cash, setCash] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    getMyAssets().then((res) => {
      if (!alive) return;
      setAssets(res.assets);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const itemsTotal = useMemo(
    () =>
      assets
        .filter((a) => selected.has(a.id))
        .reduce((sum, a) => sum + (a.estimated_value ?? 0), 0),
    [assets, selected],
  );

  const cashValue = direction === "none" ? 0 : Number(cash) || 0;
  const mySide = itemsTotal + (direction === "proposer_pays" ? cashValue : 0);
  const theirSide =
    (listingPrice ?? 0) - (direction === "seller_pays" ? cashValue : 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    if (pending) return;
    setError(null);
    if (selected.size === 0) {
      setError("Selecione ao menos um item do seu estoque.");
      return;
    }
    if (direction !== "none" && !(Number(cash) > 0)) {
      setError("Informe o valor em dinheiro da volta.");
      return;
    }
    startTransition(async () => {
      const res = await sendTradeProposal({
        listingId,
        assetIds: [...selected],
        cashAmount: cashValue,
        cashDirection: direction,
        message: message.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDoneId(res.proposalId);
    });
  }

  if (doneId) {
    return (
      <div className="grid gap-3 text-center">
        <p className="text-2xl">🤝</p>
        <p className="font-semibold text-zinc-100">Proposta enviada!</p>
        <p className="text-sm text-zinc-400">
          O vendedor foi notificado e pode aceitar ou recusar sua catira.
        </p>
        <Link
          href="/propostas"
          className="mt-1 block rounded-xl bg-emerald-500 px-4 py-3 text-center font-semibold text-emerald-950 transition hover:bg-emerald-400"
        >
          Acompanhar em Propostas
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p className="py-6 text-center text-sm text-zinc-400">Carregando seu estoque…</p>;
  }

  if (assets.length === 0) {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-zinc-300">
          Você ainda não tem itens na sua garagem para oferecer como catira.
          Cadastre um bem para começar a negociar.
        </p>
        <Link
          href="/anunciar"
          className="block rounded-xl bg-emerald-500 px-4 py-3 text-center font-semibold text-emerald-950 transition hover:bg-emerald-400"
        >
          Cadastrar um bem
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {listingTitle && (
        <p className="text-sm text-zinc-400">
          Proposta por <span className="text-zinc-100">{listingTitle}</span>
          {listingPrice ? ` · ${formatBRL(listingPrice)}` : ""}
        </p>
      )}

      {/* Estoque */}
      <div>
        <p className="mb-1.5 text-xs uppercase tracking-wide text-zinc-400">
          Meu estoque — selecione o que oferece
        </p>
        <div className="grid max-h-56 gap-1.5 overflow-y-auto">
          {assets.map((a) => {
            const on = selected.has(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggle(a.id)}
                aria-pressed={on}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                  on
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-zinc-700 bg-zinc-800/60 hover:bg-zinc-800"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-zinc-100">
                    {a.title}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {categoryLabel[a.category]}
                    {a.estimated_value
                      ? ` · ${formatBRL(a.estimated_value)}`
                      : ""}
                  </span>
                </span>
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs ${
                    on
                      ? "border-emerald-500 bg-emerald-500 text-emerald-950"
                      : "border-zinc-600 text-transparent"
                  }`}
                  aria-hidden
                >
                  ✓
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Volta em dinheiro */}
      <div>
        <p className="mb-1.5 text-xs uppercase tracking-wide text-zinc-400">
          Volta em dinheiro
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {directions.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDirection(d.value)}
              aria-pressed={direction === d.value}
              className={`rounded-xl px-2 py-2 text-center transition ${
                direction === d.value
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <span className="block text-xs font-semibold">{d.label}</span>
            </button>
          ))}
        </div>
        {direction !== "none" && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-3">
            <span className="text-sm text-zinc-400">R$</span>
            <input
              value={cash}
              onChange={(e) => setCash(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="0"
              className="w-full bg-transparent py-2.5 text-sm text-zinc-100 outline-none"
            />
          </div>
        )}
      </div>

      {/* Resumo */}
      {(selected.size > 0 || cashValue > 0) && (
        <div className="rounded-xl bg-zinc-800/60 p-3 text-sm">
          <div className="flex justify-between text-zinc-300">
            <span>Você oferece</span>
            <span className="font-semibold text-zinc-100">
              {formatBRL(mySide)}
            </span>
          </div>
          {listingPrice ? (
            <div className="mt-1 flex justify-between text-zinc-400">
              <span>Vale o anúncio</span>
              <span>{formatBRL(theirSide)}</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Mensagem */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        placeholder="Mensagem (opcional)"
        className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500"
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={submit}
        disabled={pending || selected.size === 0}
        className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-center font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-40"
      >
        {pending ? "Enviando…" : "Enviar proposta de catira"}
      </button>
    </div>
  );
}
