"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Link from "next/link";
import { toggleSavedListing } from "@/app/feed/actions";

// -----------------------------------------------------------------------------
// Favoritos: persistem no navegador (funciona para visitantes anônimos) e, quando
// há sessão, também no banco via server action toggleSavedListing.
// -----------------------------------------------------------------------------
const SAVED_KEY = "catir:saved";
// Evento local: o "storage" nativo só dispara em OUTRAS abas, então avisamos os
// demais cartões da mesma página quando um favorito muda.
const SAVED_EVENT = "catir:saved-changed";

function readSaved(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSaved(ids: string[]) {
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event(SAVED_EVENT));
  } catch {
    // localStorage indisponível (modo privado etc.) — ignora silenciosamente
  }
}

function subscribeSaved(callback: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === SAVED_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(SAVED_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SAVED_EVENT, callback);
  };
}

function useSaved(listingId: string) {
  const saved = useSyncExternalStore(
    subscribeSaved,
    () => readSaved().includes(listingId),
    () => false,
  );
  const [busy, setBusy] = useState(false);

  const toggle = useCallback(async () => {
    if (busy) return;
    const next = !saved;

    // Atualização otimista + persistência local (vale para todo mundo).
    // writeSaved dispara SAVED_EVENT, que atualiza a UI via useSyncExternalStore.
    const ids = new Set(readSaved());
    if (next) ids.add(listingId);
    else ids.delete(listingId);
    writeSaved([...ids]);

    // Melhor esforço: se o usuário estiver logado, persiste no banco e concilia
    setBusy(true);
    try {
      const res = await toggleSavedListing(listingId);
      if (res.authenticated && res.saved !== next) {
        const server = new Set(readSaved());
        if (res.saved) server.add(listingId);
        else server.delete(listingId);
        writeSaved([...server]);
      }
    } catch {
      // Falha de rede não desfaz o favorito local
    } finally {
      setBusy(false);
    }
  }, [busy, saved, listingId]);

  return { saved, busy, toggle };
}

// -----------------------------------------------------------------------------
// Bottom sheet reutilizável
// -----------------------------------------------------------------------------
function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="mx-auto w-full max-w-md rounded-t-3xl bg-zinc-900 p-5 pb-8 text-zinc-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700" />
        <h3 className="text-lg font-bold">{title}</h3>
        <div className="mt-2 text-sm text-zinc-300">{children}</div>
      </div>
    </div>
  );
}

const sheetPrimary =
  "block rounded-xl bg-emerald-500 px-4 py-3 text-center font-semibold text-emerald-950 transition hover:bg-emerald-400";
const sheetSecondary =
  "block rounded-xl bg-zinc-800 px-4 py-3 text-center font-medium text-zinc-100 transition hover:bg-zinc-700";

type SheetKind = "contato" | "match" | null;

function ContactSheetBody({ listingId }: { listingId: string }) {
  return (
    <>
      <p>
        No Catir a conversa começa pelo{" "}
        <strong className="text-zinc-100">Contato Inteligente</strong>: entre na
        sua conta para falar com quem anunciou e negociar com segurança.
      </p>
      <div className="mt-4 grid gap-2">
        <Link href="/entrar" className={sheetPrimary}>
          Entrar para conversar
        </Link>
        <Link href={`/anuncio/${listingId}`} className={sheetSecondary}>
          Ver detalhes do anúncio
        </Link>
      </div>
    </>
  );
}

function MatchSheetBody({ matchCount }: { matchCount: number }) {
  return (
    <>
      <p>
        {matchCount > 0
          ? `Este veículo tem ${matchCount} ${
              matchCount === 1
                ? "oportunidade compatível"
                : "oportunidades compatíveis"
            }. `
          : ""}
        O Catir cruza os bens da sua garagem com este anúncio e sugere as
        melhores trocas (catira). Cadastre o seu veículo para receber matches.
      </p>
      <div className="mt-4 grid gap-2">
        <Link href="/entrar" className={sheetPrimary}>
          Entrar para ver meus matches
        </Link>
        <Link href="/anunciar" className={sheetSecondary}>
          Anunciar meu veículo
        </Link>
      </div>
    </>
  );
}

