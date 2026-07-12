"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerPlanInterest } from "@/app/planos/actions";

export default function PlanCTA({
  planCode,
  label,
  variant = "primary",
}: {
  planCode: string;
  label: string;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function click() {
    if (pending || done) return;
    setError(null);
    startTransition(async () => {
      const res = await registerPlanInterest(planCode);
      if (res.needsLogin) {
        router.push("/entrar");
        return;
      }
      if (!res.ok) {
        setError(res.error ?? "Tente novamente.");
        return;
      }
      setDone(true);
    });
  }

  const base =
    "w-full rounded-xl py-3 text-sm font-bold transition disabled:opacity-60";
  const styles =
    variant === "primary"
      ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
      : "border border-line bg-card text-ink hover:bg-card-2";

  if (done) {
    return (
      <div className="rounded-xl bg-emerald-500/15 px-4 py-3 text-center text-sm font-semibold text-emerald-700 dark:text-emerald-300">
        ✓ Interesse registrado! Nossa equipe vai falar com você.
      </div>
    );
  }

  return (
    <div>
      <button onClick={click} disabled={pending} className={`${base} ${styles}`}>
        {pending ? "Enviando…" : label}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
