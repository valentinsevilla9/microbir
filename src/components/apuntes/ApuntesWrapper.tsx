"use client";

import dynamic from "next/dynamic";

import type { Apunte } from "@/components/apuntes/ApuntesClient";

const ApuntesClient = dynamic(
  () => import("@/components/apuntes/ApuntesClient"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100dvh-8rem)] items-center justify-center text-muted-foreground animate-pulse md:h-[calc(100vh-6rem)]">
        Cargando motor de PDFs...
      </div>
    ),
  }
);

export default function ApuntesWrapper({ apuntesIniciales }: { apuntesIniciales: Apunte[] }) {
  return <ApuntesClient apuntesIniciales={apuntesIniciales} />;
}
