"use client";

import { formatearTiempo } from "@/lib/utils";
import { usePomodoro } from "./PomodoroProvider";

/** Entrada de navegación que abre/oculta el widget y muestra el tiempo si corre. */
export default function BotonPomodoroNav({ onClick }: { onClick?: () => void }) {
  const { toggleVisibility, isVisible, corriendo, segundos } = usePomodoro();

  return (
    <button
      type="button"
      onClick={() => {
        toggleVisibility();
        onClick?.();
      }}
      aria-pressed={isVisible}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
    >
      <span className="text-muted-foreground">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </span>
      Pomodoro
      {corriendo && (
        <span className="ml-auto font-mono text-xs text-primary">{formatearTiempo(segundos)}</span>
      )}
    </button>
  );
}
