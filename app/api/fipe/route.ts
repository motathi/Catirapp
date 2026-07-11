import { NextResponse } from "next/server";
import { FIPE_VEHICLE_TYPES, fetchFipe } from "@/lib/fipe";

// Proxy server-side da consulta FIPE usada no formulário de anúncio.
//
// O formulário roda no navegador, mas chamar a Edge Function do Supabase
// direto do cliente exige que a NEXT_PUBLIC_SUPABASE_ANON_KEY esteja embutida
// no bundle — o que falha quando o build foi gerado antes das variáveis
// existirem no Vercel (o header vira "Bearer undefined" e o gateway responde
// 401, deixando as listas vazias). Aqui a chamada é feita pelo servidor, que
// lê as variáveis em runtime. Sem CORS e sem depender de chave no cliente.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "cars";

  if (!FIPE_VEHICLE_TYPES.includes(type)) {
    return NextResponse.json(
      { error: "type deve ser cars, motorcycles ou trucks" },
      { status: 400 },
    );
  }

  const { ok, status, data } = await fetchFipe({
    type,
    brand: url.searchParams.get("brand"),
    model: url.searchParams.get("model"),
    year: url.searchParams.get("year"),
  });

  if (!ok) {
    return NextResponse.json(
      { error: `Falha ao consultar a tabela FIPE (${status})` },
      { status: 502 },
    );
  }
  return NextResponse.json(data);
}
