"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { createListing } from "@/app/anunciar/actions";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { categoryLabel, formatBRL } from "@/lib/listings";
import { BRAZIL_STATES } from "@/lib/brazil";

const MAX_FOTOS = 8;

interface FipeOption {
  code: string;
  name: string;
}

// Espelha o retorno de /api/placa (lib/placa.ts). Definido localmente para não
// arrastar código de servidor para o bundle do cliente.
interface PlacaCandidate {
  fipeType: string;
  brandCode: string;
  modelCode: string;
  yearCode: string;
  value: number;
  label: string;
  codeFipe: string;
}
interface PlacaResult {
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

const fipeTypeByCategory: Record<string, string> = {
  carro: "cars",
  suv: "cars",
  caminhonete: "cars",
  moto: "motorcycles",
  caminhao: "trucks",
};

const inputClass =
  "rounded-xl border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-emerald-500";

async function fipe(path: string): Promise<unknown> {
  // Chama a rota same-origin, que faz o proxy server-side para a FIPE.
  // Assim não dependemos da anon key embutida no bundle do cliente.
  const res = await fetch(`/api/fipe?${path}`);
  if (!res.ok) throw new Error(`FIPE ${res.status}`);
  return res.json();
}

// --- Otimização de imagens no navegador -------------------------------------
// Comprime a foto (versão principal) e gera uma miniatura antes do upload,
// para economizar armazenamento e acelerar o carregamento das páginas.
let webpSupport: boolean | null = null;
function supportsWebp(): boolean {
  if (webpSupport !== null) return webpSupport;
  const c = document.createElement("canvas");
  webpSupport = c.toDataURL("image/webp").startsWith("data:image/webp");
  return webpSupport;
}

async function resizeToBlob(
  file: File,
  maxSide: number,
  quality: number,
  type: string,
): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return null;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
}

interface ProcessedImage {
  main: Blob;
  thumb: Blob | null;
  ext: string;
  contentType: string;
}

async function processImage(file: File): Promise<ProcessedImage | null> {
  try {
    const type = supportsWebp() ? "image/webp" : "image/jpeg";
    const ext = type === "image/webp" ? "webp" : "jpg";
    const main = await resizeToBlob(file, 1600, 0.82, type);
    if (!main) return null;
    const thumb = await resizeToBlob(file, 400, 0.7, type);
    return { main, thumb, ext, contentType: type };
  } catch {
    return null;
  }
}

