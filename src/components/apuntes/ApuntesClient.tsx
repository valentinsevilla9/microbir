"use client";

import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { processTextToFlashcard, guardarFlashcardGenerada } from "@/lib/actions/estudio";
import { createClient } from "@/lib/supabase/client";

// Configurar el worker de PDF.js usando la version compatible con Next.js/Webpack
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Apunte {
  id: string;
  nombre: string;
  storage_path: string;
  created_at: string;
}

export default function ApuntesClient() {
  const supabase = createClient();

  // Estado de la biblioteca
  const [apuntes, setApuntes] = useState<Apunte[]>([]);
  const [selectedApunte, setSelectedApunte] = useState<Apunte | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Estado del visor PDF
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);

  // Estado de la IA
  const [selectedText, setSelectedText] = useState("");
  const [popupPosition, setPopupPosition] = useState<{ x: number, y: number } | null>(null);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [flashcardDraft, setFlashcardDraft] = useState<{ pregunta: string, respuesta: string } | null>(null);
  
  const viewerRef = useRef<HTMLDivElement>(null);

  // Cargar biblioteca al entrar
  useEffect(() => {
    cargarBiblioteca();
  }, []);

  const cargarBiblioteca = async () => {
    const { data } = await supabase
      .from("apuntes_archivos")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setApuntes(data);
  };

  // Escuchar la selección de texto
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 10) {
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        if (rect) {
          setPopupPosition({
            x: rect.left + rect.width / 2,
            y: rect.top - 10 
          });
          setSelectedText(text);
        }
      } else {
        setPopupPosition(null);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No estás autenticado");

      // Generar ruta única en el bucket
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Subir archivo a Storage
      const { error: uploadError } = await supabase.storage
        .from("biblioteca")
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;

      // Guardar registro en BD
      const { error: dbError } = await supabase
        .from("apuntes_archivos")
        .insert({
          user_id: user.id,
          nombre: file.name,
          storage_path: filePath
        });

      if (dbError) throw dbError;

      // Refrescar la lista
      await cargarBiblioteca();
      alert("¡Apunte subido y guardado en tu biblioteca!");
      
    } catch (error: any) {
      console.error(error);
      alert("Error al subir el archivo: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectApunte = async (apunte: Apunte) => {
    setSelectedApunte(apunte);
    setPdfUrl(null); // Limpiar visor mientras carga
    setPageNumber(1);
    
    // Obtener URL firmada (segura) que caduca en 1 hora
    const { data } = await supabase.storage
      .from("biblioteca")
      .createSignedUrl(apunte.storage_path, 3600);
      
    if (data?.signedUrl) {
      setPdfUrl(data.signedUrl);
    }
  };

  const handleCrearFlashcard = async () => {
    setPopupPosition(null);
    setPanelAbierto(true);
    setIsGenerating(true);
    setFlashcardDraft(null);

    try {
      const response = await processTextToFlashcard(selectedText);
      if (response.success && response.data) {
        setFlashcardDraft(response.data);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error(error);
      alert("Error al generar la flashcard. Revisa tus claves API.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGuardar = async () => {
    if (!flashcardDraft) return;
    try {
      await guardarFlashcardGenerada(flashcardDraft.pregunta, flashcardDraft.respuesta, "General"); 
      setPanelAbierto(false);
      alert("¡Flashcard guardada con éxito en tu mazo!");
    } catch (error) {
      alert("Error al guardar en base de datos.");
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden rounded-xl border border-border bg-card">
      
      {/* 1. BARRA LATERAL (LA BIBLIOTECA) */}
      <div className="w-72 border-r border-border bg-muted/10 flex flex-col">
        <div className="p-4 border-b border-border bg-card">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            Mi Biblioteca
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Tus PDFs guardados en la nube.</p>
        </div>
        
        <div className="p-4 border-b border-border">
          <label className={`w-full flex justify-center items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-semibold transition-opacity ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}>
            <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
            {isUploading ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Subiendo...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Subir nuevo PDF
              </>
            )}
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {apuntes.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground mt-4 opacity-70">No tienes apuntes todavía.</p>
          ) : (
            apuntes.map(apunte => (
              <button
                key={apunte.id}
                onClick={() => handleSelectApunte(apunte)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-start gap-2 transition-colors ${selectedApunte?.id === apunte.id ? 'bg-primary/10 text-primary font-medium shadow-sm' : 'hover:bg-muted text-muted-foreground'}`}
              >
                <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span className="truncate">{apunte.nombre}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 2. VISOR PRINCIPAL (PDF) */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-muted/10">
        
        {/* Cabecera del Visor */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
          <h2 className="font-semibold text-foreground truncate max-w-sm">
            {selectedApunte ? selectedApunte.nombre : "Visor IA"}
          </h2>
          
          <div className="flex items-center gap-3">
            {pdfUrl && (
              <>
                <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1">
                  <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="px-2 py-0.5 hover:bg-muted rounded text-sm">-</button>
                  <span className="text-xs font-mono w-10 text-center">{Math.round(scale * 100)}%</span>
                  <button onClick={() => setScale(s => Math.min(3, s + 0.2))} className="px-2 py-0.5 hover:bg-muted rounded text-sm">+</button>
                </div>
                
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2 py-1">
                  <button 
                    disabled={pageNumber <= 1} 
                    onClick={() => setPageNumber(p => p - 1)}
                    className="text-muted-foreground disabled:opacity-30 hover:text-foreground"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <span className="text-xs">
                    {pageNumber} / {numPages}
                  </span>
                  <button 
                    disabled={pageNumber >= numPages} 
                    onClick={() => setPageNumber(p => p + 1)}
                    className="text-muted-foreground disabled:opacity-30 hover:text-foreground"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* CONTENIDO DEL VISOR */}
        <div ref={viewerRef} className="flex-1 overflow-auto relative cursor-text">
          {!pdfUrl ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-4">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p>{selectedApunte ? "Cargando documento desde la nube..." : "Selecciona un apunte de tu biblioteca para estudiar."}</p>
            </div>
          ) : (
            <div className="flex justify-center p-8 min-w-max">
              <Document
                file={pdfUrl}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
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

      {/* 3. EL POPUP MÁGICO (Flotante) */}
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              Crear Flashcard
            </button>
          </div>
        </div>
      )}

      {/* 4. PANEL LATERAL DE LA IA (Deslizable) */}
      <div 
        className={`w-80 border-l border-border bg-muted/30 shadow-2xl transition-transform duration-300 flex flex-col ${
          panelAbierto ? "translate-x-0" : "translate-x-full absolute right-0 h-full"
        }`}
      >
        <div className="p-4 border-b border-border flex justify-between items-center bg-card">
          <h3 className="font-bold flex items-center gap-2">
            <span className="text-xl">✨</span> IA Studio
          </h3>
          <button onClick={() => setPanelAbierto(false)} className="text-muted-foreground hover:text-foreground">✖</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="rounded-lg bg-card p-3 border border-border">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Texto seleccionado</p>
            <p className="text-xs italic border-l-2 border-primary pl-2">{selectedText.slice(0, 150)}{selectedText.length > 150 ? '...' : ''}</p>
          </div>

          {isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 gap-3">
              <svg className="animate-spin text-primary" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
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
