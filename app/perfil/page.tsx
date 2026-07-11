import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { signOut } from "@/app/auth/actions";
import BottomNav from "@/components/BottomNav";
import { categoryLabel, formatBRL, type AssetCategory } from "@/lib/listings";

export default async function PerfilPage() {
  const supabase = await createSupabaseServer();
  if (!supabase) redirect("/entrar?erro=Supabase não configurado");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const [{ data: profile }, { data: assets }, { data: myListings }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*, plans(name, max_active_listings, daily_match_contacts)")
        .eq("id", user.id)
        .single(),
      supabase.from("assets").select("*").eq("owner_id", user.id),
      supabase
        .from("listings")
        .select("id, brand, model, price, fipe_percent, status")
        .eq("owner_id", user.id),
    ]);

  const listingIds = (myListings ?? []).map((l) => l.id);
  let matchCount = 0;
  if (listingIds.length > 0) {
    const { count } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(
        `listing_a_id.in.(${listingIds.join(",")}),listing_b_id.in.(${listingIds.join(",")})`,
      )
      .neq("status", "dismissed");
    matchCount = count ?? 0;
  }

  const { count: contactsToday } = await supabase
    .from("match_contacts")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", user.id)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const plan = profile?.plans;
  const dailyLimit = plan?.daily_match_contacts;

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-24 pt-8">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {profile?.display_name ?? "Meu perfil"}
          </h1>
          <p className="mt-1 text-sm text-mute">
            {[profile?.city, profile?.state].filter(Boolean).join("/") ||
              user.email}
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          Plano {plan?.name ?? "Gratuito"}
        </span>
      </header>

      {matchCount > 0 && (
        <p className="mt-5 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white">
          ⚡ {matchCount}{" "}
          {matchCount === 1
            ? "oportunidade compatível"
            : "oportunidades compatíveis"}{" "}
          com seus anúncios
        </p>
      )}

      <Link
        href="/mensagens"
        className="mt-5 flex items-center justify-between rounded-2xl bg-card px-4 py-3 text-sm font-semibold transition hover:bg-card-2"
      >
        <span>💬 Mensagens</span>
        <span aria-hidden className="text-mute">
          ›
        </span>
      </Link>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
          Contatos de matching hoje
        </h2>
        <p className="mt-2 rounded-2xl bg-card px-4 py-3 text-sm">
          {contactsToday ?? 0} de{" "}
          {dailyLimit == null ? "ilimitados" : dailyLimit} usados
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
          Meus anúncios
        </h2>
        <div className="mt-2 flex flex-col gap-2">
          {(myListings ?? []).length === 0 && (
            <p className="rounded-2xl bg-card px-4 py-3 text-sm text-mute">
              Você ainda não tem anúncios.
            </p>
          )}
          {(myListings ?? []).map((l) => (
            <Link
              key={l.id}
              href={`/anuncio/${l.id}`}
              className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 text-sm transition hover:bg-card-2"
            >
              <span>
                {l.brand} {l.model}
                <span className="ml-2 text-xs text-mute">
                  {l.status === "active" ? "ativo" : l.status}
                </span>
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatBRL(Number(l.price))}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6" id="garagem">
        <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
          Garagem digital
        </h2>
        <div className="mt-2 flex flex-col gap-2">
          {(assets ?? []).length === 0 && (
            <p className="rounded-2xl bg-card px-4 py-3 text-sm text-mute">
              Cadastre bens (veículos, imóveis, máquinas…) para usá-los como
              moeda de troca nas negociações.
            </p>
          )}
          {(assets ?? []).map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-2xl bg-card px-4 py-3 text-sm"
            >
              <span>
                {a.title}
                <span className="ml-2 text-xs text-mute">
                  {categoryLabel[a.category as AssetCategory]}
                </span>
              </span>
              {a.estimated_value && (
                <span className="text-mute">
                  {formatBRL(Number(a.estimated_value))}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <form action={signOut} className="mt-8">
        <button
          type="submit"
          className="w-full rounded-xl border border-line py-3 text-sm text-mute transition hover:bg-card-2"
        >
          Sair da conta
        </button>
      </form>

      <BottomNav />
    </main>
  );
}
