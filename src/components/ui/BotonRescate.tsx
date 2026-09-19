"use client";

import { useState } from "react";

const MENSAJES = [
  "Cada pregunta que practicas hoy es un paso más cerca del número uno. 💪",
  "El BIR no se gana en un día, pero se gana un día a la vez. Tú puedes. 🌟",
  "¿Sabes qué separa a la opositora que aprueba de la que no? La constancia. La tuya es increíble. 🔥",
  "Hoy puede ser un día duro. Está bien. Mañana vuelves con más fuerza. 💙",
  "Cada error que cometes ahora es un punto que no perderás el día del examen. ¡Sigue fallando en el simulacro!",
  "Recuerda por qué empezaste. Esa razón sigue siendo válida. 🎯",
  "Eres más capaz de lo que crees. El camino es largo, pero tú ya llevas mucho recorrido. ✨",
  "Un simulacro más. Una flashcard más. Una racha más. Todo suma. 🏆",
  "La fatiga es temporal. La satisfacción del aprobado, para siempre. ❤️",
  "No compares tu capítulo 1 con el capítulo 20 de nadie. Tu ritmo es válido. 🌈",
];

export default function BotonRescate() {
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const abrir = () => {
    const idx = Math.floor(Math.random() * MENSAJES.length);
    setMensaje(MENSAJES[idx]);
    setAbierto(true);
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        type="button"
        onClick={abrir}
        id="btn-rescate"
        aria-label="Botón de Rescate"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30 text-primary-foreground transition-all hover:scale-110 hover:shadow-primary/50 active:scale-95 glow-primary"
        title="¡Necesito un rescate!"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>

      {/* Modal de mensaje */}
      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setAbierto(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Tarjeta */}
          <div
            className="relative mx-auto w-full max-w-sm animate-fade-in-up rounded-3xl border border-primary/20 bg-card p-8 text-center shadow-2xl shadow-primary/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 text-4xl">💙</div>
            <p className="text-base font-medium leading-7 text-foreground">
              {mensaje}
            </p>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              ¡Gracias, sigo estudiando!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
