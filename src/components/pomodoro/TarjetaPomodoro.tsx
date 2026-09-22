"use client";

import { formatearTiempo } from "@/lib/utils";
import { usePomodoro } from "./PomodoroProvider";

/** Tarjeta del dashboard: abre el widget flotante (ya no hay página /pomodoro). */
export default function TarjetaPomodoro({ className }: { className: string }) {
  const { abrir, corriendo, segundos, sesionesHoy } = usePomodoro();

  return (
    <button type="button" onClick={abrir} className={`${className} text-left`}>
      <div className="mb-3 inline-flex rounded-xl p-2.5 bg-orange-400/10">
        <span className="text-orange-400">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </span>
      </div>
      <h3 className="font-semibold">Pomodoro</h3>
      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
        {corriendo
          ? `En marcha: ${formatearTiempo(segundos)} restantes.`
          : sesionesHoy > 0
          ? `${sesionesHoy} pomodoro${sesionesHoy !== 1 ? "s" : ""} hoy. ¿Otro?`
          : "Timer 25/5 para sesiones de estudio efectivo."}
      </p>
      <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Abrir
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
    </button>
  );
}
