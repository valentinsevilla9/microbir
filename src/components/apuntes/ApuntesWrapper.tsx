"use client";

import dynamic from "next/dynamic";

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

export default function ApuntesWrapper() {
  return <ApuntesClient />;
}
