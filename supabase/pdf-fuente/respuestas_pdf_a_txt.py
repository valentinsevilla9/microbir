"""
respuestas_pdf_a_txt.py — Plantillas oficiales de respuestas (PDF) → .txt
=========================================================================
Hasta 2020 el Ministerio publicaba las respuestas como una tabla en PDF:

    V RC V RC V RC ...        (V = nº de pregunta, RC = respuesta correcta)
    1 4 48 2 95 2 ...
    7 3 54 1 101 3 148 195    ← 148 sin respuesta = anulada

Este script la convierte al formato de los .txt que usa extractor.py
("N:A" … "N:D" o "N:Anulada"). Sólo procesa las carpetas desde 2015 (antes
había 5 opciones) que tienen PDF de respuestas y aún no tienen .txt.

Uso:
    python respuestas_pdf_a_txt.py
"""

import re
import sys
from pathlib import Path

BASE_DIR = Path(__file__).parent
NUM_A_LETRA = {1: "A", 2: "B", 3: "C", 4: "D"}

# Hasta 2014 los exámenes tenían 5 opciones y el esquema de la BD admite 4
PRIMER_ANIO_4_OPCIONES = 2015
RE_FILA = re.compile(r"^\d+(\s+\d+)*$")


def es_pdf_respuestas(ruta: Path) -> bool:
    return "respuesta" in ruta.name.lower() and ruta.suffix.lower() == ".pdf"


def parsear_pdf_respuestas(ruta_pdf: Path) -> dict[int, int | None]:
    """
    Devuelve {nº pregunta: respuesta 1-4 | None (anulada)}.

    Cada fila de la tabla es "q1 [r1] q2 [r2] ...". Una respuesta es un 1-4
    que sigue a un número de pregunta; como los números de pregunta de la
    siguiente columna son siempre mayores que 4, no hay ambigüedad.
    """
    import pdfplumber

    respuestas: dict[int, int | None] = {}
    with pdfplumber.open(ruta_pdf) as pdf:
        for pagina in pdf.pages:
            for linea in (pagina.extract_text() or "").splitlines():
                linea = linea.strip()
                if not RE_FILA.match(linea):
                    continue
                tokens = [int(t) for t in linea.split()]
                i = 0
                while i < len(tokens):
                    pregunta = tokens[i]
                    siguiente = tokens[i + 1] if i + 1 < len(tokens) else None
                    if siguiente is not None and 1 <= siguiente <= 4:
                        respuestas[pregunta] = siguiente
                        i += 2
                    else:
                        respuestas[pregunta] = None
                        i += 1
    return respuestas


def validar(anio: int, respuestas: dict[int, int | None]) -> None:
    total = max(respuestas)
    faltan = sorted(set(range(1, total + 1)) - set(respuestas))
    if faltan:
        raise ValueError(f"[{anio}] faltan preguntas en la tabla: {faltan}")


def main() -> None:
    generados = 0
    for carpeta in sorted(p for p in BASE_DIR.iterdir() if p.is_dir() and p.name.isdigit()):
        anio = int(carpeta.name)
        if anio < PRIMER_ANIO_4_OPCIONES or list(carpeta.glob("*.txt")):
            continue
        pdfs = [p for p in carpeta.glob("*.pdf") if es_pdf_respuestas(p)]
        if not pdfs:
            continue

        respuestas = parsear_pdf_respuestas(pdfs[0])
        validar(anio, respuestas)

        anuladas = [n for n, r in respuestas.items() if r is None]
        salida = carpeta / f"respuestas_bir_{anio}.txt"
        lineas = [f"# respuestas_bir_{anio}.txt (generado desde {pdfs[0].name})"]
        lineas += [
            f"{n}:{NUM_A_LETRA[r] if r else 'Anulada'}" for n, r in sorted(respuestas.items())
        ]
        salida.write_text("\n".join(lineas) + "\n", encoding="utf-8")
        generados += 1
        print(f"[{anio}] {len(respuestas)} preguntas, {len(anuladas)} anuladas {anuladas} → {salida.name}")

    if generados == 0:
        print("No había plantillas en PDF pendientes de convertir.")


if __name__ == "__main__":
    sys.exit(main())
