"use client";

import { useState, useTransition } from "react";

import { resolverFallo } from "@/lib/actions/fallos";

export default function BotonResolverFallo({ preguntaId }: { preguntaId: number }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          setError(false);
          try {
            await resolverFallo(preguntaId);
          } catch {
            setError(true);
          }
        })
      }
      title="La pregunta sale de la caja, pero sigue contando en tus estadísticas"
      className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        error
          ? "border-destructive/40 text-destructive"
          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {isPending ? "Quitando..." : error ? "Reintentar" : "Ya la domino"}
    </button>
  );
}
