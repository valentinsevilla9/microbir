"use client";

import { useState, useTransition } from "react";
import { desbloquearHito, bloquearHito, guardarNota, inicializarHitos } from "@/lib/actions/pareja";

interface Hito {
  id: number;
  titulo: string;
  descripcion: string | null;
  emoji: string;
  desbloqueado: boolean;
  fecha_desbloqueo: string | null;
}

interface Stats {
  rachaActual: number;
  rachaMaxima: number;
  totalSesiones: number;
  totalFlashcards: number;
  mediaAciertos: number | null;
}

interface Props {
  hitos: Hito[];
  notaInicial: string;
  stats: Stats;
  sinHitos: boolean;
}

export default function ParejaClient({ hitos, notaInicial, stats, sinHitos }: Props) {
  const [nota, setNota] = useState(notaInicial);
  const [notaGuardada, setNotaGuardada] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDesbloquear = (id: number, desbloqueado: boolean) => {
    startTransition(async () => {
      if (desbloqueado) {
        await bloquearHito(id);
      } else {
        await desbloquearHito(id);
      }
    });
  };

  const handleGuardarNota = () => {
    startTransition(async () => {
      await guardarNota(nota);
      setNotaGuardada(true);
      setTimeout(() => setNotaGuardada(false), 2000);
    });
  };

  const handleInicializar = () => {
    startTransition(async () => {
      await inicializarHitos();
    });
  };

  const desbloquead = hitos.filter((h) => h.desbloqueado).length;
  const porcentaje = hitos.length > 0 ? Math.round((desbloquead / hitos.length) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* STATS RÁPIDAS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Racha actual" valor={`${stats.rachaActual}🔥`} />
        <MiniStat label="Racha máxima" valor={`${stats.rachaMaxima} días`} />
        <MiniStat label="Tests hechos" valor={String(stats.totalSesiones)} />
        <MiniStat
          label="Media aciertos"
          valor={stats.mediaAciertos !== null ? `${stats.mediaAciertos}%` : "—"}
        />
      </div>

      {/* NOTA DE ÁNIMO */}
      <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">💌</span>
          <h2 className="font-semibold">Tu nota para ella</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Escribe un mensaje de ánimo que verá cuando abra esta página.
        </p>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={4}
          placeholder="Eres la persona más increíble que conozco. Cada día que estudias me llena de orgullo. ¡Tú puedes! 💙"
          className="w-full resize-none rounded-xl border border-border bg-muted px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/40"
        />
        <button
          type="button"
          onClick={handleGuardarNota}
          disabled={isPending}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {notaGuardada ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Guardada
            </>
          ) : (
            "Guardar nota"
          )}
        </button>
      </section>

      {/* HITOS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Hitos desbloqueados</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {desbloquead} de {hitos.length} conseguidos · {porcentaje}%
            </p>
          </div>
          {sinHitos && (
            <button
              type="button"
              onClick={handleInicializar}
              disabled={isPending}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-all"
            >
              Inicializar hitos
            </button>
          )}
        </div>

        {/* Barra progreso */}
        {hitos.length > 0 && (
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        )}

        {hitos.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card/50 p-8 text-center">
            <p className="text-muted-foreground text-sm">
              No hay hitos todavía. Pulsa «Inicializar hitos» para crear los predeterminados.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {hitos.map((hito) => (
              <button
                key={hito.id}
                type="button"
                onClick={() => handleDesbloquear(hito.id, hito.desbloqueado)}
                disabled={isPending}
                className={[
                  "flex items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-150 disabled:opacity-60",
                  hito.desbloqueado
                    ? "border-primary/30 bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/20 hover:bg-accent",
                ].join(" ")}
              >
                <span className="text-2xl">{hito.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${hito.desbloqueado ? "text-primary" : "text-foreground"}`}>
                    {hito.titulo}
                  </p>
                  {hito.descripcion && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{hito.descripcion}</p>
                  )}
                  {hito.desbloqueado && hito.fecha_desbloqueo && (
                    <p className="mt-1 text-[10px] text-primary/70">
                      ✓ {new Date(hito.fecha_desbloqueo).toLocaleDateString("es-ES", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  )}
                </div>
                <span className={`shrink-0 mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  hito.desbloqueado ? "border-primary bg-primary" : "border-border"
                }`}>
                  {hito.desbloqueado && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MiniStat({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xl font-bold">{valor}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
