"use client"; // Los error boundaries tienen que ser Client Components

/*
 * Sustituye al layout raíz cuando falla, así que no tiene los estilos
 * globales: va con estilos en línea.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#020817",
          color: "#f8fafc",
        }}
      >
        <title>Error | BIR Prep</title>
        <div style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Algo ha fallado</h1>
          <p style={{ color: "#94a3b8", fontSize: 14 }}>
            La aplicación ha tenido un error inesperado.
          </p>
          {error.digest && (
            <p style={{ color: "#64748b", fontSize: 11, fontFamily: "monospace" }}>Ref: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 16,
              padding: "12px 20px",
              borderRadius: 12,
              border: "none",
              background: "#0ea5e9",
              color: "white",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
