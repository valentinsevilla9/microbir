"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";

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
  duraciones: Record<Fase, number>;
}

const defaultDuraciones: Record<Fase, number> = {
  trabajo: 25 * 60,
  descanso_corto: 5 * 60,
  descanso_largo: 15 * 60,
};

const PomodoroContext = createContext<PomodoroContextType | null>(null);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [fase, setFaseState] = useState<Fase>("trabajo");
  const [segundos, setSegundos] = useState(defaultDuraciones.trabajo);
  const [corriendo, setCorriendo] = useState(false);
  const [sesionesHoy, setSesionesHoy] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (corriendo) {
      timerRef.current = setInterval(() => {
        setSegundos((prev) => {
          if (prev <= 1) {
            // Termina el tiempo
            setCorriendo(false);
            if (fase === "trabajo") {
              setSesionesHoy((s) => s + 1);
              // Notificacin de sonido (si se pudiese) o alerta
              if (Notification.permission === "granted") {
                new Notification("Pomodoro terminado! Es hora de descansar.");
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [corriendo, fase]);

  const toggleTimer = () => setCorriendo((p) => !p);
  
  const resetTimer = () => {
    setCorriendo(false);
    setSegundos(defaultDuraciones[fase]);
  };

  const setFase = (nuevaFase: Fase) => {
    setCorriendo(false);
    setFaseState(nuevaFase);
    setSegundos(defaultDuraciones[nuevaFase]);
  };

  const toggleVisibility = () => setIsVisible((v) => !v);

  // Solicitar permisos de notificacin al arrancar el provider
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <PomodoroContext.Provider
      value={{
        fase,
        segundos,
        corriendo,
        sesionesHoy,
        isVisible,
        toggleTimer,
        resetTimer,
        setFase,
        toggleVisibility,
        duraciones: defaultDuraciones,
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
