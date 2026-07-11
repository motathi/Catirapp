import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

// Troca o code do OAuth (Google) por uma sessão e grava os cookies.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/perfil";

  // Atrás do proxy da Vercel o host real vem em x-forwarded-host
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  const base = !isLocal && forwardedHost ? `https://${forwardedHost}` : origin;

  if (code) {
    const supabase = await createSupabaseServer();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${base}${next.startsWith("/") ? next : "/perfil"}`);
      }
    }
  }

  return NextResponse.redirect(
    `${base}/entrar?erro=${encodeURIComponent("Não foi possível entrar com o Google.")}`,
  );
}
