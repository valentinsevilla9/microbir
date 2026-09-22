import type { Metadata } from "next";

import SimuladorTest from "@/components/exam/SimuladorTest";
import { getPreguntasAleatorias } from "@/lib/questions";

export const metadata: Metadata = {
  title: "Test rápido",
};

export default async function TestRapidoPage() {
  const preguntas = await getPreguntasAleatorias(10);

  return (
    <div className="py-4 sm:py-8">
      <SimuladorTest preguntas={preguntas} modo="rapido" claveProgreso="rapido" />
    </div>
  );
}
