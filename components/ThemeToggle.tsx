"use client";

import { useEffect, useState } from "react";

// Alterna fundo claro/escuro; a escolha persiste em localStorage e é
// aplicada antes da pintura pelo script inline no layout.
export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("catirapp-theme", next ? "dark" : "light");
    setDark(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Alternar entre fundo claro e escuro"
      title="Fundo claro/escuro"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-base transition hover:bg-card-2"
    >
      {dark === null ? "◐" : dark ? "☀️" : "🌙"}
    </button>
  );
}
