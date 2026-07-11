import Link from "next/link";
import { signIn } from "@/app/auth/actions";
import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; aviso?: string }>;
}) {
  const { erro, aviso } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 pb-20">
      <Logo className="mb-6 h-16 w-auto" />
      <h1 className="text-2xl font-extrabold tracking-tight">Entrar</h1>
      <p className="mt-1 text-sm text-mute">
        O marketplace que encontra negócios para você.
      </p>

      {aviso && (
        <p className="mt-4 rounded-xl bg-emerald-100 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300">
          {aviso}
        </p>
      )}
      {erro && (
        <p className="mt-4 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-900 dark:bg-red-950/70 dark:text-red-300">
          {erro}
        </p>
      )}

      <form action={signIn} className="mt-6 flex flex-col gap-3">
        <input
          type="email"
          name="email"
          required
          placeholder="E-mail"
          className="rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-emerald-500"
        />
        <input
          type="password"
          name="password"
          required
          placeholder="Senha"
          className="rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          className="mt-2 rounded-xl bg-emerald-500 py-3 font-bold text-emerald-950 transition hover:bg-emerald-400"
        >
          Entrar
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-mute">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-emerald-600 dark:text-emerald-400">
          Cadastre-se
        </Link>
      </p>

      <BottomNav />
    </main>
  );
}
