// O feed é sempre escuro; enquanto carrega mostramos um spinner no mesmo tom
// para a transição não "piscar" branco.
export default function Loading() {
  return (
    <main className="relative mx-auto flex h-dvh max-w-md items-center justify-center bg-zinc-950">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
    </main>
  );
}
