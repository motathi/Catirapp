// Consulta FIPE compartilhada entre a rota /api/fipe e o server action de
// criação de anúncio. Roda sempre no servidor, lendo as variáveis do Supabase
// em runtime (não dependem do bundle do cliente).
//
// Caminho preferido: Edge Function do Supabase, que também alimenta o cache
// fipe_reference na consulta final de valor. Se o Supabase não estiver
// configurado (ou a função falhar), cai para a API pública da FIPE, que
// devolve exatamente o mesmo formato.

const FIPE_BASE = "https://fipe.parallelum.com.br/api/v2";

export const FIPE_VEHICLE_TYPES = ["cars", "motorcycles", "trucks"];

export interface FipeParams {
  type: string;
  brand?: string | null;
  model?: string | null;
  year?: string | null;
}

export interface FipeResult {
  ok: boolean;
  status: number;
  data: unknown;
}

function fipePath({ type, brand, model, year }: FipeParams): string {
  let path = `/${type}/brands`;
  if (brand) path = `/${type}/brands/${brand}/models`;
  if (brand && model) path = `/${type}/brands/${brand}/models/${model}/years`;
  if (brand && model && year) {
    path = `/${type}/brands/${brand}/models/${model}/years/${year}`;
  }
  return path;
}

export async function fetchFipe(params: FipeParams): Promise<FipeResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Preferência: Edge Function do Supabase (alimenta o cache fipe_reference).
  if (supabaseUrl && supabaseKey) {
    const qs = new URLSearchParams({ type: params.type });
    if (params.brand) qs.set("brand", params.brand);
    if (params.model) qs.set("model", params.model);
    if (params.year) qs.set("year", params.year);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/fipe?${qs}`, {
        headers: { Authorization: `Bearer ${supabaseKey}` },
        cache: "no-store",
      });
      if (res.ok) return { ok: true, status: 200, data: await res.json() };
    } catch {
      // Ignora e tenta o fallback direto abaixo.
    }
  }

  // Fallback: API pública da FIPE.
  try {
    const res = await fetch(`${FIPE_BASE}${fipePath(params)}`, {
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status, data: null };
    return { ok: true, status: 200, data: await res.json() };
  } catch {
    return { ok: false, status: 502, data: null };
  }
}
