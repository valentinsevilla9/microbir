"use client";

import React, { useEffect, useRef, useState } from "react";

import { formatearTiempo } from "@/lib/utils";
import { usePomodoro, type Fase } from "./PomodoroProvider";

const LABELS: Record<Fase, string> = {
  trabajo: "Focus",
  descanso_corto: "Descanso",
  descanso_largo: "Largo",
};

// Clases completas y literales: Tailwind no genera clases construidas con replace()
const TEXTO: Record<Fase, string> = {
  trabajo: "text-primary",
  descanso_corto: "text-green-400",
  descanso_largo: "text-emerald-400",
};

const BOTON_ACTIVO: Record<Fase, string> = {
  trabajo: "bg-primary/10 text-primary",
  descanso_corto: "bg-green-400/10 text-green-400",
  descanso_largo: "bg-emerald-400/10 text-emerald-400",
};

const BARRA: Record<Fase, string> = {
  trabajo: "bg-primary",
  descanso_corto: "bg-green-400",
  descanso_largo: "bg-emerald-400",
};

const ANCHO = 240;
const ALTO = 190;

function encajar(x: number, y: number) {
  return {
    x: Math.min(Math.max(0, x), Math.max(0, window.innerWidth - ANCHO)),
    y: Math.min(Math.max(0, y), Math.max(0, window.innerHeight - ALTO)),
  };
}

export default function FloatingPomodoro() {
  const {
    fase, segundos, corriendo, sesionesHoy, isVisible, toggleVisibility,
    toggleTimer, resetTimer, setFase, duraciones,
  } = usePomodoro();

  // null = posición por defecto (abajo a la derecha, por CSS) hasta que se arrastra
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const arrastre = useRef<{ dx: number; dy: number } | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Si se redimensiona la ventana, que no se quede fuera
  useEffect(() => {
    const alRedimensionar = () => setPosition((p) => (p ? encajar(p.x, p.y) : p));
    window.addEventListener("resize", alRedimensionar);
    return () => window.removeEventListener("resize", alRedimensionar);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Sólo se arrastra desde la cabecera, y no desde sus botones
    if (!target.closest(".drag-handle") || target.closest("button")) return;
    const rect = widgetRef.current?.getBoundingClientRect();
    if (!rect) return;
    arrastre.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastre.current) return;
    setPosition(encajar(e.clientX - arrastre.current.dx, e.clientY - arrastre.current.dy));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastre.current) return;
    arrastre.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  if (!isVisible) return null;

  const progress = (segundos / duraciones[fase]) * 100;

  return (
    <div
      ref={widgetRef}
      role="dialog"
      aria-label="Pomodoro"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={position ? { left: position.x, top: position.y, touchAction: "none" } : { touchAction: "none" }}
      className={`fixed z-50 w-60 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col animate-fade-in-up ${
        position ? "" : "bottom-24 right-4"
      }`}
    >
      {/* HEADER ARRASTRABLE */}
      <div className="drag-handle flex items-center justify-between bg-muted/50 px-3 py-2 cursor-grab active:cursor-grabbing border-b border-border">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Pomodoro</span>
          {sesionesHoy > 0 && (
            <span className="text-[10px] text-muted-foreground" title="Pomodoros completados hoy">
              · {sesionesHoy} hoy
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={toggleVisibility}
          aria-label="Ocultar Pomodoro (sigue contando)"
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* CONTENIDO */}
      <div className="p-4 flex flex-col items-center">
        {/* Selector de fase */}
        <div className="flex w-full rounded-lg bg-muted p-1 mb-4" role="group" aria-label="Duración">
          {(["trabajo", "descanso_corto", "descanso_largo"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFase(f)}
              aria-pressed={fase === f}
              className={`flex-1 rounded-md text-[10px] font-medium py-1 transition-colors ${fase === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              {duraciones[f] / 60}m
            </button>
          ))}
        </div>

        {/* Display del reloj */}
        <div className={`text-4xl font-black font-mono tracking-tighter ${TEXTO[fase]}`} aria-live="off">
          {formatearTiempo(segundos)}
        </div>
        <div className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${TEXTO[fase]}`}>
          {LABELS[fase]}
        </div>

        {/* Controles */}
        <div className="flex items-center gap-3 mt-4 w-full">
          <button
            type="button"
            onClick={resetTimer}
            aria-label="Reiniciar"
            className="flex-1 flex items-center justify-center p-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
            </svg>
          </button>

          <button
            type="button"
            onClick={toggleTimer}
            aria-label={corriendo ? "Pausar" : "Empezar"}
            className={`flex-[2] flex items-center justify-center p-2 rounded-lg font-bold transition-colors border ${corriendo ? "bg-background hover:bg-muted border-border text-foreground" : `${BOTON_ACTIVO[fase]} border-transparent`}`}
          >
            {corriendo ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            )}
          </button>
        </div>

        {/* Barra de progreso */}
        <div className="w-full h-1 bg-muted mt-4 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-linear ${BARRA[fase]}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
