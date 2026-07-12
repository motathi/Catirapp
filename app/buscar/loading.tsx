// Skeleton da busca: barra + lista, para a navegação responder na hora.
export default function Loading() {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-24 pt-8">
      <div className="animate-pulse space-y-4">
        <div className="h-10 rounded-xl bg-card-2" />
        <div className="space-y-2">
          <div className="h-20 rounded-2xl bg-card-2" />
          <div className="h-20 rounded-2xl bg-card-2" />
          <div className="h-20 rounded-2xl bg-card-2" />
          <div className="h-20 rounded-2xl bg-card-2" />
          <div className="h-20 rounded-2xl bg-card-2" />
        </div>
      </div>
    </main>
  );
}
