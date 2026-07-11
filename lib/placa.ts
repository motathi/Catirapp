import { fetchFipe } from "@/lib/fipe";

// Consulta de dados do veículo pela placa (apiplacas.com.br / wdapi2).
// Roda sempre no servidor para não expor o token no navegador.
//
// O token vem da variável de ambiente APIPLACAS_TOKEN. Há um fallback embutido
// para o app funcionar mesmo antes da variável ser configurada no Vercel —
// recomenda-se mover para env var e rotacionar o token por segurança.
const APIPLACAS_TOKEN =
  process.env.APIPLACAS_TOKEN ?? "fd050c6aa430a1233e52a0a2898090f9";

const WDAPI_BASE = "https://wdapi2.com.br/consulta";

export interface PlacaCandidate {
  fipeType: string;
  brandCode: string;
  modelCode: string;
  yearCode: string;
  value: number;
  label: string;
  codeFipe: string;
}

export interface PlacaResult {
  placa: string;
  marca: string;
  modelo: string;
  modelYear: number | null;
  cor: string;
  combustivel: string;
  cambio: string;
  category: string;
  candidates: PlacaCandidate[];
}

// Combustível bruto (extra.combustivel ou sigla FIPE) -> valor do formulário.
function normalizeFuel(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("flex") || (s.includes("gasolina") && s.includes("lcool"))) {
    return "flex";
  }
  if (s.includes("lcool") || s.includes("etanol") || s === "a") return "etanol";
  if (s.includes("diesel") || s === "d") return "diesel";
  if (s.includes("brido") || s.includes("hybrid")) return "hibrido";
  if (s.includes("tric")) return "eletrico";
  if (s.includes("gasolina") || s === "g") return "gasolina";
  return "";
}

function normalizeCambio(raw: string): string {
  const s = raw.toLowerCase();
  if (!s) return "";
  if (s.includes("cvt")) return "cvt";
  if (s.includes("autom") && s.includes("tiz")) return "automatizado";
  if (s.includes("autom")) return "automatico";
  if (s.includes("manual") || s.includes("mecan")) return "manual";
  return "";
}

// tipo_modelo da FIPE -> tipo da API parallelum.
function fipeTypeFromTipoModelo(tipo: unknown): string {
  if (tipo === 2 || tipo === "2") return "motorcycles";
  if (tipo === 3 || tipo === "3") return "trucks";
  return "cars";
}

function categoryFromFipeType(type: string): string {
  if (type === "motorcycles") return "moto";
  if (type === "trucks") return "caminhao";
  return "carro";
}

// Sigla de combustível da FIPE -> índice usado no código de ano da parallelum
// (1 Gasolina, 2 Álcool, 3 Diesel).
function fuelIndex(sigla: string): string {
  const c = (sigla || "").trim().charAt(0).toUpperCase();
  if (c === "A" || c === "E") return "2";
  if (c === "D") return "3";
  return "1";
}

interface FipeDado {
  ano_modelo?: string;
  codigo_marca?: number | string;
  codigo_modelo?: number | string;
  codigo_fipe?: string;
  sigla_combustivel?: string;
  tipo_modelo?: number | string;
  score?: number;
}

// Confirma um candidato na parallelum (fonte da verdade do valor) e devolve o
// código de ano correto. Tenta o índice derivado da sigla e, se falhar, os
// demais, garantindo que o submit do formulário conseguirá revalidar.
async function resolveCandidate(
  dado: FipeDado,
): Promise<PlacaCandidate | null> {
  const fipeType = fipeTypeFromTipoModelo(dado.tipo_modelo);
  const brandCode = String(dado.codigo_marca ?? "");
  const modelCode = String(dado.codigo_modelo ?? "");
  const ano = String(dado.ano_modelo ?? "");
  if (!brandCode || !modelCode || !ano) return null;

  const tried = new Set<string>();
  const order = [fuelIndex(dado.sigla_combustivel ?? ""), "1", "2", "3"];
  for (const idx of order) {
    if (tried.has(idx)) continue;
    tried.add(idx);
    const yearCode = `${ano}-${idx}`;
    const r = await fetchFipe({ type: fipeType, brand: brandCode, model: modelCode, year: yearCode });
    const data = r.data as
      | { price?: string; codeFipe?: string; brand?: string; model?: string; modelYear?: number }
      | null;
    if (r.ok && data?.codeFipe) {
      const value = Number(
        String(data.price ?? "")
          .replace(/[^\d,]/g, "")
          .replace(",", "."),
      );
      if (value > 0) {
        return {
          fipeType,
          brandCode,
          modelCode,
          yearCode,
          value,
          label: `${data.brand} ${data.model} ${data.modelYear}`,
          codeFipe: data.codeFipe,
        };
      }
    }
  }
  return null;
}

export async function lookupPlaca(placaRaw: string): Promise<PlacaResult | null> {
  const placa = placaRaw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (placa.length < 7) return null;

  const res = await fetch(`${WDAPI_BASE}/${placa}/${APIPLACAS_TOKEN}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;

  const d = (await res.json()) as Record<string, unknown>;
  const extra = (d.extra ?? {}) as Record<string, unknown>;
  const fipe = (d.fipe ?? {}) as { dados?: FipeDado[] };

  const marca = String(d.marca ?? d.MARCA ?? "").trim();
  const modelo = String(d.modelo ?? d.MODELO ?? "").trim();
  if (!marca && !modelo && !(fipe.dados && fipe.dados.length)) return null;

  const modelYearStr = String(d.anoModelo ?? d.ano ?? "").trim();
  const modelYear = /^\d{4}$/.test(modelYearStr) ? Number(modelYearStr) : null;

  const combustivel = normalizeFuel(
    String(extra.combustivel ?? fipe.dados?.[0]?.sigla_combustivel ?? ""),
  );
  const cambio = normalizeCambio(String(extra.caixa_cambio ?? ""));

  // Resolve os candidatos FIPE (ordenados por score) em paralelo.
  const dados = (fipe.dados ?? [])
    .slice()
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 4);
  const resolved = await Promise.all(dados.map(resolveCandidate));
  const candidates = resolved.filter((c): c is PlacaCandidate => c !== null);

  const fipeType = candidates[0]?.fipeType ?? "cars";

  return {
    placa,
    marca,
    modelo,
    modelYear,
    cor: String(d.cor ?? "").trim(),
    combustivel,
    cambio,
    category: categoryFromFipeType(fipeType),
    candidates,
  };
}
