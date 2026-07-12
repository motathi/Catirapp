"use client";

import { useState } from "react";
import type { Ad } from "@/lib/supabase";

// Banner de patrocinador. A imagem vem do repo (`/ads/*`); se por algum motivo
// faltar, tenta o fallback do bucket e, em último caso, mostra o nome do
// anunciante sobre a cor de fundo — nunca renderiza um ícone de imagem quebrada.
export default function AdBanner({ ad }: { ad: Ad }) {
  const [src, setSrc] = useState(ad.imageUrl);
  const [failed, setFailed] = useState(false);

  const banner = (
    <div
      className="relative col-span-2 flex h-20 items-center justify-center overflow-hidden rounded-2xl border border-line"
      style={{ backgroundColor: ad.bgColor ?? undefined }}
    >
      {failed ? (
        <span className="px-4 text-center text-sm font-bold text-white">
          {ad.advertiser}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={ad.advertiser}
          loading="lazy"
          decoding="async"
          className="mx-auto h-full object-contain px-6 py-2"
          onError={() => {
            if (ad.fallbackUrl && src !== ad.fallbackUrl) {
              setSrc(ad.fallbackUrl);
            } else {
              setFailed(true);
            }
          }}
        />
      )}
      <span className="absolute right-2 top-1.5 rounded bg-black/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/80">
        Publicidade
      </span>
    </div>
  );

  return ad.targetUrl ? (
    <a
      href={ad.targetUrl}
      target="_blank"
      rel="noopener sponsored"
      className="col-span-2"
    >
      {banner}
    </a>
  ) : (
    banner
  );
}
