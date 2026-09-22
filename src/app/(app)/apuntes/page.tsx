import type { Metadata } from "next";

import ApuntesWrapper from "@/components/apuntes/ApuntesWrapper";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Apuntes IA",
};

export default async function ApuntesPage() {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("apuntes_archivos")
    .select("id, nombre, storage_path, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error cargando la biblioteca:", error);
    throw new Error("No se pudo cargar tu biblioteca de apuntes.");
  }

  return <ApuntesWrapper apuntesIniciales={data ?? []} />;
}
