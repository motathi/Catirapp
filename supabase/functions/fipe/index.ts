// Consulta a tabela FIPE (API Parallelum v2) para o fluxo de criação de
// anúncio: marcas -> modelos -> anos -> valor. A consulta final de valor
// alimenta o cache local fipe_reference.
//
// Uso (todas exigem o header apikey/Authorization com a chave publicável):
//   /fipe?type=cars                              -> marcas
//   /fipe?type=cars&brand=59                     -> modelos da marca
//   /fipe?type=cars&brand=59&model=5940          -> anos do modelo
//   /fipe?type=cars&brand=59&model=5940&year=2014-3 -> valor FIPE
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const FIPE_BASE = "https://fipe.parallelum.com.br/api/v2";
const VEHICLE_TYPES = ["cars", "motorcycles", "trucks"];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "cars";
  const brand = url.searchParams.get("brand");
  const model = url.searchParams.get("model");
  const year = url.searchParams.get("year");

  if (!VEHICLE_TYPES.includes(type)) {
    return json({ error: "type deve ser cars, motorcycles ou trucks" }, 400);
  }

  let path = `/${type}/brands`;
  if (brand) path = `/${type}/brands/${brand}/models`;
  if (brand && model) path = `/${type}/brands/${brand}/models/${model}/years`;
  if (brand && model && year) {
    path = `/${type}/brands/${brand}/models/${model}/years/${year}`;
  }

  const res = await fetch(`${FIPE_BASE}${path}`);
  if (!res.ok) {
    return json({ error: `API FIPE respondeu ${res.status}` }, 502);
  }
  const data = await res.json();

  // Consulta final (valor): alimenta o cache fipe_reference
  if (brand && model && year && data?.codeFipe) {
    const value = Number(
      String(data.price)
        .replace(/[^\d,]/g, "")
        .replace(",", "."),
    );
    if (Number.isFinite(value) && value > 0) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const referenceMonth = `${new Date().toISOString().slice(0, 7)}-01`;
      await supabase.from("fipe_reference").upsert({
        fipe_code: data.codeFipe,
        brand: data.brand,
        model: data.model,
        model_year: data.modelYear,
        reference_month: referenceMonth,
        value,
      });
    }
  }

  return json(data);
});
