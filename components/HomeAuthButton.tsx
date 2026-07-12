"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

const cls =
  "rounded-full border border-line bg-card px-4 py-1.5 text-sm font-semibold transition hover:bg-card-2";

// Home é cacheada (ISR), então a sessão é verificada no cliente: logado vira
// "Perfil"; deslogado mantém "Entrar".
export default function HomeAuthButton() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    // Sem Supabase configurado, mantém o estado nulo → mostra "Entrar".
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthed(Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (authed) {
    return (
      <Link href="/perfil" className={cls}>
        Perfil
      </Link>
    );
  }

  return (
    <Link href="/entrar" className={cls}>
      Entrar
    </Link>
  );
}
