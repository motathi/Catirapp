"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function Icon({ name }: { name: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "inicio":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
        </svg>
      );
    case "buscar":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
      );
    case "descobrir":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M13 2 4.5 14H11l-1.5 8L18 10h-6.5L13 2z" />
        </svg>
      );
    case "garagem":
      return (
        <svg {...common}>
          <path d="M3 21V9l9-5 9 5v12" />
          <path d="M7 21v-8h10v8" />
          <path d="M7 17h10" />
        </svg>
      );
    case "perfil":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      );
    default:
      return null;
  }
}

const items = [
  { href: "/", icon: "inicio", label: "Início" },
  { href: "/buscar", icon: "buscar", label: "Buscar" },
  { href: "/feed", icon: "descobrir", label: "Descobrir", featured: true },
  { href: "/perfil#garagem", icon: "garagem", label: "Garagem" },
  { href: "/perfil", icon: "perfil", label: "Perfil" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 mx-auto grid max-w-md grid-cols-5 border-t border-line bg-card/95 pt-1.5 backdrop-blur"
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
    >
      {items.map((item) => {
        const base = item.href.split("#")[0];
        const active =
          base === "/" ? pathname === "/" : pathname.startsWith(base);
        const highlight = active && item.label !== "Garagem";

        if (item.featured) {
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center gap-0.5 text-[10px] font-semibold"
            >
              <span
                className={`-mt-6 flex h-12 w-12 items-center justify-center rounded-full border-4 border-surface shadow-lg transition ${
                  highlight
                    ? "bg-emerald-400 text-emerald-950"
                    : "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                }`}
              >
                <Icon name={item.icon} />
              </span>
              <span
                className={
                  highlight
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-mute"
                }
              >
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-0.5 text-[10px] transition ${
              highlight
                ? "font-semibold text-emerald-600 dark:text-emerald-400"
                : "text-mute hover:text-ink"
            }`}
          >
            <Icon name={item.icon} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
