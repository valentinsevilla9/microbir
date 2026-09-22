"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { processTextToFlashcard, guardarFlashcardGenerada } from "@/lib/actions/estudio";
import { ASIGNATURA_GENERAL, ASIGNATURAS_FLASHCARD } from "@/lib/asignaturas";
import { createClient } from "@/lib/supabase/client";
import { MAX_TEXTO_FLASHCARD } from "@/lib/utils";

// Worker de pdf.js servido por nuestro propio bundle (antes venía de unpkg:
// dependencia externa y sin funcionar offline)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export interface Apunte {
  id: string;
  nombre: string;
  storage_path: string;
  created_at: string;
}

type Aviso = { tipo: "ok" | "error"; texto: string } | null;

const MAX_PDF_BYTES = 50 * 1024 * 1024;

export default function ApuntesClient({ apuntesIniciales }: { apuntesIniciales: Apunte[] }) {
  const [supabase] = useState(createClient);

  // Estado de la biblioteca
  const [apuntes, setApuntes] = useState<Apunte[]>(apuntesIniciales);
  const [selectedApunte, setSelectedApunte] = useState<Apunte | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [bibliotecaAbierta, setBibliotecaAbierta] = useState(true); // sólo afecta a móvil

  // Estado del visor PDF
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1);
  const [anchoVisor, setAnchoVisor] = useState<number | null>(null);

  // Estado de la IA
  const [selectedText, setSelectedText] = useState("");
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [flashcardDraft, setFlashcardDraft] = useState<{ pregunta: string; respuesta: string } | null>(null);
  const [asignatura, setAsignatura] = useState(ASIGNATURA_GENERAL);
  const [aviso, setAviso] = useState<Aviso>(null);

  const viewerRef = useRef<HTMLDivElement>(null);
  const avisoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarAviso = (nuevo: NonNullable<Aviso>) => {
    setAviso(nuevo);
    if (avisoTimer.current) clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(null), 4000);
  };

  // Ancho disponible para que el PDF se ajuste también en móvil
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const observador = new ResizeObserver(([entrada]) => setAnchoVisor(entrada.contentRect.width));
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  // Selección de texto: `selectionchange` funciona con ratón y con el
  // dedo (el antiguo `mouseup` no existía en móvil)
  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout> | undefined;

    const alCambiarSeleccion = () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim() ?? "";
        const dentroDelVisor =
          selection?.anchorNode && viewerRef.current?.contains(selection.anchorNode);

        if (!selection || !dentroDelVisor || text.length <= 10) {
          setPopupPosition(null);
          return;
        }

        const rect = selection.getRangeAt(0).getBoundingClientRect();
        const esTactil = window.matchMedia("(pointer: coarse)").matches;
        setSelectedText(text.slice(0, MAX_TEXTO_FLASHCARD));
        setPopupPosition({
          x: rect.left + rect.width / 2,
          // En móvil, debajo: arriba está el menú nativo de copiar/pegar
          y: esTactil ? rect.bottom + 48 : rect.top - 10,
        });
      }, 250);
    };

    document.addEventListener("selectionchange", alCambiarSeleccion);
    return () => {
      clearTimeout(temporizador);
      document.removeEventListener("selectionchange", alCambiarSeleccion);
    };
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;

    if (file.type !== "application/pdf") {
      mostrarAviso({ tipo: "error", texto: "Sólo se pueden subir PDFs." });
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      mostrarAviso({ tipo: "error", texto: "El PDF supera el máximo de 50 MB." });
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Tu sesión ha caducado. Vuelve a entrar.");

      // Ruta única dentro de la carpeta del usuario (las políticas del bucket lo exigen)
      const filePath = `${user.id}/${crypto.randomUUID()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("biblioteca")
        .upload(filePath, file, { contentType: "application/pdf" });
      if (uploadError) throw new Error("No se pudo subir el archivo.");

      const { data: nuevo, error: dbError } = await supabase
        .from("apuntes_archivos")
        .insert({ user_id: user.id, nombre: file.name, storage_path: filePath })
        .select("id, nombre, storage_path, created_at")
        .single();

      if (dbError || !nuevo) {
        // Que no quede un archivo huérfano en el bucket
        await supabase.storage.from("biblioteca").remove([filePath]);
        throw new Error("No se pudo guardar el apunte en tu biblioteca.");
      }

      setApuntes((prev) => [nuevo, ...prev]);
      mostrarAviso({ tipo: "ok", texto: "Apunte subido a tu biblioteca." });
    } catch (error) {
      mostrarAviso({
        tipo: "error",
        texto: error instanceof Error ? error.message : "Error al subir el archivo.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectApunte = async (apunte: Apunte) => {
    setSelectedApunte(apunte);
    setPdfUrl(null); // Limpiar visor mientras carga
    setPageNumber(1);
    setBibliotecaAbierta(false);

    // URL firmada (segura) que caduca en 4 horas
    const { data, error } = await supabase.storage
      .from("biblioteca")
      .createSignedUrl(apunte.storage_path, 4 * 3600);

    if (error || !data?.signedUrl) {
      mostrarAviso({ tipo: "error", texto: "No se pudo abrir el documento." });
      return;
    }
    setPdfUrl(data.signedUrl);
  };

  const handleEliminarApunte = async (apunte: Apunte) => {
    if (!window.confirm(`¿Eliminar «${apunte.nombre}» de tu biblioteca? No se puede deshacer.`)) return;

    // Primero el registro: si luego falla el borrado del archivo sólo queda
    // un huérfano en el bucket, nunca una entrada que apunta a nada.
    const { error: dbError } = await supabase.from("apuntes_archivos").delete().eq("id", apunte.id);
    if (dbError) {
      mostrarAviso({ tipo: "error", texto: "No se pudo eliminar el apunte." });
      return;
    }

    const { error: storageError } = await supabase.storage.from("biblioteca").remove([apunte.storage_path]);
    if (storageError) console.error("Archivo huérfano en el bucket:", apunte.storage_path, storageError);

    setApuntes((prev) => prev.filter((a) => a.id !== apunte.id));
    if (selectedApunte?.id === apunte.id) {
      setSelectedApunte(null);
      setPdfUrl(null);
      setPanelAbierto(false);
    }
    mostrarAviso({ tipo: "ok", texto: "Apunte eliminado." });
  };

  const handleCrearFlashcard = async () => {
    setPopupPosition(null);
    setPanelAbierto(true);
    setIsGenerating(true);
    setFlashcardDraft(null);

    try {
      const response = await processTextToFlashcard(selectedText);
      if (response.success) {
        setFlashcardDraft(response.data);
      } else {
        mostrarAviso({ tipo: "error", texto: response.error });
      }
    } catch {
      mostrarAviso({ tipo: "error", texto: "No se pudo contactar con la IA. Inténtalo de nuevo." });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGuardar = async () => {
    if (!flashcardDraft) return;
    setIsSaving(true);
    try {
      const res = await guardarFlashcardGenerada(
        flashcardDraft.pregunta,
        flashcardDraft.respuesta,
        asignatura
      );
      // Antes se mostraba "guardada con éxito" aunque fallase
      if (!res.success) {
        mostrarAviso({ tipo: "error", texto: res.error });
        return;
      }
      setPanelAbierto(false);
      setFlashcardDraft(null);
      mostrarAviso({ tipo: "ok", texto: "Flashcard guardada en tu mazo." });
    } catch {
      mostrarAviso({ tipo: "error", texto: "No se pudo guardar la flashcard." });
    } finally {
      setIsSaving(false);
    }
  };

  const anchoPagina = anchoVisor ? Math.min(anchoVisor - 32, 900) * zoom : undefined;

  return (
    <div className="relative flex h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-xl border border-border bg-card md:h-[calc(100vh-6rem)] md:flex-row">

      {/* AVISOS */}
      {aviso && (
        <div
          role={aviso.tipo === "error" ? "alert" : "status"}
          className={`absolute left-1/2 top-3 z-50 max-w-[90%] -translate-x-1/2 rounded-lg border px-4 py-2 text-sm shadow-lg animate-fade-in-up ${
            aviso.tipo === "ok"
              ? "border-green-500/30 bg-green-500/15 text-green-700 dark:text-green-300"
              : "border-destructive/30 bg-destructive/15 text-destructive"
          }`}
        >
          {aviso.texto}
        </div>
      )}

      {/* 1. BARRA LATERAL (LA BIBLIOTECA) */}
      <div
        className={`${bibliotecaAbierta ? "flex" : "hidden"} max-h-[45%] flex-col border-b border-border bg-muted/10 md:flex md:max-h-none md:w-72 md:border-b-0 md:border-r`}
      >
        <div className="p-4 border-b border-border bg-card">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            Mi Biblioteca
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Tus PDFs guardados en la nube.</p>
        </div>

        <div className="p-4 border-b border-border">
          <label className={`w-full flex justify-center items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-semibold transition-opacity ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-90"}`}>
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
              <div
                key={apunte.id}
                className={`group flex items-center gap-1 rounded-lg transition-colors ${selectedApunte?.id === apunte.id ? "bg-primary/10 text-primary font-medium shadow-sm" : "hover:bg-muted text-muted-foreground"}`}
              >
                <button
                  type="button"
                  onClick={() => handleSelectApunte(apunte)}
                  className="flex min-w-0 flex-1 items-start gap-2 px-3 py-2.5 text-left text-sm"
                >
                  <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span className="truncate">{apunte.nombre}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleEliminarApunte(apunte)}
                  aria-label={`Eliminar ${apunte.nombre}`}
                  title="Eliminar"
                  className="mr-1 shrink-0 rounded-md p-1.5 text-muted-foreground transition-opacity hover:bg-destructive/10 hover:text-destructive md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. VISOR PRINCIPAL (PDF) */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-muted/10 min-h-0">

        {/* Cabecera del Visor */}
        <div className="h-14 shrink-0 border-b border-border flex items-center justify-between gap-2 px-3 bg-card">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setBibliotecaAbierta((v) => !v)}
              className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground md:hidden"
              aria-expanded={bibliotecaAbierta}
            >
              Biblioteca
            </button>
            <h2 className="font-semibold text-foreground truncate">
              {selectedApunte ? selectedApunte.nombre : "Visor IA"}
            </h2>
          </div>

          {pdfUrl && (
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1">
                <button type="button" aria-label="Reducir" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.2).toFixed(1)))} className="px-2 py-0.5 hover:bg-muted rounded text-sm">-</button>
                <span className="text-xs font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button type="button" aria-label="Ampliar" onClick={() => setZoom(z => Math.min(3, +(z + 0.2).toFixed(1)))} className="px-2 py-0.5 hover:bg-muted rounded text-sm">+</button>
              </div>

              <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2 py-1">
                <button
                  type="button"
                  aria-label="Página anterior"
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
                  type="button"
                  aria-label="Página siguiente"
                  disabled={pageNumber >= numPages}
                  onClick={() => setPageNumber(p => p + 1)}
                  className="text-muted-foreground disabled:opacity-30 hover:text-foreground"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CONTENIDO DEL VISOR */}
        <div ref={viewerRef} className="flex-1 overflow-auto relative cursor-text">
          {!pdfUrl ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground opacity-50 space-y-4">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              <p>{selectedApunte ? "Cargando documento desde la nube..." : "Selecciona un apunte de tu biblioteca y subraya texto para crear flashcards."}</p>
            </div>
          ) : (
            <div className="flex justify-center p-4 min-w-max">
              <Document
                file={pdfUrl}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                onLoadError={() => mostrarAviso({ tipo: "error", texto: "No se pudo leer el PDF." })}
                className="drop-shadow-2xl bg-white"
              >
                <Page
                  pageNumber={pageNumber}
                  width={anchoPagina}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            </div>
          )}
        </div>
      </div>

      {/* 3. EL POPUP (Flotante) */}
      {popupPosition && (
        <div
          id="ai-popup"
          className="fixed z-50 -translate-x-1/2 -translate-y-full pb-2 shadow-xl animate-fade-in-up"
          style={{ left: popupPosition.x, top: popupPosition.y }}
        >
          <div className="flex items-center gap-1 bg-primary text-primary-foreground p-1 rounded-lg">
            <button
              type="button"
              onClick={handleCrearFlashcard}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 rounded-md transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              Crear Flashcard
            </button>
          </div>
        </div>
      )}

      {/* 4. PANEL DE LA IA: lateral en escritorio, hoja inferior en móvil */}
      {panelAbierto && (
        <aside className="fixed inset-x-0 bottom-0 z-40 flex max-h-[75dvh] flex-col rounded-t-2xl border-t border-border bg-card shadow-2xl animate-fade-in-up md:static md:max-h-none md:w-80 md:rounded-none md:border-l md:border-t-0 md:bg-muted/30">
          <div className="p-4 border-b border-border flex justify-between items-center bg-card md:rounded-none rounded-t-2xl">
            <h3 className="font-bold flex items-center gap-2">
              <span className="text-xl">✨</span> IA Studio
            </h3>
            <button type="button" aria-label="Cerrar panel" onClick={() => setPanelAbierto(false)} className="text-muted-foreground hover:text-foreground">✖</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <div className="rounded-lg bg-card p-3 border border-border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Texto seleccionado</p>
              <p className="text-xs italic border-l-2 border-primary pl-2">{selectedText.slice(0, 150)}{selectedText.length > 150 ? "..." : ""}</p>
            </div>

            {isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-70 gap-3 py-6">
                <svg className="animate-spin text-primary" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                <p className="text-sm">Pensando una buena flashcard...</p>
              </div>
            ) : flashcardDraft ? (
              <div className="flex flex-col gap-3 animate-fade-in-up">
                <label className="rounded-lg bg-primary/10 border border-primary/20 p-3">
                  <span className="block text-[10px] font-bold text-primary uppercase mb-1">Pregunta (Frente)</span>
                  <textarea
                    value={flashcardDraft.pregunta}
                    onChange={(e) => setFlashcardDraft({ ...flashcardDraft, pregunta: e.target.value })}
                    maxLength={1000}
                    rows={3}
                    className="w-full resize-none bg-transparent text-sm font-medium outline-none"
                  />
                </label>
                <label className="rounded-lg bg-card border border-border p-3">
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Respuesta (Dorso)</span>
                  <textarea
                    value={flashcardDraft.respuesta}
                    onChange={(e) => setFlashcardDraft({ ...flashcardDraft, respuesta: e.target.value })}
                    maxLength={2000}
                    rows={4}
                    className="w-full resize-none bg-transparent text-sm outline-none"
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  Asignatura
                  <select
                    value={asignatura}
                    onChange={(e) => setAsignatura(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    {ASIGNATURAS_FLASHCARD.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No se ha podido generar la tarjeta. Selecciona otro fragmento o inténtalo de nuevo.</p>
            )}
          </div>

          {flashcardDraft && !isGenerating && (
            <div className="p-4 border-t border-border bg-card">
              <button
                type="button"
                onClick={handleGuardar}
                disabled={isSaving || !flashcardDraft.pregunta.trim() || !flashcardDraft.respuesta.trim()}
                className="w-full bg-primary text-primary-foreground font-semibold py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSaving ? "Guardando..." : "Guardar en mi mazo"}
              </button>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
