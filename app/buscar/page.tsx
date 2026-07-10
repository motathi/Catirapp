import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { getSupabase } from "@/lib/supabase";
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
}

interface Filters {
  marca?: string;
  modelo?: string;
  ano_min?: string;
  preco_max?: string;
  pct_max?: string;
  cidade?: string;
  uf?: string;
  troca?: string;
  categoria?: string;
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
      }));
  }

  let q = supabase.from("feed_listings").select("*");
  if (f.marca) q = q.ilike("brand", `%${f.marca}%`);
  if (f.modelo) q = q.ilike("model", `%${f.modelo}%`);
  if (f.ano_min) q = q.gte("model_year", Number(f.ano_min));
  if (f.preco_max) q = q.lte("price", Number(f.preco_max));
  if (f.pct_max) q = q.lte("fipe_percent", Number(f.pct_max));
  if (f.cidade) q = q.ilike("city", `%${f.cidade}%`);
  if (f.uf) q = q.eq("state", f.uf.toUpperCase());
  if (f.troca) q = q.eq("accepts_trade", true);
  if (f.categoria) q = q.contains("accepted_categories", [f.categoria]);

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
  }));
}

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const filters = await searchParams;
  const hasQuery = Object.values(filters).some(Boolean);
  const results = await search(filters);

  const inputClass =
    "rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm outline-none focus:border-emerald-500";

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-24 pt-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Buscar</h1>

      <form method="get" className="mt-4 grid grid-cols-2 gap-2">
        <input
          name="marca"
          defaultValue={filters.marca}
          placeholder="Marca"
          className={inputClass}
        />
        <input
          name="modelo"
          defaultValue={filters.modelo}
          placeholder="Modelo"
          className={inputClass}
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
          className={inputClass}
        >
          <option value="">Bem aceito na troca…</option>
          {Object.entries(categoryLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="col-span-2 flex items-center gap-2 px-1 text-sm text-zinc-300">
          <input
            type="checkbox"
            name="troca"
            value="1"
            defaultChecked={Boolean(filters.troca)}
            className="h-4 w-4 accent-emerald-500"
          />
          Somente anúncios que aceitam troca
        </label>
        <button
          type="submit"
          className="col-span-2 rounded-xl bg-emerald-500 py-3 font-bold text-emerald-950 transition hover:bg-emerald-400"
        >
          Buscar oportunidades
        </button>
      </form>

      <section className="mt-6 flex flex-col gap-2">
        {hasQuery && results.length === 0 && (
          <p className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
            Nenhuma oportunidade encontrada com esses filtros.
          </p>
        )}
        {results.map((r) => (
          <Link
            key={r.id}
            href={`/anuncio/${r.id}`}
            className="flex items-center justify-between rounded-2xl bg-zinc-900 px-4 py-3 transition hover:bg-zinc-800"
          >
            <div>
              <p className="font-semibold">
                {r.brand} {r.model}
              </p>
              <p className="text-xs text-zinc-500">
                {r.modelYear} · {r.city}/{r.state}
                {r.acceptsTrade && " · aceita troca"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-emerald-400">{formatBRL(r.price)}</p>
              <p className="text-xs text-zinc-500">{r.fipePct}% da FIPE</p>
            </div>
          </Link>
        ))}
      </section>

      <BottomNav />
    </main>
  );
}
