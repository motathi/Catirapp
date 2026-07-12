import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

interface VerifyResult {
  verified: boolean;
  distance: number;
  threshold: number;
  model: string;
}

// Recebe documento + selfie do navegador, encaminha ao serviço de facematch
// (DeepFace) e grava apenas o RESULTADO. As imagens não são armazenadas.
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  if (!supabase)
    return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const base = process.env.FACE_VERIFY_URL;
  const token = process.env.FACE_VERIFY_TOKEN;
  if (!base || !token)
    return NextResponse.json(
      { error: "verification_unconfigured" },
      { status: 503 },
    );

  const form = await req.formData();
  const document = form.get("document");
  const selfie = form.get("selfie");
  const consent = form.get("consent");
  if (!(document instanceof File) || !(selfie instanceof File))
    return NextResponse.json({ error: "missing_images" }, { status: 400 });
  if (consent !== "true")
    return NextResponse.json({ error: "consent_required" }, { status: 400 });

  // Encaminha ao serviço de match (nunca chamado direto pelo navegador).
  const upstream = new FormData();
  upstream.append("document", document, "document.jpg");
  upstream.append("selfie", selfie, "selfie.jpg");

  let res: Response;
  try {
    res = await fetch(`${base.replace(/\/$/, "")}/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: upstream,
    });
  } catch {
    return NextResponse.json(
      { error: "verify_service_unreachable" },
      { status: 502 },
    );
  }

  if (res.status === 422)
    return NextResponse.json({ error: "face_not_detected" }, { status: 422 });
  if (!res.ok)
    return NextResponse.json({ error: "verify_failed" }, { status: 502 });

  const result = (await res.json()) as VerifyResult;

  const admin = createSupabaseAdmin();
  if (!admin)
    return NextResponse.json({ error: "unavailable" }, { status: 503 });

  // Auditoria (sem imagens).
  await admin.from("identity_verifications").insert({
    user_id: user.id,
    verified: result.verified,
    distance: result.distance,
    threshold: result.threshold,
    model: result.model,
  });

  // Consentimento sempre registrado; verificação só quando aprovada. O trigger
  // profiles_protect_identity só deixa o service_role marcar identity_verified.
  const patch: Record<string, unknown> = {
    identity_consent_at: new Date().toISOString(),
  };
  if (result.verified) {
    patch.identity_verified = true;
    patch.identity_verified_at = new Date().toISOString();
  }
  const { error } = await admin
    .from("profiles")
    .update(patch)
    .eq("id", user.id);
  if (error)
    return NextResponse.json({ error: "persist_failed" }, { status: 500 });

  return NextResponse.json({
    verified: result.verified,
    distance: result.distance,
  });
}