export default function AnunciarForm() {
  const [category, setCategory] = useState("carro");
  const [brands, setBrands] = useState<FipeOption[]>([]);
  const [models, setModels] = useState<FipeOption[]>([]);
  const [years, setYears] = useState<FipeOption[]>([]);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [manualFipeValue, setManualFipeValue] = useState<number | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // Ficha controlada (para a busca por placa poder autopreencher).
  const [cor, setCor] = useState("");
  const [combustivel, setCombustivel] = useState("");
  const [cambio, setCambio] = useState("");

  // Final da placa (autopreenchido a partir da placa digitada no topo).
  const [finalPlaca, setFinalPlaca] = useState("");

  // Estado e cidade (cidade carregada do IBGE conforme o estado).
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [cidades, setCidades] = useState<string[]>([]);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [cidadesErro, setCidadesErro] = useState(false);

  // Catira: categorias aceitas na troca (controlado para o "selecionar todas").
  const catiraOptions = Object.keys(categoryLabel);
  const [aceita, setAceita] = useState<string[]>([]);
  const todasAceitas = aceita.length === catiraOptions.length;

  // Fotos (até MAX_FOTOS) — gerenciadas em estado para pré-visualizar/remover.
  const [photos, setPhotos] = useState<File[]>([]);
  const previews = useMemo(
    () => photos.map((f) => URL.createObjectURL(f)),
    [photos],
  );
  useEffect(() => {
    return () => previews.forEach((u) => URL.revokeObjectURL(u));
  }, [previews]);

  function addPhotos(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (incoming.length === 0) return;
    setPhotos((prev) => [...prev, ...incoming].slice(0, MAX_FOTOS));
  }
  function removePhoto(i: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Envio do formulário (upload das fotos no cliente + server action).
  const [submitting, startSubmit] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Busca inteligente por placa.
  const [plate, setPlate] = useState("");
  const [plateLoading, setPlateLoading] = useState(false);
  const [plateError, setPlateError] = useState<string | null>(null);
  const [identified, setIdentified] = useState<PlacaResult | null>(null);
  const [candidateIdx, setCandidateIdx] = useState(0);

  const manualFipeType = fipeTypeByCategory[category] ?? "cars";

  // Está usando os dados da placa quando há um veículo identificado com valor
  // FIPE confirmado.
  const usingPlate = !!identified && identified.candidates.length > 0;
  const chosen = usingPlate
    ? identified!.candidates[Math.min(candidateIdx, identified!.candidates.length - 1)]
    : null;

  const fipeType = usingPlate ? chosen!.fipeType : manualFipeType;
  const fipeValue = usingPlate ? chosen!.value : manualFipeValue;
  const maxPrice = fipeValue ? Math.floor(fipeValue * 0.85) : null;

  // Valores enviados no submit: da placa quando identificado, senão dos selects.
  const brandCodeField = usingPlate ? chosen!.brandCode : brand;
  const modelCodeField = usingPlate ? chosen!.modelCode : model;
  const yearCodeField = usingPlate ? chosen!.yearCode : year;

  useEffect(() => {
    setBrands([]);
    setBrand("");
    setModels([]);
    setModel("");
    setYears([]);
    setYear("");
    setManualFipeValue(null);
    setLoading("marcas");
    fipe(`type=${manualFipeType}`)
      .then((d) => setBrands(d as FipeOption[]))
      .catch(() => setBrands([]))
      .finally(() => setLoading(null));
  }, [manualFipeType]);

  useEffect(() => {
    setModels([]);
    setModel("");
    setYears([]);
    setYear("");
    setManualFipeValue(null);
    if (!brand) return;
    setLoading("modelos");
    fipe(`type=${manualFipeType}&brand=${brand}`)
      .then((d) => setModels(d as FipeOption[]))
      .catch(() => setModels([]))
      .finally(() => setLoading(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand]);

  useEffect(() => {
    setYears([]);
    setYear("");
    setManualFipeValue(null);
    if (!model) return;
    setLoading("anos");
    fipe(`type=${manualFipeType}&brand=${brand}&model=${model}`)
      .then((d) => setYears(d as FipeOption[]))
      .catch(() => setYears([]))
      .finally(() => setLoading(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  useEffect(() => {
    setManualFipeValue(null);
    if (!year) return;
    setLoading("valor FIPE");
    fipe(`type=${manualFipeType}&brand=${brand}&model=${model}&year=${year}`)
      .then((d) => {
        const data = d as { price?: string };
        const v = Number(
          String(data.price ?? "")
            .replace(/[^\d,]/g, "")
            .replace(",", "."),
        );
        setManualFipeValue(v > 0 ? v : null);
      })
      .catch(() => setManualFipeValue(null))
      .finally(() => setLoading(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  // Carrega os municípios do estado selecionado (API pública do IBGE).
  useEffect(() => {
    setCidade("");
    setCidades([]);
    setCidadesErro(false);
    if (!estado) return;
    setLoadingCidades(true);
    fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios?orderBy=nome`,
    )
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((arr: { nome: string }[]) => setCidades(arr.map((m) => m.nome)))
      .catch(() => setCidadesErro(true))
      .finally(() => setLoadingCidades(false));
  }, [estado]);

  async function buscarPlaca() {
    const p = plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (p.length < 7) {
      setPlateError("Digite uma placa válida (7 caracteres).");
      return;
    }
    setPlateLoading(true);
    setPlateError(null);
    try {
      const res = await fetch(`/api/placa?placa=${p}`);
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(e.error ?? "Não encontramos dados para esta placa.");
      }
      const data = (await res.json()) as PlacaResult;
      setIdentified(data);
      setCandidateIdx(0);
      if (data.category) setCategory(data.category);
      if (data.cor) setCor(data.cor);
      if (data.combustivel) setCombustivel(data.combustivel);
      if (data.cambio) setCambio(data.cambio);
      // Final da placa = último dígito da placa digitada.
      const digits = p.replace(/\D/g, "");
      if (digits) setFinalPlaca(digits.slice(-1));
      if (data.candidates.length === 0) {
        setPlateError(
          "Identificamos o veículo, mas não o valor FIPE automaticamente. Selecione marca, modelo e ano abaixo.",
        );
      }
    } catch (e) {
      setIdentified(null);
      setPlateError(e instanceof Error ? e.message : "Erro ao consultar a placa.");
    } finally {
      setPlateLoading(false);
    }
  }

  function editarManual() {
    setIdentified(null);
    setPlateError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting || uploading) return;
    setSubmitError(null);

    const formData = new FormData(e.currentTarget);
    // As fotos são gerenciadas em estado (previews/remover) e não vão no corpo
    // da server action (limite de tamanho): sobem direto para o Storage aqui e
    // enviamos só os caminhos.
    const files = photos.slice(0, MAX_FOTOS);

    if (files.length > 0) {
      const supabase = createSupabaseBrowser();
      if (!supabase) {
        setSubmitError("Serviço indisponível. Tente novamente.");
        return;
      }
      setUploading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = "/entrar";
          return;
        }
        for (const file of files) {
          const uuid = crypto.randomUUID();
          const processed = await processImage(file);

          // Envia sempre um par (foto_path, foto_thumb) na mesma ordem.
          if (processed) {
            const mainPath = `${user.id}/${uuid}.${processed.ext}`;
            const { error } = await supabase.storage
              .from("listing-photos")
              .upload(mainPath, processed.main, {
                contentType: processed.contentType,
              });
            if (error) {
              setSubmitError(
                "Não foi possível enviar as fotos. Verifique sua conexão e tente novamente.",
              );
              setUploading(false);
              return;
            }
            let thumbPath = "";
            if (processed.thumb) {
              const tp = `${user.id}/${uuid}.thumb.${processed.ext}`;
              const { error: tErr } = await supabase.storage
                .from("listing-photos")
                .upload(tp, processed.thumb, {
                  contentType: processed.contentType,
                });
              if (!tErr) thumbPath = tp;
            }
            formData.append("foto_path", mainPath);
            formData.append("foto_thumb", thumbPath);
          } else {
            // Navegador sem suporte a canvas/bitmap: envia o original
            const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
            const path = `${user.id}/${uuid}.${ext}`;
            const { error } = await supabase.storage
              .from("listing-photos")
              .upload(path, file, { contentType: file.type || "image/jpeg" });
            if (error) {
              setSubmitError(
                "Não foi possível enviar as fotos. Verifique sua conexão e tente novamente.",
              );
              setUploading(false);
              return;
            }
            formData.append("foto_path", path);
            formData.append("foto_thumb", "");
          }
        }
      } catch {
        setSubmitError("Erro ao enviar as fotos. Tente novamente.");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    // Metadados (corpo pequeno) vão para a server action, que publica e redireciona.
    startSubmit(() => {
      createListing(formData);
    });
  }

  const busy = submitting || uploading;

  return (
    <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
      {/* Busca inteligente por placa */}
      <section className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
          ✨ Preenchimento por IA
        </h2>
        <p className="mt-1 text-xs text-mute">
          Digite a placa e nossa IA preenche marca, modelo, ano, cor e o valor
          FIPE automaticamente.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            placeholder="ABC1D23"
            maxLength={8}
            className={`${inputClass} flex-1 font-semibold uppercase tracking-widest`}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                buscarPlaca();
              }
            }}
          />
          <button
            type="button"
            onClick={buscarPlaca}
            disabled={plateLoading}
            className="rounded-xl bg-emerald-500 px-4 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {plateLoading ? "Buscando…" : "Buscar ✨"}
          </button>
        </div>

        {plateError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{plateError}</p>
        )}

        {identified && (
          <div className="mt-3 rounded-xl border border-line bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                  Veículo identificado
                </p>
                <p className="mt-0.5 text-sm font-bold">
                  {identified.marca} {identified.modelo}
                  {identified.modelYear ? ` · ${identified.modelYear}` : ""}
                </p>
                {identified.cor && (
                  <p className="text-xs text-mute">Cor: {identified.cor}</p>
                )}
              </div>
              <button
                type="button"
                onClick={editarManual}
                className="shrink-0 text-xs font-semibold text-mute underline"
              >
                Preencher manual
              </button>
            </div>

            {identified.candidates.length > 1 && (
              <label className="mt-3 block text-xs text-mute">
                Confirme a versão (FIPE):
                <select
                  value={candidateIdx}
                  onChange={(e) => setCandidateIdx(Number(e.target.value))}
                  className={`${inputClass} mt-1 w-full`}
                >
                  {identified.candidates.map((c, i) => (
                    <option key={c.codeFipe} value={i}>
                      {c.label} — {formatBRL(c.value)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
      </section>

      {/* Veículo */}
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
          Veículo
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`${inputClass} col-span-2`}
          >
            {Object.keys(fipeTypeByCategory).map((c) => (
              <option key={c} value={c}>
                {categoryLabel[c as keyof typeof categoryLabel]}
              </option>
            ))}
          </select>

          {usingPlate ? (
            <div className="col-span-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm">
              {chosen!.label}
            </div>
          ) : (
            <>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className={`${inputClass} col-span-2`}
                required
              >
                <option value="">Marca…</option>
                {brands.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className={`${inputClass} col-span-2`}
                disabled={!brand}
                required
              >
                <option value="">Modelo…</option>
                {models.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className={inputClass}
                disabled={!model}
                required
              >
                <option value="">Ano…</option>
                {years.map((y) => (
                  <option key={y.code} value={y.code}>
                    {y.name}
                  </option>
                ))}
              </select>
            </>
          )}

          <input
            name="mileage_km"
            type="number"
            min={0}
            placeholder="Quilometragem"
            className={`${inputClass} ${usingPlate ? "col-span-2" : ""}`}
            required
          />
        </div>

        {loading && !usingPlate && (
          <p className="mt-2 text-xs text-mute">Carregando {loading}…</p>
        )}
        {fipeValue && (
          <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm">
            Valor FIPE: <strong>{formatBRL(fipeValue)}</strong> · preço máximo
            no Catire (85%):{" "}
            <strong className="text-emerald-600 dark:text-emerald-400">
              {formatBRL(maxPrice!)}
            </strong>
          </p>
        )}

        <input type="hidden" name="fipe_type" value={fipeType} />
        <input type="hidden" name="brand_code" value={brandCodeField} />
        <input type="hidden" name="model_code" value={modelCodeField} />
        <input type="hidden" name="year_code" value={yearCodeField} />
      </section>

      {/* Preço e localização */}
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
          Preço e localização
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            name="price"
            type="number"
            min={1}
            max={maxPrice ?? undefined}
            placeholder={maxPrice ? `Preço (até ${formatBRL(maxPrice)})` : "Preço"}
            className={`${inputClass} col-span-2`}
            required
          />
          <select
            name="state"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className={inputClass}
            required
          >
            <option value="">Estado…</option>
            {BRAZIL_STATES.map((s) => (
              <option key={s.uf} value={s.uf}>
                {s.nome} ({s.uf})
              </option>
            ))}
          </select>

          {cidadesErro ? (
            <input
              name="city"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Cidade"
              className={inputClass}
              required
            />
          ) : (
            <select
              name="city"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className={inputClass}
              disabled={!estado || loadingCidades}
              required
            >
              <option value="">
                {loadingCidades ? "Carregando…" : "Cidade…"}
              </option>
              {cidades.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {/* Ficha do veículo */}
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
          Ficha do veículo
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            name="color"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            placeholder="Cor"
            className={inputClass}
          />
          <select
            name="transmission"
            value={cambio}
            onChange={(e) => setCambio(e.target.value)}
            className={inputClass}
          >
            <option value="">Câmbio…</option>
            <option value="manual">Manual</option>
            <option value="automatico">Automático</option>
            <option value="cvt">CVT</option>
            <option value="automatizado">Automatizado</option>
          </select>
          <select
            name="fuel"
            value={combustivel}
            onChange={(e) => setCombustivel(e.target.value)}
            className={inputClass}
          >
            <option value="">Combustível…</option>
            <option value="flex">Flex</option>
            <option value="gasolina">Gasolina</option>
            <option value="etanol">Etanol</option>
            <option value="diesel">Diesel</option>
            <option value="hibrido">Híbrido</option>
            <option value="eletrico">Elétrico</option>
          </select>
          <input
            name="doors"
            type="number"
            min={2}
            max={6}
            placeholder="Portas"
            className={inputClass}
          />
          <input
            name="plate_end"
            type="number"
            min={0}
            max={9}
            value={finalPlaca}
            onChange={(e) => setFinalPlaca(e.target.value)}
            placeholder="Final da placa"
            className={inputClass}
          />
          <select name="damage_severity" defaultValue="nenhum" className={inputClass}>
            <option value="nenhum">Sem sinistro</option>
            <option value="pequena_monta">Sinistro pequena monta</option>
            <option value="media_monta">Sinistro média monta</option>
            <option value="grande_monta">Sinistro grande monta</option>
          </select>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5 text-sm">
          {(
            [
              ["auction_history", "Passagem por leilão"],
              ["has_lien", "Gravame (financiamento ativo)"],
              ["mechanical_issues", "Problema na mecânica"],
              ["single_owner", "Único dono"],
              ["armored", "Blindado"],
            ] as const
          ).map(([name, label]) => (
            <label key={name} className="flex items-center gap-2">
              <input type="checkbox" name={name} value="1" className="h-4 w-4 accent-emerald-500" />
              {label}
            </label>
          ))}
          <label className="flex items-center gap-2">
            <input type="checkbox" name="ipva_paid" value="1" defaultChecked className="h-4 w-4 accent-emerald-500" />
            IPVA pago
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="licensed" value="1" defaultChecked className="h-4 w-4 accent-emerald-500" />
            Licenciamento em dia
          </label>
        </div>
        <textarea
          name="condition_notes"
          maxLength={1000}
          rows={3}
          placeholder="Observações sobre o estado do veículo (opcional)"
          className={`${inputClass} mt-3 w-full`}
        />
      </section>

      {/* Catira */}
      <section className="rounded-2xl border border-line bg-card p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
            Aceita na troca (catira)
          </h2>
          <button
            type="button"
            onClick={() => setAceita(todasAceitas ? [] : [...catiraOptions])}
            className="text-xs font-semibold text-emerald-600 underline dark:text-emerald-400"
          >
            {todasAceitas ? "Limpar" : "Selecionar todas"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5 text-sm">
          {catiraOptions.map((value) => (
            <label key={value} className="flex items-center gap-2">
              <input
                type="checkbox"
                name="aceita"
                value={value}
                checked={aceita.includes(value)}
                onChange={(e) =>
                  setAceita((prev) =>
                    e.target.checked
                      ? [...prev, value]
                      : prev.filter((v) => v !== value),
                  )
                }
                className="h-4 w-4 accent-emerald-500"
              />
              {categoryLabel[value as keyof typeof categoryLabel]}
            </label>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="aceita_volta" value="1" className="h-4 w-4 accent-emerald-500" />
          Aceito bem + complemento em dinheiro (volta)
        </label>
      </section>

      {/* Fotos */}
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
          Fotos do veículo
        </h2>
        <p className="mt-1 text-xs text-mute">
          Anúncios com fotos vendem muito mais. Até {MAX_FOTOS} fotos — a
          primeira é a capa.
        </p>

        {photos.length === 0 ? (
          // Área grande e clara para adicionar as primeiras fotos
          <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-card-2/40 px-4 py-10 text-center transition hover:border-emerald-500 hover:bg-emerald-500/5">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-500"
              aria-hidden
            >
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
              <circle cx="12" cy="13" r="3.2" />
              <path d="M12 10.5v5M9.5 13h5" />
            </svg>
            <span className="text-base font-semibold text-ink">
              Toque para adicionar fotos
            </span>
            <span className="text-xs text-mute">
              Câmera ou galeria · até {MAX_FOTOS} fotos
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addPhotos(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        ) : (
          // Miniaturas com capa e remover + tile para adicionar mais
          <div className="mt-3 grid grid-cols-3 gap-2">
            {previews.map((url, i) => (
              <div
                key={url}
                className="group relative aspect-square overflow-hidden rounded-xl border border-line"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Foto ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-emerald-950">
                    Capa
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label={`Remover foto ${i + 1}`}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-sm text-white transition hover:bg-black/80"
                >
                  ✕
                </button>
              </div>
            ))}
            {photos.length < MAX_FOTOS && (
              <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-center text-mute transition hover:border-emerald-500 hover:text-emerald-500">
                <span className="flex flex-col items-center gap-0.5">
                  <span className="text-2xl leading-none">＋</span>
                  <span className="text-[11px] font-medium">Adicionar</span>
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        )}

        {photos.length > 0 && (
          <p className="mt-2 text-xs text-mute">
            {photos.length} de {MAX_FOTOS} foto{photos.length > 1 ? "s" : ""}{" "}
            selecionada{photos.length > 1 ? "s" : ""} · toque em ✕ para remover
          </p>
        )}
      </section>

      {submitError && (
        <p className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-900 dark:bg-red-950/70 dark:text-red-300">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={!fipeValue || busy}
        className="rounded-xl bg-emerald-500 py-3.5 font-bold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {uploading
          ? "Enviando fotos…"
          : submitting
            ? "Publicando…"
            : "Publicar anúncio"}
      </button>
    </form>
  );
}
