// Skeleton do anúncio: espelha o layout (foto grande + blocos) para a abertura
// via link parecer instantânea.
export default function Loading() {
  return (
    <main className="mx-auto min-h-dvh max-w-md pb-24">
      <div className="h-72 animate-pulse bg-card-2" />
      <div className="animate-pulse space-y-4 px-5 pt-5">
        <div className="h-7 w-56 rounded-lg bg-card-2" />
        <div className="h-4 w-40 rounded bg-card-2" />
        <div className="h-28 rounded-2xl bg-card-2" />
        <div className="h-40 rounded-2xl bg-card-2" />
      </div>
    </main>
  );
}
