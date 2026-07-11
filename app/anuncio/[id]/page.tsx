import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { photoPublicUrl } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import {
  categoryLabel,
  damageLabel,
  formatBRL,
  formatKm,
  fuelLabel,
  mockListings,
  transmissionLabel,
  type AssetCategory,
  type DamageSeverity,
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
  photoUrls: string[];
  damageSeverity: DamageSeverity;
  auctionHistory: boolean;
  hasLien: boolean;
  mechanicalIssues: boolean;
  singleOwner: boolean;
  armored: boolean;
  ipvaPaid: boolean;
  licensed: boolean;
  color: string | null;
  transmission: string | null;
  fuel: string | null;
  doors: number | null;
  plateEnd: number | null;
  conditionNotes: string | null;
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
      photoUrls: [],
      damageSeverity: "nenhum" as DamageSeverity,
      auctionHistory: false,
      hasLien: false,
      mechanicalIssues: false,
      singleOwner: false,
      armored: false,
      ipvaPaid: true,
      licensed: true,
      color: null,
      transmission: null,
      fuel: null,
      doors: null,
      plateEnd: null,
      conditionNotes: null,
    };
  }

  const { data } = await supabase
    .from("listings")
    .select(
      `id, brand, model, model_year, mileage_km, city, state, price,
       fipe_value, accepts_trade, accepts_cash_complement,
       damage_severity, auction_history, has_lien, mechanical_issues,
       single_owner, armored, ipva_paid, licensed, color, transmission,
       fuel, doors, plate_end, condition_notes,
       listing_accepted_trades(category),
       listing_photos(storage_path, position),
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
    damageSeverity: data.damage_severity as DamageSeverity,
    auctionHistory: data.auction_history,
    hasLien: data.has_lien,
    mechanicalIssues: data.mechanical_issues,
    singleOwner: data.single_owner,
    armored: data.armored,
    ipvaPaid: data.ipva_paid,
    licensed: data.licensed,
    color: data.color,
    transmission: data.transmission,
    fuel: data.fuel,
    doors: data.doors,
    plateEnd: data.plate_end,
    conditionNotes: data.condition_notes,
    photoUrls: [...(data.listing_photos ?? [])]
      .sort(
        (a: { position: number }, b: { position: number }) =>
          a.position - b.position,
      )
      .map((p: { storage_path: string }) => photoPublicUrl(p.storage_path))
      .filter((u: string | null): u is string => u !== null),
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
      <div className="relative h-72 overflow-hidden bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950">
        {listing.photoUrls[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.photoUrls[0]}
            alt={`${listing.brand} ${listing.model}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <Link
          href="/"
          className="absolute left-4 top-4 rounded-full bg-zinc-950/70 px-4 py-2 text-sm text-white backdrop-blur"
        >
          ‹ Voltar
        </Link>
        <span className="absolute bottom-4 left-4 rounded-full bg-emerald-500 px-3 py-1 text-sm font-bold text-emerald-950">
          {percent}% da FIPE
        </span>
      </div>

      {listing.photoUrls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-5 pt-3">
          {listing.photoUrls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={`${listing.brand} ${listing.model} foto ${i + 1}`}
              className="h-20 w-28 shrink-0 rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      <div className="px-5 pt-5">
        <h1 className="text-2xl font-bold leading-tight">
          {listing.brand} {listing.model}
        </h1>
        <p className="mt-1 text-sm text-mute">
          {listing.modelYear} · {formatKm(listing.mileageKm)} · {listing.city}/
          {listing.state}
        </p>

        <div className="mt-4 rounded-2xl bg-card p-4">
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {formatBRL(listing.price)}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-mute">Valor FIPE</dt>
            <dd className="text-right text-mute">
              {formatBRL(listing.fipeValue)}
            </dd>
            <dt className="text-mute">Economia</dt>
            <dd className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
              {formatBRL(savings)}
            </dd>
            <dt className="text-mute">Percentual da FIPE</dt>
            <dd className="text-right text-mute">{percent}%</dd>
          </dl>
        </div>

        {/* Ficha do veículo */}
        <div className="mt-4 rounded-2xl bg-card p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
            Ficha do veículo
          </h2>
          <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
            {listing.color && (
              <>
                <dt className="text-mute">Cor</dt>
                <dd className="text-right">{listing.color}</dd>
              </>
            )}
            {listing.transmission && (
              <>
                <dt className="text-mute">Câmbio</dt>
                <dd className="text-right">
                  {transmissionLabel[listing.transmission]}
                </dd>
              </>
            )}
            {listing.fuel && (
              <>
                <dt className="text-mute">Combustível</dt>
                <dd className="text-right">{fuelLabel[listing.fuel]}</dd>
              </>
            )}
            {listing.doors && (
              <>
                <dt className="text-mute">Portas</dt>
                <dd className="text-right">{listing.doors}</dd>
              </>
            )}
            {listing.plateEnd != null && (
              <>
                <dt className="text-mute">Final da placa</dt>
                <dd className="text-right">{listing.plateEnd}</dd>
              </>
            )}
            <dt className="text-mute">Quilometragem</dt>
            <dd className="text-right">{formatKm(listing.mileageKm)}</dd>
          </dl>

          {/* Situação e histórico */}
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold">
            <span
              className={
                listing.damageSeverity === "nenhum"
                  ? "rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-600 dark:text-emerald-400"
                  : "rounded-full bg-amber-400/20 px-2.5 py-1 text-amber-700 dark:text-amber-300"
              }
            >
              {listing.damageSeverity === "nenhum" ? "✓ " : "⚠ "}
              {damageLabel[listing.damageSeverity]}
            </span>
            <span
              className={
                listing.auctionHistory
                  ? "rounded-full bg-amber-400/20 px-2.5 py-1 text-amber-700 dark:text-amber-300"
                  : "rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-600 dark:text-emerald-400"
              }
            >
              {listing.auctionHistory
                ? "⚠ Passagem por leilão"
                : "✓ Sem passagem por leilão"}
            </span>
            <span
              className={
                listing.hasLien
                  ? "rounded-full bg-amber-400/20 px-2.5 py-1 text-amber-700 dark:text-amber-300"
                  : "rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-600 dark:text-emerald-400"
              }
            >
              {listing.hasLien ? "⚠ Com gravame" : "✓ Sem gravame"}
            </span>
            {listing.mechanicalIssues && (
              <span className="rounded-full bg-amber-400/20 px-2.5 py-1 text-amber-700 dark:text-amber-300">
                ⚠ Problema na mecânica
              </span>
            )}
            {listing.singleOwner && (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">
                ✓ Único dono
              </span>
            )}
            {listing.ipvaPaid && (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">
                ✓ IPVA pago
              </span>
            )}
            {listing.licensed && (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">
                ✓ Licenciado
              </span>
            )}
            {listing.armored && (
              <span className="rounded-full bg-card-2 px-2.5 py-1 text-mute">
                Blindado
              </span>
            )}
          </div>

          {listing.conditionNotes && (
            <p className="mt-3 text-sm text-mute">{listing.conditionNotes}</p>
          )}
        </div>

        {listing.acceptsTrade && (
          <div className="mt-4 rounded-2xl bg-card p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
              Aceita na troca (catira)
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {listing.acceptedCategories.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-amber-400/20 px-3 py-1 text-sm font-semibold text-amber-700 dark:text-amber-300"
                >
                  {categoryLabel[c]}
                </span>
              ))}
            </div>
            {listing.acceptsCashComplement && (
              <p className="mt-2 text-sm text-mute">
                Aceita bem + complemento em dinheiro.
              </p>
            )}
          </div>
        )}

        {listing.sellerName && (
          <p className="mt-4 text-sm text-mute">
            Anunciado por{" "}
            <span className="font-semibold text-ink">
              {listing.sellerName}
            </span>
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2 text-sm font-semibold">
          <button className="rounded-xl bg-emerald-500 py-3 text-emerald-950 transition hover:bg-emerald-400">
            💬 Entrar em contato
          </button>
          <button className="rounded-xl bg-indigo-600 py-3 text-white transition hover:bg-indigo-500">
            ⇄ Solicitar match
          </button>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
