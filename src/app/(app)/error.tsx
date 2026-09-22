"use client"; // Los error boundaries tienen que ser Client Components

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-10 text-center animate-fade-in-up">
      <div className="mx-auto mb-4 inline-flex rounded-2xl bg-destructive/10 p-4 text-destructive">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h1 className="text-xl font-semibold">Algo ha fallado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        No hemos podido cargar esta pantalla. Si estabas haciendo un test, tus respuestas siguen
        guardadas en este dispositivo.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-muted-foreground/60">Ref: {error.digest}</p>
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Reintentar
        </button>
        <Link
          href="/dashboard"
          className="rounded-xl border border-border px-5 py-3 text-sm font-medium hover:bg-accent"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
