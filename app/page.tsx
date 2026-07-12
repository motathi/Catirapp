import { Fragment } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import HomeAuthButton from "@/components/HomeAuthButton";
import Logo from "@/components/Logo";
import AdBanner from "@/components/AdBanner";
import { fetchActiveAds, fetchFeedListings } from "@/lib/supabase";
import {
  fipePercent,
  formatBRL,
  formatKm,
  mockListings,
  savings,
  type Listing,
} from "@/lib/listings";

// A vitrine não depende do usuário: cacheia por 60s (ISR) para carregar
// instantâneo, revalidando o estoque/anúncios em segundo plano.
export const revalidate = 60;

// Menus de acesso rápido, no estilo das vitrines de marketplace
const quickMenus = [
  { emoji: "🔥", label: "30% OFF", href: "/buscar?pct_max=70" },
  { emoji: "📉", label: "Baixou o preço", href: "/buscar?baixou=1" },
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
            loading="lazy"
            decoding="async"
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
        {listing.previousPrice && (
          <span className="absolute bottom-2 left-2 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
            📉 Baixou o preço
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
          {listing.previousPrice && (
            <s className="mr-1.5 text-xs font-medium text-mute">
              {formatBRL(listing.previousPrice)}
            </s>
          )}
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

// Banner retangular estreito, largura total, entre os veículos
export default async function HomePage() {
  const [listingsData, ads] = await Promise.all([
    fetchFeedListings(),
    fetchActiveAds(),
  ]);
  const listings = listingsData ?? mockListings;

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-24">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 px-5 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center">
            <Logo className="h-[58px] w-auto" />
            <span className="sr-only">Catire</span>
          </h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <HomeAuthButton />
          </div>
        </div>

        {/* Busca com acesso aos filtros */}
        <form action="/buscar" method="get" className="relative mt-3">
          <input
            name="q"
            placeholder="Buscar marca ou modelo…"
            className="w-full rounded-xl border border-line bg-card py-2.5 pl-4 pr-28 text-sm outline-none focus:border-emerald-500"
          />
          <Link
            href="/buscar"
            className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-emerald-950 transition hover:bg-emerald-400"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              aria-hidden
            >
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="7" y1="12" x2="17" y2="12" />
              <line x1="10" y1="17" x2="14" y2="17" />
            </svg>
            Filtros
          </Link>
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
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-mute">
          Estoque · {listings.length}{" "}
          {listings.length === 1 ? "veículo" : "veículos"}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {listings.map((listing, i) => (
            <Fragment key={listing.id}>
              <StockCard listing={listing} />
              {/* Publicidade a cada 4 veículos, alternando anunciantes */}
              {ads.length > 0 &&
                (i + 1) % 4 === 0 &&
                i < listings.length - 1 && (
                  <AdBanner
                    ad={ads[(Math.floor((i + 1) / 4) - 1) % ads.length]}
                  />
                )}
            </Fragment>
          ))}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
