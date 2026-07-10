"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Início" },
  { href: "/buscar", label: "Buscar" },
  { href: "/feed", label: "Descobrir" },
  { href: "/perfil#garagem", label: "Garagem" },
  { href: "/perfil", label: "Perfil" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto grid max-w-md grid-cols-5 border-t border-line bg-card/95 py-2 text-center text-[11px] text-mute backdrop-blur">
      {items.map((item) => {
        const base = item.href.split("#")[0];
        const active =
          base === "/" ? pathname === "/" : pathname.startsWith(base);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={
              active && item.label !== "Garagem"
                ? "font-semibold text-emerald-600 dark:text-emerald-400"
                : ""
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
