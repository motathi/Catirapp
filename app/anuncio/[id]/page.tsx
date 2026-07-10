import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import BottomNav from "@/components/BottomNav";
import {
  categoryLabel,
  formatBRL,
  formatKm,
  mockListings,
  type AssetCategory,
} from "@/lib/listings";

interface ListingDetail {
  id: string;
  brand: string;
  model: string;
  modelYear: number;
  mileageKm: number;
  city: string;
  state: string;
  price: number;
  fipeValue: number;
  acceptsTrade: boolean;
  acceptsCashComplement: boolean;
  acceptedCategories: AssetCategory[];
  sellerName: string | null;
}

async function loadListing(id: string): Promise<ListingDetail | null> {
  const supabase = await createSupabaseServer();

  if (!supabase) {
    const m = mockListings.find((l) => l.id === id);
    if (!m) return null;
    return {
      ...m,
      acceptsCashComplement: false,
      sellerName: null,
    };
  }

  const { data } = await supabase
    .from("listings")
    .select(
      `id, brand, model, model_year, mileage_km, city, state, price,
       fipe_value, accepts_trade, accepts_cash_complement,
       listing_accepted_trades(category),
       profiles!listings_owner_id_fkey(display_name)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  const profile = Array.isArray(data.profiles)
    ? data.profiles[0]
    : data.profiles;
  return {
    id: data.id,
    brand: data.brand,
    model: data.model,
    modelYear: data.model_year,
    mileageKm: data.mileage_km ?? 0,
    city: data.city,
    state: data.state,
    price: Number(data.price),
    fipeValue: Number(data.fipe_value),
    acceptsTrade: data.accepts_trade,
    acceptsCashComplement: data.accepts_cash_complement,
    acceptedCategories: (data.listing_accepted_trades ?? []).map(
      (t: { category: string }) => t.category as AssetCategory,
    ),
    sellerName: profile?.display_name ?? null,
  };
}

export default async function AnuncioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await loadListing(id);
  if (!listing) notFound();

  const percent = Math.round((listing.price / listing.fipeValue) * 100);
  const savings = listing.fipeValue - listing.price;

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-24">
      <div className="relative h-72 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950">
        <Link
          href="/"
          className="absolute left-4 top-4 rounded-full bg-zinc-950/70 px-4 py-2 text-sm backdrop-blur"
        >
          ‹ Voltar
        </Link>
        <span className="absolute bottom-4 left-4 rounded-full bg-emerald-500 px-3 py-1 text-sm font-bold text-emerald-950">
          {percent}% da FIPE
        </span>
      </div>

      <div className="px-5 pt-5">
        <h1 className="text-2xl font-bold leading-tight">
          {listing.brand} {listing.model}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {listing.modelYear} · {formatKm(listing.mileageKm)} · {listing.city}/
          {listing.state}
        </p>

        <div className="mt-4 rounded-2xl bg-zinc-900 p-4">
          <p className="text-3xl font-extrabold text-emerald-400">
            {formatBRL(listing.price)}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-zinc-500">Valor FIPE</dt>
            <dd className="text-right text-zinc-400">
              {formatBRL(listing.fipeValue)}
            </dd>
            <dt className="text-zinc-500">Economia</dt>
            <dd className="text-right font-semibold text-emerald-400">
              {formatBRL(savings)}
            </dd>
            <dt className="text-zinc-500">Percentual da FIPE</dt>
            <dd className="text-right text-zinc-400">{percent}%</dd>
          </dl>
        </div>

        {listing.acceptsTrade && (
          <div className="mt-4 rounded-2xl bg-zinc-900 p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
              Aceita na troca (catira)
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {listing.acceptedCategories.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-amber-400/15 px-3 py-1 text-sm font-semibold text-amber-300"
                >
                  {categoryLabel[c]}
                </span>
              ))}
            </div>
            {listing.acceptsCashComplement && (
              <p className="mt-2 text-sm text-zinc-400">
                Aceita bem + complemento em dinheiro.
              </p>
            )}
          </div>
        )}

        {listing.sellerName && (
          <p className="mt-4 text-sm text-zinc-400">
            Anunciado por{" "}
            <span className="font-semibold text-zinc-200">
              {listing.sellerName}
            </span>
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2 text-sm font-semibold">
          <button className="rounded-xl bg-emerald-500 py-3 text-emerald-950 transition hover:bg-emerald-400">
            💬 Entrar em contato
          </button>
          <button className="rounded-xl bg-indigo-600 py-3 transition hover:bg-indigo-500">
            ⇄ Solicitar match
          </button>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
