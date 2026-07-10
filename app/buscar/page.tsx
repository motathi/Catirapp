import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { getSupabase, photoPublicUrl } from "@/lib/supabase";
import {
  categoryLabel,
  formatBRL,
  mockListings,
  fipePercent,
  type AssetCategory,
} from "@/lib/listings";

interface SearchResult {
  id: string;
  brand: string;
  model: string;
  modelYear: number;
  city: string;
  state: string;
  price: number;
  fipePct: number;
  acceptsTrade: boolean;
  photoUrl: string | null;
  isDamaged: boolean;
  previousPrice: number | null;
}

interface Filters {
  q?: string;
  marca?: string;
  modelo?: string;
  ano_min?: string;
  preco_max?: string;
  pct_max?: string;
  cidade?: string;
  uf?: string;
  troca?: string;
  categoria?: string;
  tipo?: string;
  batidos?: string;
  baixou?: string;
}

async function search(f: Filters): Promise<SearchResult[]> {
  const supabase = getSupabase();

  if (!supabase) {
    return mockListings
      .filter(
        (l) =>
          (!f.marca || l.brand.toLowerCase().includes(f.marca.toLowerCase())) &&
          (!f.troca || l.acceptsTrade),
      )
      .map((l) => ({
        id: l.id,
        brand: l.brand,
        model: l.model,
        modelYear: l.modelYear,
        city: l.city,
        state: l.state,
        price: l.price,
        fipePct: fipePercent(l),
        acceptsTrade: l.acceptsTrade,
        photoUrl: null,
        isDamaged: false,
        previousPrice: null,
      }));
  }

  let q = supabase.from("feed_listings").select("*");
  if (f.q) q = q.or(`brand.ilike.%${f.q}%,model.ilike.%${f.q}%`);
  if (f.marca) q = q.ilike("brand", `%${f.marca}%`);
  if (f.modelo) q = q.ilike("model", `%${f.modelo}%`);
  if (f.ano_min) q = q.gte("model_year", Number(f.ano_min));
  if (f.preco_max) q = q.lte("price", Number(f.preco_max));
  if (f.pct_max) q = q.lte("fipe_percent", Number(f.pct_max));
  if (f.cidade) q = q.ilike("city", `%${f.cidade}%`);
  if (f.uf) q = q.eq("state", f.uf.toUpperCase());
  if (f.troca) q = q.eq("accepts_trade", true);
  if (f.categoria) q = q.contains("accepted_categories", [f.categoria]);
  if (f.tipo) q = q.eq("vehicle_category", f.tipo);
  if (f.batidos) q = q.eq("is_damaged", true);
  if (f.baixou) {
    // Reduções de preço dos últimos 7 dias
    q = q.gte(
      "price_dropped_at",
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    );
  }

  const { data, error } = await q.order("fipe_percent", { ascending: true });
  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    brand: row.brand,
    model: row.model,
    modelYear: row.model_year,
    city: row.city,
    state: row.state,
    price: Number(row.price),
    fipePct: Math.round(Number(row.fipe_percent)),
    acceptsTrade: row.accepts_trade,
    photoUrl: photoPublicUrl(row.main_photo_path),
    isDamaged: row.is_damaged,
    previousPrice: row.previous_price ? Number(row.previous_price) : null,
  }));
}

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const filters = await searchParams;
  const results = await search(filters);

  const inputClass =
    "rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-emerald-500";

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-24 pt-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Buscar</h1>

      <form method="get" className="mt-4 grid grid-cols-2 gap-2">
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Marca ou modelo"
          className={`${inputClass} col-span-2`}
        />
        <input
          name="ano_min"
          defaultValue={filters.ano_min}
          type="number"
          placeholder="Ano mínimo"
          className={inputClass}
        />
        <input
          name="preco_max"
          defaultValue={filters.preco_max}
          type="number"
          placeholder="Preço máximo"
          className={inputClass}
        />
        <input
          name="pct_max"
          defaultValue={filters.pct_max}
          type="number"
          max={85}
          placeholder="% máx. da FIPE"
          className={inputClass}
        />
        <select
          name="tipo"
          defaultValue={filters.tipo ?? ""}
          className={inputClass}
        >
          <option value="">Tipo de veículo…</option>
          {(
            ["carro", "suv", "caminhonete", "moto", "caminhao"] as const
          ).map((value) => (
            <option key={value} value={value}>
              {categoryLabel[value]}
            </option>
          ))}
        </select>
        <input
          name="cidade"
          defaultValue={filters.cidade}
          placeholder="Cidade"
          className={inputClass}
        />
        <input
          name="uf"
          defaultValue={filters.uf}
          maxLength={2}
          placeholder="UF"
          className={`${inputClass} uppercase`}
        />
        <select
          name="categoria"
          defaultValue={filters.categoria ?? ""}
          className={`${inputClass} col-span-2`}
        >
          <option value="">Bem aceito na troca…</option>
          {Object.entries(categoryLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 px-1 text-sm">
          <input
            type="checkbox"
            name="troca"
            value="1"
            defaultChecked={Boolean(filters.troca)}
            className="h-4 w-4 accent-emerald-500"
          />
          Aceita troca
        </label>
        <label className="flex items-center gap-2 px-1 text-sm">
          <input
            type="checkbox"
            name="batidos"
            value="1"
            defaultChecked={Boolean(filters.batidos)}
            className="h-4 w-4 accent-emerald-500"
          />
          Somente batidos
        </label>
        <button
          type="submit"
          className="col-span-2 rounded-xl bg-emerald-500 py-3 font-bold text-emerald-950 transition hover:bg-emerald-400"
        >
          Buscar oportunidades
        </button>
      </form>

      <section className="mt-6 flex flex-col gap-2">
        <p className="text-sm text-mute">
          {results.length}{" "}
          {results.length === 1
            ? "oportunidade encontrada"
            : "oportunidades encontradas"}
        </p>
        {results.map((r) => (
          <Link
            key={r.id}
            href={`/anuncio/${r.id}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-3 transition hover:border-emerald-500"
          >
            {r.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={r.photoUrl}
                alt=""
                className="h-14 w-20 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="h-14 w-20 shrink-0 rounded-xl bg-card-2" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {r.brand} {r.model}
                {r.isDamaged && (
                  <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950 align-middle">
                    Batido
                  </span>
                )}
              </p>
              <p className="text-xs text-mute">
                {r.modelYear} · {r.city}/{r.state}
                {r.acceptsTrade && " · aceita troca"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {r.previousPrice && (
                <p className="text-xs text-mute">
                  <s>{formatBRL(r.previousPrice)}</s> 📉
                </p>
              )}
              <p className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatBRL(r.price)}
              </p>
              <p className="text-xs text-mute">{r.fipePct}% da FIPE</p>
            </div>
          </Link>
        ))}
      </section>

      <BottomNav />
    </main>
  );
}
