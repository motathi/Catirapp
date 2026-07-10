import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AssetCategory, Listing } from "@/lib/listings";

// Linha da view `feed_listings` (supabase/migrations/0002_feed_view.sql)
interface FeedRow {
  id: string;
  brand: string;
  model: string;
  model_year: number;
  mileage_km: number | null;
  city: string;
  state: string;
  price: number;
  fipe_value: number;
  accepts_trade: boolean;
  accepted_categories: AssetCategory[];
  match_count: number;
  main_photo_path: string | null;
  vehicle_category: AssetCategory | null;
  is_damaged: boolean;
}

export function photoPublicUrl(path: string | null): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !path) return null;
  return `${url}/storage/v1/object/public/listing-photos/${path}`;
}

const photoGradients = [
  "from-slate-700 via-slate-800 to-slate-950",
  "from-zinc-600 via-zinc-800 to-black",
  "from-stone-600 via-stone-800 to-stone-950",
  "from-neutral-600 via-neutral-800 to-neutral-950",
  "from-gray-600 via-gray-800 to-gray-950",
];

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function fetchFeedListings(): Promise<Listing[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("feed_listings")
    .select("*")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar o feed do Supabase:", error.message);
    return null;
  }

  return (data as FeedRow[]).map((row, i) => ({
    id: row.id,
    brand: row.brand,
    model: row.model,
    modelYear: row.model_year,
    mileageKm: row.mileage_km ?? 0,
    city: row.city,
    state: row.state,
    price: Number(row.price),
    fipeValue: Number(row.fipe_value),
    acceptsTrade: row.accepts_trade,
    acceptedCategories: row.accepted_categories ?? [],
    matchCount: row.match_count,
    photoGradient: photoGradients[i % photoGradients.length],
    photoUrl: photoPublicUrl(row.main_photo_path),
    vehicleCategory: row.vehicle_category,
    isDamaged: row.is_damaged,
  }));
}
