"use client";

import React, { createContext, useContext, useEffect, useEffectEvent, useState } from "react";

import { usePersistentState } from "@/lib/hooks/usePersistentState";
import { hoyMadrid } from "@/lib/utils";

export type Fase = "trabajo" | "descanso_corto" | "descanso_largo";

interface PomodoroContextType {
  fase: Fase;
  segundos: number;
  corriendo: boolean;
  sesionesHoy: number;
  isVisible: boolean;
  toggleTimer: () => void;
  resetTimer: () => void;
  setFase: (f: Fase) => void;
  toggleVisibility: () => void;
  abrir: () => void;
  duraciones: Record<Fase, number>;
}

const DURACIONES: Record<Fase, number> = {
  trabajo: 25 * 60,
  descanso_corto: 5 * 60,
  descanso_largo: 15 * 60,
};

/*
 * El temporizador guarda la HORA DE FIN, no los segundos que quedan: así no
 * se desfasa aunque el navegador ralentice los intervalos en segundo plano,
 * y sobrevive a recargas de página (se guarda en localStorage).
 */
interface EstadoTimer {
  fase: Fase;
  /** Marca de tiempo (ms) en la que termina; null si está en pausa. */
  finAt: number | null;
  /** Segundos que quedan cuando está en pausa. */
  restante: number;
  /** Pomodoros de trabajo completados en el ciclo (para el descanso largo). */
  ciclos: number;
}

const TIMER_INICIAL: EstadoTimer = {
  fase: "trabajo",
  finAt: null,
  restante: DURACIONES.trabajo,
  ciclos: 0,
};

const SESIONES_INICIAL = { fecha: "", n: 0 };

const PomodoroContext = createContext<PomodoroContextType | null>(null);

function pedirPermisoNotificaciones() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

async function notificar(titulo: string, cuerpo: string) {
  // En Safari de iPhone (fuera de la PWA) `Notification` no existe
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const opciones = { body: cuerpo, icon: "/icons/icon-192x192.png" };
  try {
    // En Android `new Notification()` lanza: hay que usar el service worker
    const registro = await navigator.serviceWorker?.getRegistration();
    if (registro) {
      await registro.showNotification(titulo, opciones);
    } else {
      new Notification(titulo, opciones);
    }
  } catch {
    // Sin notificación: queda el pitido
  }
}

function pitido() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const ganancia = ctx.createGain();
    osc.frequency.value = 880;
    ganancia.gain.setValueAtTime(0.2, ctx.currentTime);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    osc.connect(ganancia).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
    osc.onended = () => void ctx.close();
  } catch {
    // Audio no disponible
  }
}

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [timer, setTimer] = usePersistentState("bir-pomodoro", TIMER_INICIAL);
  const [sesiones, setSesiones] = usePersistentState("bir-pomodoro-sesiones", SESIONES_INICIAL);
  const [isVisible, setIsVisible] = usePersistentState("bir-pomodoro-visible", false);
  const [ahora, setAhora] = useState<number | null>(null);

  const corriendo = timer.finAt !== null;
  const segundos =
    timer.finAt !== null && ahora !== null
      ? Math.max(0, Math.ceil((timer.finAt - ahora) / 1000))
      : timer.restante;

  const completar = useEffectEvent(() => {
    const terminada = timer.fase;
    const ciclos = terminada === "trabajo" ? timer.ciclos + 1 : timer.ciclos;
    const siguiente: Fase =
      terminada === "trabajo"
        ? ciclos % 4 === 0
          ? "descanso_largo"
          : "descanso_corto"
        : "trabajo";

    setTimer({ fase: siguiente, finAt: null, restante: DURACIONES[siguiente], ciclos });

    if (terminada === "trabajo") {
      const hoy = hoyMadrid();
      setSesiones((prev) => ({ fecha: hoy, n: prev.fecha === hoy ? prev.n + 1 : 1 }));
      void notificar("¡Pomodoro terminado!", "Es hora de descansar.");
    } else {
      void notificar("Descanso terminado", "¿Otro pomodoro?");
    }
    pitido();
  });

  const tick = useEffectEvent(() => {
    if (timer.finAt === null) return;
    const now = Date.now();
    if (now >= timer.finAt) completar();
    else setAhora(now);
  });

  useEffect(() => {
    if (timer.finAt === null) return;
    const primero = setTimeout(tick, 0);
    const id = setInterval(tick, 500);
    return () => {
      clearTimeout(primero);
      clearInterval(id);
    };
  }, [timer.finAt]);

  const toggleTimer = () => {
    if (timer.finAt !== null) {
      const restante = Math.max(0, Math.ceil((timer.finAt - Date.now()) / 1000));
      setTimer({ ...timer, finAt: null, restante });
    } else {
      pedirPermisoNotificaciones(); // desde un clic: Safari lo exige
      const restante = timer.restante > 0 ? timer.restante : DURACIONES[timer.fase];
      setTimer({ ...timer, finAt: Date.now() + restante * 1000, restante });
    }
  };

  const resetTimer = () => {
    setTimer({ ...timer, finAt: null, restante: DURACIONES[timer.fase] });
  };

  const setFase = (nuevaFase: Fase) => {
    setTimer({ ...timer, fase: nuevaFase, finAt: null, restante: DURACIONES[nuevaFase] });
  };

  const sesionesHoy = sesiones.fecha === hoyMadrid() ? sesiones.n : 0;

  return (
    <PomodoroContext.Provider
      value={{
        fase: timer.fase,
        segundos,
        corriendo,
        sesionesHoy,
        isVisible,
        toggleTimer,
        resetTimer,
        setFase,
        toggleVisibility: () => setIsVisible((v) => !v),
        abrir: () => setIsVisible(true),
        duraciones: DURACIONES,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoro debe usarse dentro de un PomodoroProvider");
  return ctx;
}
