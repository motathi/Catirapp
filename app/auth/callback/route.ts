import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { verificationEnabled } from "@/lib/identity";

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
        // Gate de verificação de identidade também no login social.
        if (verificationEnabled()) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("identity_verified")
              .eq("id", user.id)
              .single();
            if (!profile?.identity_verified) {
              return NextResponse.redirect(`${base}/verificar-identidade`);
            }
          }
        }
        const dest = next.startsWith("/") ? next : "/perfil";
        return NextResponse.redirect(`${base}${dest}`);
      }
    }
  }

  return NextResponse.redirect(
    `${base}/entrar?erro=${encodeURIComponent("Não foi possível entrar com o Google.")}`,
  );
}
