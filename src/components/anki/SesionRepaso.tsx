"use client";

import { useState, useTransition } from "react";
import { revisarFlashcard, eliminarFlashcard } from "@/lib/actions/flashcards";

interface Flashcard {
  id: number;
  frente: string;
  dorso: string;
  asignatura: string;
  intervalo: number;
  repeticiones: number;
}

interface Props {
  tarjetas: Flashcard[];
  onTerminado: () => void;
}

const BOTONES_CALIDAD = [
  { calidad: 0, label: "Nada", color: "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20" },
  { calidad: 2, label: "Difícil", color: "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20" },
  { calidad: 3, label: "Bien", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20" },
  { calidad: 5, label: "Fácil", color: "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20" },
];

export default function SesionRepaso({ tarjetas, onTerminado }: Props) {
  const [indice, setIndice] = useState(0);
  const [revelada, setRevelada] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (tarjetas.length === 0 || indice >= tarjetas.length) {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center animate-fade-in-up">
        <div className="inline-flex rounded-2xl bg-green-500/10 p-5">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-green-400" strokeWidth="1.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold">¡Sesión completada!</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Has repasado {tarjetas.length} tarjeta{tarjetas.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <button
          type="button"
          onClick={onTerminado}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Volver
        </button>
      </div>
    );
  }

  const tarjeta = tarjetas[indice];
  const progreso = ((indice) / tarjetas.length) * 100;

  const responder = (calidad: number) => {
    startTransition(async () => {
      try {
        await revisarFlashcard({ id: tarjeta.id, calidad });
      } catch { /* silencioso */ }
      setRevelada(false);
      setIndice((i) => i + 1);
    });
  };

  const borrar = () => {
    startTransition(async () => {
      try {
        await eliminarFlashcard(tarjeta.id);
      } catch { /* silencioso */ }
      setRevelada(false);
      setIndice((i) => i + 1);
    });
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 animate-fade-in-up">
      {/* Progreso */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{indice + 1} / {tarjetas.length}</span>
          <span>{tarjeta.asignatura}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>

      {/* Tarjeta con efecto flip */}
      <div
        className="relative cursor-pointer"
        style={{ perspective: "1200px" }}
        onClick={() => !revelada && setRevelada(true)}
      >
        <div
          className="relative transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: revelada ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: "220px",
          }}
        >
          {/* Frente */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
              Pregunta
            </p>
            <p className="text-lg font-semibold leading-7">{tarjeta.frente}</p>
            {!revelada && (
              <p className="mt-6 text-xs text-muted-foreground">
                Toca para ver la respuesta
              </p>
            )}
          </div>

          {/* Dorso */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-primary/30 bg-card p-8 text-center"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <p className="text-xs font-medium uppercase tracking-widest text-primary mb-4">
              Respuesta
            </p>
            <p className="text-base leading-7 text-foreground">{tarjeta.dorso}</p>
          </div>
        </div>
      </div>

      {/* Botones de calidad */}
      {revelada && (
        <div className="space-y-3 animate-fade-in-up">
          <p className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
            ¿Cómo lo recordaste?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {BOTONES_CALIDAD.map(({ calidad, label, color }) => (
              <button
                key={calidad}
                type="button"
                onClick={() => responder(calidad)}
                disabled={isPending}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all disabled:opacity-50 ${color}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={borrar}
            disabled={isPending}
            className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors py-1"
          >
            Eliminar esta tarjeta
          </button>
        </div>
      )}
    </div>
  );
}
