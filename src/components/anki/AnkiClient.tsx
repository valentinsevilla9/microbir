"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import StatCard from "@/components/ui/StatCard";
import SesionRepaso from "./SesionRepaso";
import CrearFlashcardForm from "./CrearFlashcardForm";

interface Flashcard {
  id: number;
  frente: string;
  dorso: string;
  asignatura: string;
  intervalo: number;
  repeticiones: number;
}

type Vista = "menu" | "repaso" | "crear";

interface Props {
  pendientes: Flashcard[];
  totalPendientes: number;
  totalTarjetas: number;
}

export default function AnkiClient({ pendientes, totalPendientes, totalTarjetas }: Props) {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>("menu");

  const volverAlMenu = () => {
    setVista("menu");
    // Refresca los contadores del servidor sin recargar la página
    // (una recarga completa reiniciaba el Pomodoro en marcha)
    router.refresh();
  };

  if (vista === "repaso") {
    return <SesionRepaso tarjetas={pendientes} onTerminado={volverAlMenu} />;
  }

  if (vista === "crear") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setVista("menu")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Volver
        </button>
        <CrearFlashcardForm onCreada={volverAlMenu} />
      </div>
    );
  }

  // Vista menú
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total en el mazo"
          valor={totalTarjetas}
          color="text-foreground"
          bg="bg-muted/50"
        />
        <StatCard
          label="Para repasar hoy"
          valor={totalPendientes}
          color={totalPendientes > 0 ? "text-primary" : "text-green-400"}
          bg={totalPendientes > 0 ? "bg-primary/10" : "bg-green-400/10"}
        />
        <StatCard
          label="Nuevas (sin repasar)"
          valor={pendientes.filter((p) => p.repeticiones === 0).length}
          sub={totalPendientes > pendientes.length ? `de las ${pendientes.length} de esta sesión` : undefined}
          color="text-violet-400"
          bg="bg-violet-400/10"
        />
      </div>

      {/* Acciones principales */}
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setVista("repaso")}
          disabled={pendientes.length === 0}
          id="btn-iniciar-repaso"
          className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 text-left transition-all hover:border-primary/40 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="inline-flex rounded-xl bg-primary/10 p-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-primary" strokeWidth="1.8">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold">Iniciar repaso</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {pendientes.length === 0
                ? "No tienes tarjetas pendientes hoy 🎉"
                : totalPendientes > pendientes.length
                ? `${pendientes.length} de ${totalPendientes} tarjetas en esta sesión`
                : `${pendientes.length} tarjeta${pendientes.length !== 1 ? "s" : ""} para repasar`}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setVista("crear")}
          id="btn-crear-flashcard"
          className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 text-left transition-all hover:border-primary/40 hover:shadow-md"
        >
          <div className="inline-flex rounded-xl bg-violet-500/10 p-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-violet-400" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold">Crear tarjeta</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Añade nuevas tarjetas a tu mazo personal.
            </p>
          </div>
        </button>
      </div>

      {/* Info SM-2 */}
      {totalTarjetas === 0 && (
        <div className="rounded-xl border border-border bg-card/50 px-5 py-4 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">¿Cómo funciona?</p>
          <p>El algoritmo SM-2 calcula cuándo necesitas repasar cada tarjeta para memorizarla con el mínimo esfuerzo. Cuanto mejor la recuerdes, más tiempo pasa hasta el siguiente repaso.</p>
        </div>
      )}
    </div>
  );
}
