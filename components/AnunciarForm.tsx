"use client";

import { useEffect, useState } from "react";
import { createListing } from "@/app/anunciar/actions";
import { categoryLabel, formatBRL } from "@/lib/listings";

interface FipeOption {
  code: string;
  name: string;
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
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fipe?${path}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
    },
  );
  if (!res.ok) throw new Error(`FIPE ${res.status}`);
  return res.json();
}

export default function AnunciarForm() {
  const [category, setCategory] = useState("carro");
  const [brands, setBrands] = useState<FipeOption[]>([]);
  const [models, setModels] = useState<FipeOption[]>([]);
  const [years, setYears] = useState<FipeOption[]>([]);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [fipeValue, setFipeValue] = useState<number | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const fipeType = fipeTypeByCategory[category] ?? "cars";
  const maxPrice = fipeValue ? Math.floor(fipeValue * 0.85) : null;

  useEffect(() => {
    setBrands([]);
    setBrand("");
    setModels([]);
    setModel("");
    setYears([]);
    setYear("");
    setFipeValue(null);
    setLoading("marcas");
    fipe(`type=${fipeType}`)
      .then((d) => setBrands(d as FipeOption[]))
      .catch(() => setBrands([]))
      .finally(() => setLoading(null));
  }, [fipeType]);

  useEffect(() => {
    setModels([]);
    setModel("");
    setYears([]);
    setYear("");
    setFipeValue(null);
    if (!brand) return;
    setLoading("modelos");
    fipe(`type=${fipeType}&brand=${brand}`)
      .then((d) => setModels(d as FipeOption[]))
      .catch(() => setModels([]))
      .finally(() => setLoading(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand]);

  useEffect(() => {
    setYears([]);
    setYear("");
    setFipeValue(null);
    if (!model) return;
    setLoading("anos");
    fipe(`type=${fipeType}&brand=${brand}&model=${model}`)
      .then((d) => setYears(d as FipeOption[]))
      .catch(() => setYears([]))
      .finally(() => setLoading(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  useEffect(() => {
    setFipeValue(null);
    if (!year) return;
    setLoading("valor FIPE");
    fipe(`type=${fipeType}&brand=${brand}&model=${model}&year=${year}`)
      .then((d) => {
        const data = d as { price?: string };
        const v = Number(
          String(data.price ?? "")
            .replace(/[^\d,]/g, "")
            .replace(",", "."),
        );
        setFipeValue(v > 0 ? v : null);
      })
      .catch(() => setFipeValue(null))
      .finally(() => setLoading(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  return (
    <form action={createListing} className="mt-5 flex flex-col gap-4">
      {/* Veículo (FIPE) */}
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
          <input
            name="mileage_km"
            type="number"
            min={0}
            placeholder="Quilometragem"
            className={inputClass}
            required
          />
        </div>

        {loading && (
          <p className="mt-2 text-xs text-mute">Carregando {loading}…</p>
        )}
        {fipeValue && (
          <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm">
            Valor FIPE: <strong>{formatBRL(fipeValue)}</strong> · preço máximo
            no Catirapp (85%):{" "}
            <strong className="text-emerald-600 dark:text-emerald-400">
              {formatBRL(maxPrice!)}
            </strong>
          </p>
        )}

        <input type="hidden" name="fipe_type" value={fipeType} />
        <input type="hidden" name="brand_code" value={brand} />
        <input type="hidden" name="model_code" value={model} />
        <input type="hidden" name="year_code" value={year} />
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
          <input name="city" placeholder="Cidade" className={inputClass} required />
          <input
            name="state"
            maxLength={2}
            placeholder="UF"
            className={`${inputClass} uppercase`}
            required
          />
        </div>
      </section>

      {/* Ficha do veículo */}
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
          Ficha do veículo
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input name="color" placeholder="Cor" className={inputClass} />
          <select name="transmission" defaultValue="" className={inputClass}>
            <option value="">Câmbio…</option>
            <option value="manual">Manual</option>
            <option value="automatico">Automático</option>
            <option value="cvt">CVT</option>
            <option value="automatizado">Automatizado</option>
          </select>
          <select name="fuel" defaultValue="" className={inputClass}>
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
        <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
          Aceita na troca (catira)
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5 text-sm">
          {Object.entries(categoryLabel).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2">
              <input type="checkbox" name="aceita" value={value} className="h-4 w-4 accent-emerald-500" />
              {label}
            </label>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="aceita_volta" value="1" className="h-4 w-4 accent-emerald-500" />
          Aceito bem + complemento em dinheiro (volta)
        </label>
      </section>

      {/* Foto */}
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
          Foto principal
        </h2>
        <input name="foto" type="file" accept="image/*" className="mt-3 w-full text-sm text-mute" />
      </section>

      <button
        type="submit"
        disabled={!fipeValue}
        className="rounded-xl bg-emerald-500 py-3.5 font-bold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Publicar anúncio
      </button>
    </form>
  );
}
