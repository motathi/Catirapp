import Link from "next/link";
import { signUp } from "@/app/auth/actions";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  const inputClass =
    "rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-emerald-500";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 pb-20">
      <Logo className="mb-6 h-24 w-auto" />
      <h1 className="text-2xl font-extrabold tracking-tight">Criar conta</h1>
      <p className="mt-1 text-sm text-mute">
        Comece grátis: 1 anúncio ativo e 1 contato de matching por dia.
      </p>

      {erro && (
        <p className="mt-4 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-900 dark:bg-red-950/70 dark:text-red-300">
          {erro}
        </p>
      )}

      <form action={signUp} className="mt-6 flex flex-col gap-3">
        <input
          name="display_name"
          required
          placeholder="Nome"
          className={inputClass}
        />
        <input
          type="email"
          name="email"
          required
          placeholder="E-mail"
          className={inputClass}
        />
        <input
          type="password"
          name="password"
          required
          minLength={8}
          placeholder="Senha (mínimo 8 caracteres)"
          className={inputClass}
        />
        <div className="grid grid-cols-[1fr_5rem] gap-3">
          <input name="city" placeholder="Cidade" className={inputClass} />
          <input
            name="state"
            maxLength={2}
            placeholder="UF"
            className={`${inputClass} uppercase`}
          />
        </div>
        <button
          type="submit"
          className="mt-2 rounded-xl bg-emerald-500 py-3 font-bold text-emerald-950 transition hover:bg-emerald-400"
        >
          Criar conta
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-mute">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-emerald-600 dark:text-emerald-400">
          Entrar
        </Link>
      </p>

      <BottomNav />
    </main>
  );
}
