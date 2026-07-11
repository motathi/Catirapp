"use server";

import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { fetchFipe } from "@/lib/fipe";

function fail(msg: string): never {
  redirect(`/anunciar?erro=${encodeURIComponent(msg)}`);
}

export async function createListing(formData: FormData) {
  const supabase = await createSupabaseServer();
  if (!supabase) fail("Supabase não configurado");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const fipeType = String(formData.get("fipe_type") ?? "");
  const brandCode = String(formData.get("brand_code") ?? "");
  const modelCode = String(formData.get("model_code") ?? "");
  const yearCode = String(formData.get("year_code") ?? "");
  if (!brandCode || !modelCode || !yearCode) {
    fail("Selecione marca, modelo e ano para buscar o valor FIPE");
  }

  // Reconsulta a FIPE no servidor: o valor que vale é o da tabela,
  // nunca o que veio do formulário.
  const fipeRes = await fetchFipe({
    type: fipeType,
    brand: brandCode,
    model: modelCode,
    year: yearCode,
  });
  const fipe = fipeRes.data as {
    price?: string;
    codeFipe?: string;
    brand?: string;
    model?: string;
    modelYear?: number;
  } | null;
  const fipeValue = Number(
    String(fipe?.price ?? "")
      .replace(/[^\d,]/g, "")
      .replace(",", "."),
  );
  if (!fipeRes.ok || !fipe?.codeFipe || !(fipeValue > 0)) {
    fail("Não foi possível confirmar o valor FIPE deste veículo");
  }

  const price = Number(formData.get("price"));
  if (!(price > 0)) fail("Informe o preço do anúncio");

  const category = String(formData.get("category") ?? "carro");
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
  if (!city || state.length !== 2) fail("Informe cidade e UF");

  const title = `${fipe.brand} ${fipe.model} ${fipe.modelYear}`;
  const { data: asset, error: assetErr } = await supabase
    .from("assets")
    .insert({
      owner_id: user.id,
      category,
      title,
      estimated_value: price,
      city,
      state,
    })
    .select("id")
    .single();
  if (assetErr || !asset) fail(`Erro ao criar o bem: ${assetErr?.message}`);

  const opt = (name: string) => {
    const v = String(formData.get(name) ?? "").trim();
    return v === "" ? null : v;
  };

  const { data: listing, error: listErr } = await supabase
    .from("listings")
    .insert({
      owner_id: user.id,
      asset_id: asset.id,
      brand: fipe.brand,
      model: fipe.model,
      model_year: fipe.modelYear,
      mileage_km: Number(formData.get("mileage_km")) || null,
      city,
      state,
      price,
      fipe_code: fipe.codeFipe,
      fipe_value: fipeValue,
      accepts_trade: formData.getAll("aceita").length > 0,
      accepts_cash_complement: formData.get("aceita_volta") === "1",
      damage_severity: opt("damage_severity") ?? "nenhum",
      auction_history: formData.get("auction_history") === "1",
      has_lien: formData.get("has_lien") === "1",
      mechanical_issues: formData.get("mechanical_issues") === "1",
      single_owner: formData.get("single_owner") === "1",
      armored: formData.get("armored") === "1",
      ipva_paid: formData.get("ipva_paid") === "1",
      licensed: formData.get("licensed") === "1",
      color: opt("color"),
      transmission: opt("transmission"),
      fuel: opt("fuel"),
      doors: Number(formData.get("doors")) || null,
      plate_end: formData.get("plate_end") === "" ? null : Number(formData.get("plate_end")),
      condition_notes: opt("condition_notes"),
      status: "active",
    })
    .select("id")
    .single();

  if (listErr || !listing) {
    // Mensagens dos triggers do banco (teto FIPE, cota do plano...)
    await supabase.from("assets").delete().eq("id", asset.id);
    fail(listErr?.message ?? "Erro ao publicar o anúncio");
  }

  const trades = formData.getAll("aceita").map(String);
  if (trades.length > 0) {
    await supabase
      .from("listing_accepted_trades")
      .insert(trades.map((category) => ({ listing_id: listing.id, category })));
  }

  const photo = formData.get("foto");
  if (photo instanceof File && photo.size > 0) {
    const ext = (photo.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("listing-photos")
      .upload(path, photo, { contentType: photo.type || "image/jpeg" });
    if (!upErr) {
      await supabase
        .from("listing_photos")
        .insert({ listing_id: listing.id, storage_path: path, position: 0 });
    }
  }

  redirect(`/anuncio/${listing.id}`);
}