// -----------------------------------------------------------------------------
// Área de ações do cartão do feed (⚡ matches + Salvar / Contato / Match / Detalhes)
// -----------------------------------------------------------------------------
export function FeedActions({
  listingId,
  matchCount,
}: {
  listingId: string;
  matchCount: number;
}) {
  const { saved, toggle } = useSaved(listingId);
  const [sheet, setSheet] = useState<SheetKind>(null);

  return (
    <>
      {matchCount > 0 && (
        <button
          onClick={() => setSheet("match")}
          className="flex items-center justify-between rounded-2xl bg-indigo-600 px-4 py-3 text-left font-semibold transition hover:bg-indigo-500"
        >
          <span>
            ⚡ {matchCount} oportunidades compatíveis com este veículo
          </span>
          <span aria-hidden>›</span>
        </button>
      )}

      <div className="grid grid-cols-4 gap-2 text-sm font-medium">
        <button
          onClick={toggle}
          aria-pressed={saved}
          className={`rounded-xl py-3 transition ${
            saved
              ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
              : "bg-zinc-800/90 hover:bg-zinc-700"
          }`}
        >
          {saved ? "♥ Salvo" : "♡ Salvar"}
        </button>
        <button
          onClick={() => setSheet("contato")}
          className="rounded-xl bg-zinc-800/90 py-3 transition hover:bg-zinc-700"
        >
          💬 Contato
        </button>
        <button
          onClick={() => setSheet("match")}
          className="rounded-xl bg-zinc-800/90 py-3 transition hover:bg-zinc-700"
        >
          ⇄ Match
        </button>
        <Link
          href={`/anuncio/${listingId}`}
          className="rounded-xl bg-zinc-800/90 py-3 text-center transition hover:bg-zinc-700"
        >
          Detalhes
        </Link>
      </div>

      <Sheet
        open={sheet === "contato"}
        onClose={() => setSheet(null)}
        title="Contato Inteligente"
      >
        <ContactSheetBody listingId={listingId} />
      </Sheet>
      <Sheet
        open={sheet === "match"}
        onClose={() => setSheet(null)}
        title="Match inteligente"
      >
        <MatchSheetBody matchCount={matchCount} />
      </Sheet>
    </>
  );
}

// -----------------------------------------------------------------------------
// Botões de ação da página de detalhe do anúncio
// -----------------------------------------------------------------------------
export function DetailActions({ listingId }: { listingId: string }) {
  const { saved, toggle } = useSaved(listingId);
  const [sheet, setSheet] = useState<SheetKind>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
        <button
          onClick={() => setSheet("contato")}
          className="rounded-xl bg-emerald-500 py-3 text-emerald-950 transition hover:bg-emerald-400"
        >
          💬 Entrar em contato
        </button>
        <button
          onClick={() => setSheet("match")}
          className="rounded-xl bg-indigo-600 py-3 text-white transition hover:bg-indigo-500"
        >
          ⇄ Solicitar match
        </button>
      </div>
      <button
        onClick={toggle}
        aria-pressed={saved}
        className={`mt-2 w-full rounded-xl py-3 text-sm font-semibold transition ${
          saved
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "bg-card-2 text-mute hover:text-ink"
        }`}
      >
        {saved ? "♥ Salvo nos favoritos" : "♡ Salvar anúncio"}
      </button>

      <Sheet
        open={sheet === "contato"}
        onClose={() => setSheet(null)}
        title="Contato Inteligente"
      >
        <ContactSheetBody listingId={listingId} />
      </Sheet>
      <Sheet
        open={sheet === "match"}
        onClose={() => setSheet(null)}
        title="Match inteligente"
      >
        <MatchSheetBody matchCount={0} />
      </Sheet>
    </>
  );
}
