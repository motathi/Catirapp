import {
  categoryLabel,
  fipePercent,
  formatBRL,
  formatKm,
  mockListings,
  savings,
  type Listing,
} from "@/lib/listings";
import Link from "next/link";
import { fetchFeedListings } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

// O feed lê anúncios novos do Supabase a cada requisição
export const revalidate = 0;

function ListingCard({ listing }: { listing: Listing }) {
  const percent = fipePercent(listing);

  return (
    <article className="relative h-dvh snap-start overflow-hidden">
      {/* Foto principal (Storage) ou gradiente placeholder */}
      {listing.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={listing.photoUrl}
          alt={`${listing.brand} ${listing.model}`}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className={`absolute inset-0 bg-gradient-to-br ${listing.photoGradient}`}
          aria-hidden
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-zinc-950/20" />

      <div className="relative flex h-full flex-col justify-end gap-4 px-5 pb-24 pt-20">
        {/* Selo de percentual da FIPE */}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500 px-3 py-1 text-sm font-bold text-emerald-950">
            {percent}% da FIPE
          </span>
          {listing.acceptsTrade && (
            <span className="rounded-full bg-amber-400/90 px-3 py-1 text-sm font-semibold text-amber-950">
              Aceita catira
            </span>
          )}
        </div>

        <header>
          <h2 className="text-3xl font-bold leading-tight">
            {listing.brand} {listing.model}
          </h2>
          <p className="mt-1 text-zinc-300">
            {listing.modelYear} · {formatKm(listing.mileageKm)} · {listing.city}
            /{listing.state}
          </p>
        </header>

        {/* Bloco de valor: a oportunidade em números */}
        <div className="rounded-2xl bg-zinc-900/80 p-4 backdrop-blur">
          <p className="text-3xl font-extrabold text-emerald-400">
            {formatBRL(listing.price)}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-zinc-400">
              FIPE{" "}
              <s className="text-zinc-500">{formatBRL(listing.fipeValue)}</s>
            </span>
            <span className="font-semibold text-emerald-400">
              Economia de {formatBRL(savings(listing))}
            </span>
          </div>
          {listing.acceptsTrade && (
            <p className="mt-3 text-sm text-zinc-300">
              Aceita na troca:{" "}
              {listing.acceptedCategories
                .map((c) => categoryLabel[c])
                .join(", ")}
            </p>
          )}
        </div>

        {/* Matching inteligente */}
        {listing.matchCount > 0 && (
          <button className="flex items-center justify-between rounded-2xl bg-indigo-600 px-4 py-3 text-left font-semibold transition hover:bg-indigo-500">
            <span>
              ⚡ {listing.matchCount} oportunidades compatíveis com este
              veículo
            </span>
            <span aria-hidden>›</span>
          </button>
        )}

        {/* Ações rápidas */}
        <div className="grid grid-cols-4 gap-2 text-sm font-medium">
          <button className="rounded-xl bg-zinc-800/90 py-3 transition hover:bg-zinc-700">
            ♡ Salvar
          </button>
          <button className="rounded-xl bg-zinc-800/90 py-3 transition hover:bg-zinc-700">
            💬 Contato
          </button>
          <button className="rounded-xl bg-zinc-800/90 py-3 transition hover:bg-zinc-700">
            ⇄ Match
          </button>
          <Link
            href={`/anuncio/${listing.id}`}
            className="rounded-xl bg-zinc-800/90 py-3 text-center transition hover:bg-zinc-700"
          >
            Detalhes
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function FeedPage() {
  // Sem NEXT_PUBLIC_SUPABASE_* configurado, o feed usa os dados de demonstração
  const listings = (await fetchFeedListings()) ?? mockListings;

  return (
    // O modo descoberta é sempre escuro: o conteúdo vive sobre as fotos
    <main className="relative mx-auto max-w-md bg-zinc-950 text-zinc-100">
      {/* Cabeçalho fixo */}
      <div className="fixed inset-x-0 top-0 z-10 mx-auto flex max-w-md items-center justify-between bg-gradient-to-b from-zinc-950/90 to-transparent px-5 pb-8 pt-4">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          ‹ Catir<span className="text-emerald-400">app</span>
        </Link>
        <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
          Só anúncios abaixo da FIPE
        </span>
      </div>

      {/* Feed de oportunidades em tela cheia */}
      <div className="h-dvh snap-y snap-mandatory overflow-y-auto">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
