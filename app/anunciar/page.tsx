import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import AnunciarForm from "@/components/AnunciarForm";
import BottomNav from "@/components/BottomNav";

export default async function AnunciarPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  const supabase = await createSupabaseServer();
  if (!supabase) redirect("/entrar?erro=Supabase não configurado");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?aviso=" + encodeURIComponent("Entre para anunciar"));

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-24 pt-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Anunciar</h1>
      <p className="mt-1 text-sm text-mute">
        Busque o valor FIPE do seu veículo e publique. Só entram anúncios até
        85% da FIPE — é isso que faz do Catirapp o lugar das oportunidades.
      </p>

      {erro && (
        <p className="mt-4 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-900 dark:bg-red-950/70 dark:text-red-300">
          {erro}
        </p>
      )}

      <Link
        href="/planos"
        className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/50 bg-amber-400/10 px-4 py-3 transition hover:bg-amber-400/20"
      >
        <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          ⚡ Quer vender mais rápido? Destaque seu anúncio no topo do feed
        </span>
        <span aria-hidden className="text-amber-700 dark:text-amber-400">
          ›
        </span>
      </Link>

      <AnunciarForm />

      <BottomNav />
    </main>
  );
}
