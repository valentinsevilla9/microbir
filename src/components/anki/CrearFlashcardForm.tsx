"use client";

import { useState, useTransition } from "react";
import { crearFlashcard } from "@/lib/actions/flashcards";

const ASIGNATURAS = [
  "Biología celular",
  "Biología molecular",
  "Genética",
  "Bioquímica",
  "Microbiología",
  "Parasitología",
  "Inmunología",
  "Fisiología",
  "Histología",
  "Ecología",
  "Estadística",
  "Anatomía",
  "General",
];

interface Props {
  onCreada: () => void;
}

export default function CrearFlashcardForm({ onCreada }: Props) {
  const [frente, setFrente] = useState("");
  const [dorso, setDorso] = useState("");
  const [asignatura, setAsignatura] = useState("General");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await crearFlashcard({ frente, dorso, asignatura });
        setFrente("");
        setDorso("");
        onCreada();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al crear la tarjeta.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-base font-semibold">Nueva tarjeta</h2>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Frente (pregunta)
        </label>
        <textarea
          value={frente}
          onChange={(e) => setFrente(e.target.value)}
          required
          rows={2}
          placeholder="¿Qué enzima cataliza la síntesis de ATP?"
          className="w-full resize-none rounded-xl border border-border bg-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Dorso (respuesta)
        </label>
        <textarea
          value={dorso}
          onChange={(e) => setDorso(e.target.value)}
          required
          rows={3}
          placeholder="ATP sintasa (complejo V de la cadena de transporte electrónico)..."
          className="w-full resize-none rounded-xl border border-border bg-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Asignatura
        </label>
        <select
          value={asignatura}
          onChange={(e) => setAsignatura(e.target.value)}
          className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {ASIGNATURAS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || !frente.trim() || !dorso.trim()}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Guardando..." : "Crear tarjeta"}
      </button>
    </form>
  );
}
