"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Fase = "trabajo" | "descanso_corto" | "descanso_largo";

const DURACIONES: Record<Fase, number> = {
  trabajo: 25 * 60,
  descanso_corto: 5 * 60,
  descanso_largo: 15 * 60,
};

const LABELS: Record<Fase, string> = {
  trabajo: "Trabajo",
  descanso_corto: "Descanso",
  descanso_largo: "Descanso largo",
};

const COLORES: Record<Fase, { ring: string; text: string; bg: string }> = {
  trabajo: { ring: "stroke-primary", text: "text-primary", bg: "bg-primary/10" },
  descanso_corto: { ring: "stroke-green-400", text: "text-green-400", bg: "bg-green-400/10" },
  descanso_largo: { ring: "stroke-emerald-400", text: "text-emerald-400", bg: "bg-emerald-400/10" },
};

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function PomodoroClient() {
  const [fase, setFase] = useState<Fase>("trabajo");
  const [segundos, setSegundos] = useState(DURACIONES.trabajo);
  const [corriendo, setCorriendo] = useState(false);
  const [sesionesHoy, setSesionesHoy] = useState(0);
  const [configurando, setConfigurando] = useState(false);
  const [duracionPersonalizada, setDuracionPersonalizada] = useState({
    trabajo: 25,
    descanso_corto: 5,
    descanso_largo: 15,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const duraciones = useRef({ ...DURACIONES });

  const siguienteFase = useCallback(() => {
    setCorriendo(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    setFase((prev) => {
      let next: Fase;
      if (prev === "trabajo") {
        setSesionesHoy((n) => {
          const nuevas = n + 1;
          next = nuevas % 4 === 0 ? "descanso_largo" : "descanso_corto";
          setSegundos(duraciones.current[next]);
          return nuevas;
        });
        return next!;
      }
      next = "trabajo";
      setSegundos(duraciones.current["trabajo"]);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!corriendo) return;
    intervalRef.current = setInterval(() => {
      setSegundos((prev) => {
        if (prev <= 1) {
          // Notificación del navegador
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("BIR Prep — ¡Tiempo!", {
              body: fase === "trabajo" ? "¡Descanso!" : "¡Vuelta al trabajo!",
            });
          }
          siguienteFase();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [corriendo, fase, siguienteFase]);

  const toggleCorrer = () => {
    if (!corriendo && typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    setCorriendo((v) => !v);
  };

  const reiniciar = () => {
    setCorriendo(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSegundos(duraciones.current[fase]);
  };

  const aplicarConfiguracion = () => {
    duraciones.current = {
      trabajo: duracionPersonalizada.trabajo * 60,
      descanso_corto: duracionPersonalizada.descanso_corto * 60,
      descanso_largo: duracionPersonalizada.descanso_largo * 60,
    };
    setSegundos(duraciones.current[fase]);
    setCorriendo(false);
    setConfigurando(false);
  };

  const total = duraciones.current[fase];
  const progreso = 1 - segundos / total;
  const radio = 90;
  const circunf = 2 * Math.PI * radio;
  const dashoffset = circunf * (1 - progreso);
  const col = COLORES[fase];

  return (
    <div className="flex flex-col items-center gap-8 py-6 animate-fade-in-up">

      {/* Selector de fase */}
      <div className="flex gap-2 rounded-2xl border border-border bg-card p-1.5">
        {(["trabajo", "descanso_corto", "descanso_largo"] as Fase[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              if (corriendo) return;
              setFase(f);
              setSegundos(duraciones.current[f]);
            }}
            className={[
              "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150",
              fase === f
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {LABELS[f]}
          </button>
        ))}
      </div>

      {/* Círculo del timer */}
      <div className="relative flex items-center justify-center">
        <svg width="220" height="220" className="-rotate-90">
          {/* Pista */}
          <circle
            cx="110" cy="110" r={radio}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="10"
          />
          {/* Progreso */}
          <circle
            cx="110" cy="110" r={radio}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circunf}
            strokeDashoffset={dashoffset}
            className={`${col.ring} transition-all duration-1000 ease-linear`}
          />
        </svg>

        <div className="absolute flex flex-col items-center">
          <span className={`text-5xl font-bold font-mono tracking-tight ${col.text}`}>
            {formatTime(segundos)}
          </span>
          <span className="mt-1 text-xs font-medium text-muted-foreground uppercase tracking-widest">
            {LABELS[fase]}
          </span>
          {sesionesHoy > 0 && (
            <span className="mt-2 text-xs text-muted-foreground">
              🍅 {sesionesHoy} hoy
            </span>
          )}
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reiniciar}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-all hover:bg-accent"
          aria-label="Reiniciar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>

        <button
          type="button"
          onClick={toggleCorrer}
          id="btn-pomodoro-toggle"
          className={[
            "flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95",
            col.bg,
            col.text,
            "border-2",
            col.ring.replace("stroke-", "border-"),
          ].join(" ")}
          aria-label={corriendo ? "Pausar" : "Iniciar"}
        >
          {corriendo ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={siguienteFase}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-all hover:bg-accent"
          aria-label="Saltar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
          </svg>
        </button>
      </div>

      {/* Configuración */}
      <button
        type="button"
        onClick={() => setConfigurando((v) => !v)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/>
        </svg>
        Configurar duraciones
      </button>

      {configurando && (
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-4 animate-fade-in-up">
          {[
            { key: "trabajo" as const, label: "Trabajo (min)" },
            { key: "descanso_corto" as const, label: "Descanso corto (min)" },
            { key: "descanso_largo" as const, label: "Descanso largo (min)" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <label className="text-sm font-medium">{label}</label>
              <input
                type="number"
                min={1}
                max={120}
                value={duracionPersonalizada[key]}
                onChange={(e) =>
                  setDuracionPersonalizada((prev) => ({
                    ...prev,
                    [key]: Math.max(1, parseInt(e.target.value) || 1),
                  }))
                }
                className="w-20 rounded-lg border border-border bg-muted px-3 py-2 text-center text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={aplicarConfiguracion}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Aplicar
          </button>
        </div>
      )}

      {/* Explicación */}
      <div className="w-full max-w-sm rounded-xl border border-border bg-card/50 px-5 py-4 text-xs text-muted-foreground space-y-1">
        <p>🍅 Sesiones de trabajo: <span className="font-medium">25 min</span></p>
        <p>☕ Descanso corto: <span className="font-medium">5 min</span> (cada pomodoro)</p>
        <p>🛋️ Descanso largo: <span className="font-medium">15 min</span> (cada 4 pomodoros)</p>
      </div>
    </div>
  );
}
