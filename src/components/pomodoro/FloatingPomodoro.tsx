"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePomodoro, Fase } from "./PomodoroProvider";

const LABELS: Record<Fase, string> = {
  trabajo: "Focus",
  descanso_corto: "Descanso",
  descanso_largo: "Largo",
};

const COLORES: Record<Fase, string> = {
  trabajo: "text-primary border-primary",
  descanso_corto: "text-green-400 border-green-400",
  descanso_largo: "text-emerald-400 border-emerald-400",
};

const BG_COLORES: Record<Fase, string> = {
  trabajo: "bg-primary/10",
  descanso_corto: "bg-green-400/10",
  descanso_largo: "bg-emerald-400/10",
};

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function FloatingPomodoro() {
  const { 
    fase, segundos, corriendo, isVisible, toggleVisibility, 
    toggleTimer, resetTimer, setFase, duraciones 
  } = usePomodoro();

  // Estados para el sistema de arrastre (drag) manual
  const [position, setPosition] = useState({ x: window.innerWidth - 300, y: window.innerHeight - 250 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Posicin inicial segura abajo a la derecha
    setPosition({ x: window.innerWidth - 260, y: window.innerHeight - 200 });
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Solo arrastrar desde la cabecera (header)
    const target = e.target as HTMLElement;
    if (!target.closest('.drag-handle')) return;
    
    setIsDragging(true);
    if (widgetRef.current) {
      const rect = widgetRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    // Prevenir salirse de la pantalla
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;
    
    // Limitar bounds
    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;
    if (newX + 240 > window.innerWidth) newX = window.innerWidth - 240;
    if (newY + 160 > window.innerHeight) newY = window.innerHeight - 160;

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    const target = e.target as HTMLElement;
    target.releasePointerCapture(e.pointerId);
  };

  if (!isVisible) return null;

  const progress = (segundos / duraciones[fase]) * 100;

  return (
    <div
      ref={widgetRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ left: position.x, top: position.y, touchAction: 'none' }}
      className="fixed z-50 w-60 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col animate-fade-in-up"
    >
      {/* HEADER ARRASTRABLE */}
      <div className="drag-handle flex items-center justify-between bg-muted/50 px-3 py-2 cursor-grab active:cursor-grabbing border-b border-border">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Pomodoro</span>
        </div>
        <button onClick={toggleVisibility} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* CONTENIDO */}
      <div className="p-4 flex flex-col items-center">
        {/* Selector de fase */}
        <div className="flex w-full rounded-lg bg-muted p-1 mb-4">
          <button
            onClick={() => setFase("trabajo")}
            className={`flex-1 rounded-md text-[10px] font-medium py-1 transition-colors ${fase === "trabajo" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            25m
          </button>
          <button
            onClick={() => setFase("descanso_corto")}
            className={`flex-1 rounded-md text-[10px] font-medium py-1 transition-colors ${fase === "descanso_corto" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            5m
          </button>
          <button
            onClick={() => setFase("descanso_largo")}
            className={`flex-1 rounded-md text-[10px] font-medium py-1 transition-colors ${fase === "descanso_largo" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            15m
          </button>
        </div>

        {/* Display del reloj */}
        <div className={`text-4xl font-black font-mono tracking-tighter ${COLORES[fase].split(' ')[0]}`}>
          {formatTime(segundos)}
        </div>
        <div className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${COLORES[fase].split(' ')[0]}`}>
          {LABELS[fase]}
        </div>

        {/* Controles */}
        <div className="flex items-center gap-3 mt-4 w-full">
          <button
            onClick={resetTimer}
            className="flex-1 flex items-center justify-center p-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
            </svg>
          </button>
          
          <button
            onClick={toggleTimer}
            className={`flex-[2] flex items-center justify-center p-2 rounded-lg font-bold transition-colors border ${corriendo ? 'bg-background hover:bg-muted border-border text-foreground' : `${BG_COLORES[fase]} ${COLORES[fase]} border-transparent`}`}
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
            className={`h-full transition-all duration-1000 ease-linear ${BG_COLORES[fase].replace('/10', '')} ${COLORES[fase].split(' ')[0].replace('text-', 'bg-')}`} 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>
    </div>
  );
}
