import { notFound } from "next/navigation";
import Link from "next/link";
import SimuladorTest from "@/components/exam/SimuladorTest";
import { getPreguntasPorAsignatura } from "@/lib/questions";

/** El segmento puede llegar ya decodificado o no; si trae un "%" suelto, se deja tal cual. */
function decodificar(valor: string): string {
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}

interface Props {
  params: Promise<{ asignatura: string }>;
}

export default async function TestPorAsignaturaPage({ params }: Props) {
  const { asignatura: asignaturaParam } = await params;
  const asignatura = decodificar(asignaturaParam);

  const preguntas = await getPreguntasPorAsignatura(asignatura, 20);
  if (preguntas.length === 0) notFound();

  return (
    <div className="space-y-6 py-4 sm:py-8">
      <header className="flex items-center gap-3">
        <Link
          href="/simulacros/asignatura"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Asignaturas
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-sm font-medium">{asignatura}</span>
      </header>

      <SimuladorTest
        preguntas={preguntas}
        modo="asignatura"
        asignatura={asignatura}
        claveProgreso={`asignatura-${asignatura}`}
      />
    </div>
  );
}
