"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Feed" },
  { href: "/buscar", label: "Buscar" },
  { href: "/perfil", label: "Anunciar" },
  { href: "/perfil#garagem", label: "Garagem" },
  { href: "/perfil", label: "Perfil" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto grid max-w-md grid-cols-5 border-t border-zinc-800 bg-zinc-950/95 py-2 text-center text-[11px] text-zinc-400 backdrop-blur">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href.split("#")[0]) &&
              item.label !== "Anunciar" &&
              item.label !== "Garagem";
        return (
          <Link
            key={item.label}
            href={item.href}
            className={active ? "font-semibold text-emerald-400" : ""}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
