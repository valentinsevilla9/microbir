import dynamic from "next/dynamic";

// Le decimos a Next.js que NO intente compilar esto en el servidor (ssr: false)
// porque react-pdf necesita el navegador (window/document) para funcionar.
const ApuntesClient = dynamic(
  () => import("@/components/apuntes/ApuntesClient"),
  { 
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center text-muted-foreground animate-pulse">
        Cargando motor de PDFs...
      </div>
    )
  }
);

export const metadata = {
  title: "Tutor IA - BIR Prep",
};

export default function ApuntesPage() {
  return <ApuntesClient />;
}
