"use client";

import { useState, useRef, useEffect } from "react";
import { processTextToFlashcard, guardarFlashcardGenerada } from "@/lib/actions/estudio";

export default function VisorApuntes() {
  const [selectedText, setSelectedText] = useState("");
  const [popupPosition, setPopupPosition] = useState<{ x: number, y: number } | null>(null);
  
  // Estado del panel lateral (la IA trabajando)
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [flashcardDraft, setFlashcardDraft] = useState<{ pregunta: string, respuesta: string } | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // Escuchar la selección de texto
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 10) {
        // Encontrar la posición para el Pop-up flotante
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        if (rect) {
          setPopupPosition({
            x: rect.left + rect.width / 2,
            y: rect.top - 10 // un poco por encima del texto
          });
          setSelectedText(text);
        }
      } else {
        setPopupPosition(null);
      }
    };

    const container = viewerRef.current;
    container?.addEventListener("mouseup", handleMouseUp);
    
    // Ocultar al hacer clic en cualquier otro lado
    const handleClickOutside = (e: MouseEvent) => {
      if (popupPosition && !(e.target as Element).closest("#ai-popup")) {
        setPopupPosition(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      container?.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popupPosition]);

  const handleCrearFlashcard = async () => {
    setPopupPosition(null); // esconder popup
    setPanelAbierto(true);  // abrir panel lateral
    setIsGenerating(true);
    setFlashcardDraft(null);

    const result = await processTextToFlashcard(selectedText);
    
    if (result.success && result.data) {
      setFlashcardDraft(result.data);
    } else {
      alert("Error generando la flashcard: " + result.error);
    }
    setIsGenerating(false);
  };

  const handleGuardar = async () => {
    if (!flashcardDraft) return;
    
    // Por ahora pasamos "General" como asignatura, luego podemos añadir un selector
    const res = await guardarFlashcardGenerada(flashcardDraft.pregunta, flashcardDraft.respuesta, "General");
    if (res.success) {
      alert("¡Guardada en tu mazo de Anki!");
      setPanelAbierto(false);
      window.getSelection()?.removeAllRanges(); // limpiar selección
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] w-full overflow-hidden relative border border-border rounded-xl bg-card">
      
      {/* 1. VISUALIZADOR PRINCIPAL (PDF simulado o texto) */}
      <div 
        ref={viewerRef}
        className="flex-1 overflow-y-auto p-8 lg:p-16 cursor-text transition-all duration-300"
      >
        <div className="max-w-3xl mx-auto prose prose-slate dark:prose-invert">
          <h2>Tema 4: Inmunidad Adaptativa</h2>
          <p>
            La respuesta inmunitaria adaptativa o específica es activada por la inmunidad innata.
            Sus características principales son la especificidad y la memoria inmunológica.
          </p>
          <p>
            Los linfocitos T (células T) son responsables de la inmunidad celular. Se desarrollan 
            en el timo. Los linfocitos T CD4+ (colaboradores) reconocen antígenos presentados 
            por moléculas MHC de clase II, mientras que los linfocitos T CD8+ (citotóxicos) 
            reconocen antígenos presentados por moléculas MHC de clase I.
          </p>
          <p>
            Por otro lado, los linfocitos B son responsables de la inmunidad humoral. Al ser activados,
            se diferencian en células plasmáticas que secretan inmunoglobulinas (anticuerpos). 
            La primera inmunoglobulina que se secreta en la respuesta primaria es la IgM, seguida de 
            un cambio de isotipo a IgG, IgA o IgE, dependiendo del estímulo de las citocinas.
          </p>
          {/* Texto falso para que haya scroll */}
          <div className="h-96 opacity-10 mt-8 border-t border-dashed">
             [Más páginas del temario aquí abajo...]
          </div>
        </div>
      </div>

      {/* 2. EL POPUP MÁGICO (Flotante) */}
      {popupPosition && (
        <div 
          id="ai-popup"
          className="fixed z-50 transform -translate-x-1/2 -translate-y-full pb-2 shadow-xl animate-in fade-in zoom-in-95 duration-200"
          style={{ left: popupPosition.x, top: popupPosition.y }}
        >
          <div className="flex items-center gap-1 bg-primary text-primary-foreground p-1 rounded-lg">
            <button 
              onClick={handleCrearFlashcard}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 rounded-md transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              Crear Flashcard
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 rounded-md transition-colors opacity-50 cursor-not-allowed" title="Próximamente">
              Explicar
            </button>
          </div>
        </div>
      )}

      {/* 3. PANEL LATERAL DE LA IA (Deslizable) */}
      <div 
        className={`w-80 border-l border-border bg-muted/30 shadow-2xl transition-transform duration-300 flex flex-col ${
          panelAbierto ? "translate-x-0" : "translate-x-full absolute right-0 h-full"
        }`}
      >
        <div className="p-4 border-b border-border flex justify-between items-center bg-card">
          <h3 className="font-bold flex items-center gap-2">
            <span className="text-xl">✨</span> IA Studio
          </h3>
          <button onClick={() => setPanelAbierto(false)} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 text-muted-foreground animate-pulse">
              <span className="text-3xl">🧠</span>
              <p className="text-sm font-medium">Leyendo el texto...</p>
            </div>
          ) : flashcardDraft ? (
            <div className="space-y-4">
              <p className="text-xs font-medium text-primary uppercase tracking-wider">Flashcard Generada</p>
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">PREGUNTA</label>
                <textarea 
                  className="w-full text-sm p-3 rounded-lg border border-border bg-card min-h-24 resize-none focus:ring-1 focus:ring-primary outline-none"
                  value={flashcardDraft.pregunta}
                  onChange={e => setFlashcardDraft({...flashcardDraft, pregunta: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">RESPUESTA</label>
                <textarea 
                  className="w-full text-sm p-3 rounded-lg border border-border bg-card min-h-24 resize-none focus:ring-1 focus:ring-primary outline-none"
                  value={flashcardDraft.respuesta}
                  onChange={e => setFlashcardDraft({...flashcardDraft, respuesta: e.target.value})}
                />
              </div>

              <button 
                onClick={handleGuardar}
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg hover:opacity-90 transition-opacity mt-4 shadow-md shadow-primary/20"
              >
                Guardar en Anki
              </button>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground mt-10">
              Subraya un texto en el visor para empezar.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
