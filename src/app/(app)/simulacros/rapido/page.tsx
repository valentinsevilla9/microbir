import SimuladorTest from "@/components/exam/SimuladorTest";
import { getPreguntasAleatorias } from "@/lib/questions";

export default async function TestRapidoPage() {
  const preguntas = await getPreguntasAleatorias(10);

  return (
    <div className="py-4 sm:py-8">
      <SimuladorTest preguntas={preguntas} modo="rapido" />
    </div>
  );
}