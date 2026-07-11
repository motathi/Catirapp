"use client";

import { useState } from "react";

// Imagem de banner de publicidade com autocorreção: começa pela cópia
// versionada no repositório (`/ads/*`) e, se ela falhar ao carregar, tenta o
// fallback (bucket de storage). Garante que o banner nunca fique quebrado
// enquanto a imagem existir em pelo menos uma das fontes.
export default function AdImage({
  src,
  fallbackSrc,
  alt,
  className,
}: {
  src: string;
  fallbackSrc?: string | null;
  alt: string;
  className?: string;
}) {
  const [current, setCurrent] = useState(src);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      className={className}
      onError={() => {
        if (fallbackSrc && current !== fallbackSrc) setCurrent(fallbackSrc);
      }}
    />
  );
}
