"use server";

import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function signIn(formData: FormData) {
  const supabase = await createSupabaseServer();
  if (!supabase) redirect("/entrar?erro=Supabase não configurado");

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) {
    const msg =
      error.code === "invalid_credentials"
        ? "E-mail ou senha inválidos"
        : error.code === "email_not_confirmed"
          ? "Confirme seu e-mail antes de entrar"
          : error.message;
    redirect(`/entrar?erro=${encodeURIComponent(msg)}`);
  }
  redirect("/perfil");
}

export async function signUp(formData: FormData) {
  const supabase = await createSupabaseServer();
  if (!supabase) redirect("/cadastro?erro=Supabase não configurado");

  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    options: {
      // Lidos pelo trigger handle_new_user para criar o perfil
      data: {
        display_name: String(formData.get("display_name") ?? ""),
        city: String(formData.get("city") ?? ""),
        state: String(formData.get("state") ?? ""),
      },
    },
  });

  if (error) redirect(`/cadastro?erro=${encodeURIComponent(error.message)}`);

  // Sem sessão = projeto exige confirmação de e-mail
  if (!data.session) {
    redirect(
      "/entrar?aviso=" +
        encodeURIComponent("Conta criada! Confirme seu e-mail para entrar."),
    );
  }
  redirect("/perfil");
}

export async function signOut() {
  const supabase = await createSupabaseServer();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
