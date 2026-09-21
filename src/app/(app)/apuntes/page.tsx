"use client";

import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { processTextToFlashcard, guardarFlashcardGenerada } from "@/lib/actions/estudio";

// Configurar el worker de PDF.js usando la version compatible con Next.js/Webpack
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function VisorApuntes() {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);

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

    // Usar el documento entero si estamos en el visor
    document.addEventListener("mouseup", handleMouseUp);
    
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFile(file);
      setPageNumber(1);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleCrearFlashcard = async () => {
    setPopupPosition(null);
    setPanelAbierto(true);
    setIsGenerating(true);
    setFlashcardDraft(null);

    try {
      const draft = await processTextToFlashcard(selectedText);
      setFlashcardDraft(draft);
    } catch (error) {
      console.error(error);
      alert("Error al generar la flashcard. Revisa tu API KEY en .env.local y Vercel.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGuardar = async () => {
    if (!flashcardDraft) return;
    try {
      await guardarFlashcardGenerada(flashcardDraft, "General"); // TODO: Selector de tema real
      setPanelAbierto(false);
      alert("Flashcard guardada con éxito en tu mazo!");
    } catch (error) {
      alert("Error al guardar en base de datos.");
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden rounded-xl border border-border bg-card">
      
      {/* VISOR PRINCIPAL (PDF) */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Cabecera del Visor */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-muted/30">
          <h2 className="font-semibold flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            Tutor IA (Visor de PDF)
          </h2>
          
          <div className="flex items-center gap-3">
            {file && (
              <>
                {/* Controles de Zoom */}
                <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1">
                  <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="px-2 py-0.5 hover:bg-muted rounded text-sm">-</button>
                  <span className="text-xs font-mono w-10 text-center">{Math.round(scale * 100)}%</span>
                  <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="px-2 py-0.5 hover:bg-muted rounded text-sm">+</button>
                </div>
                
                {/* Controles de Pagina */}
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2 py-1">
                  <button 
                    disabled={pageNumber <= 1} 
                    onClick={() => setPageNumber(p => p - 1)}
                    className="text-muted-foreground disabled:opacity-30 hover:text-foreground"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <span className="text-xs">
                    {pageNumber} / {numPages}
                  </span>
                  <button 
                    disabled={pageNumber >= numPages} 
                    onClick={() => setPageNumber(p => p + 1)}
                    className="text-muted-foreground disabled:opacity-30 hover:text-foreground"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                </div>
              </>
            )}

            <label className="cursor-pointer bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
              <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
              {file ? "Cambiar PDF" : "Subir PDF"}
            </label>
          </div>
        </div>

        {/* CONTENIDO DEL VISOR */}
        <div ref={viewerRef} className="flex-1 overflow-auto bg-muted/10 relative cursor-text">
          {!file ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-4">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p>Sube un PDF de tu temario para empezar a estudiar.</p>
            </div>
          ) : (
            <div className="flex justify-center p-8 min-w-max">
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                className="drop-shadow-2xl bg-white"
              >
                <Page 
                  pageNumber={pageNumber} 
                  scale={scale} 
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            </div>
          )}
        </div>
      </div>

      {/* EL POPUP MÁGICO (Flotante) */}
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

      {/* PANEL LATERAL DE LA IA (Deslizable) */}
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
            ✖
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="rounded-lg bg-card p-3 border border-border">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Texto seleccionado</p>
            <p className="text-xs italic border-l-2 border-primary pl-2">{selectedText.slice(0, 150)}{selectedText.length > 150 ? '...' : ''}</p>
          </div>

          {isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 gap-3">
              <svg className="animate-spin text-primary" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              <p className="text-sm">Pensando una buena flashcard...</p>
            </div>
          ) : flashcardDraft ? (
            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4">
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
                <p className="text-[10px] font-bold text-primary uppercase mb-1">Pregunta (Frente)</p>
                <p className="text-sm font-medium">{flashcardDraft.pregunta}</p>
              </div>
              <div className="rounded-lg bg-card border border-border p-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Respuesta (Dorso)</p>
                <p className="text-sm">{flashcardDraft.respuesta}</p>
              </div>
            </div>
          ) : null}
        </div>

        {flashcardDraft && !isGenerating && (
          <div className="p-4 border-t border-border bg-card">
            <button 
              onClick={handleGuardar}
              className="w-full bg-primary text-primary-foreground font-semibold py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Guardar en mi mazo
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
