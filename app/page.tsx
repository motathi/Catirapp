import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import { fetchFeedListings } from "@/lib/supabase";
import {
  fipePercent,
  formatBRL,
  formatKm,
  mockListings,
  savings,
  type Listing,
} from "@/lib/listings";

// A vitrine lê o estoque do Supabase a cada requisição
export const revalidate = 0;

// Menus de acesso rápido, no estilo das vitrines de marketplace
const quickMenus = [
  { emoji: "🔥", label: "30% OFF", href: "/buscar?pct_max=70" },
  { emoji: "💰", label: "20% OFF", href: "/buscar?pct_max=80" },
  { emoji: "🔧", label: "Batidos", href: "/buscar?batidos=1" },
  { emoji: "🛻", label: "Caminhonetes", href: "/buscar?tipo=caminhonete" },
  { emoji: "🏍️", label: "Motos", href: "/buscar?tipo=moto" },
  { emoji: "🚗", label: "Populares", href: "/buscar?tipo=carro&preco_max=60000" },
  { emoji: "🚚", label: "Caminhões", href: "/buscar?tipo=caminhao" },
  { emoji: "🚙", label: "SUVs", href: "/buscar?tipo=suv" },
];

function StockCard({ listing }: { listing: Listing }) {
  const percent = fipePercent(listing);

  return (
    <Link
      href={`/anuncio/${listing.id}`}
      className="overflow-hidden rounded-2xl border border-line bg-card transition hover:border-emerald-500"
    >
      <div className="relative h-32">
        {listing.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.photoUrl}
            alt={`${listing.brand} ${listing.model}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={`h-full w-full bg-gradient-to-br ${listing.photoGradient}`}
          />
        )}
        <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold text-emerald-950">
          {percent}% da FIPE
        </span>
        {listing.isDamaged && (
          <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-950">
            Batido
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold">
          {listing.brand} {listing.model}
        </p>
        <p className="mt-0.5 text-xs text-mute">
          {listing.modelYear} · {formatKm(listing.mileageKm)}
        </p>
        <p className="mt-2 text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
          {formatBRL(listing.price)}
        </p>
        <p className="text-xs text-mute">
          {formatBRL(savings(listing))} abaixo da FIPE · {listing.city}/
          {listing.state}
        </p>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const listings = (await fetchFeedListings()) ?? mockListings;

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-24">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 px-5 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight">
            Catir<span className="text-emerald-500">app</span>
          </h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/perfil"
              className="rounded-full border border-line bg-card px-4 py-1.5 text-sm font-semibold transition hover:bg-card-2"
            >
              Entrar
            </Link>
          </div>
        </div>

        {/* Busca */}
        <form action="/buscar" method="get" className="mt-3">
          <input
            name="q"
            placeholder="Buscar marca ou modelo…"
            className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
        </form>
      </header>

      {/* Menus rápidos */}
      <nav className="scrollbar-none flex gap-2 overflow-x-auto px-5 py-4">
        {quickMenus.map((m) => (
          <Link
            key={m.label}
            href={m.href}
            className="flex shrink-0 flex-col items-center gap-1 rounded-2xl border border-line bg-card px-4 py-3 text-xs font-semibold transition hover:border-emerald-500"
          >
            <span className="text-xl">{m.emoji}</span>
            {m.label}
          </Link>
        ))}
      </nav>

      {/* Modo descoberta */}
      <Link
        href="/feed"
        className="mx-5 mb-4 flex items-center justify-between rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
      >
        <span>⚡ Modo descoberta: deslize pelas melhores ofertas</span>
        <span aria-hidden>›</span>
      </Link>

      {/* Vitrine do estoque */}
      <section className="px-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-mute">
            Estoque · {listings.length}{" "}
            {listings.length === 1 ? "veículo" : "veículos"}
          </h2>
          <Link
            href="/buscar"
            className="text-sm font-semibold text-emerald-600 dark:text-emerald-400"
          >
            Filtros ›
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {listings.map((listing) => (
            <StockCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
