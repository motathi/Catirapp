import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import Logo from "@/components/Logo";
import IdentityCapture from "@/components/IdentityCapture";
import { verificationEnabled } from "@/lib/identity";
import { signOut } from "@/app/auth/actions";

export const metadata = {
  title: "Verificação de identidade — Catire",
};

export default async function VerificarIdentidadePage() {
  // Serviço de facematch ainda não configurado: não há o que verificar.
  if (!verificationEnabled()) redirect("/perfil");

  const supabase = await createSupabaseServer();
  if (!supabase) redirect("/entrar?erro=Supabase não configurado");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: profile } = await supabase
    .from("profiles")
    .select("identity_verified")
    .eq("id", user.id)
    .single();
  if (profile?.identity_verified) redirect("/perfil");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 pb-20 pt-8">
      <Logo className="mb-6 h-[64px] w-auto self-start shrink-0" />
      <h1 className="text-2xl font-extrabold tracking-tight">
        Verifique sua identidade
      </h1>
      <p className="mt-1 text-sm text-mute">
        A segurança é o nosso diferencial. Para liberar sua conta, tire uma foto
        do seu documento e uma selfie — nós confirmamos que é você.
      </p>

      <IdentityCapture />

      <form action={signOut} className="mt-6 text-center">
        <button className="text-sm text-mute underline">Sair</button>
      </form>
    </main>
  );
}
