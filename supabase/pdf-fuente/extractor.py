"""
extractor.py — BIR Exam PDF Extractor
======================================
Lee los PDFs de exámenes BIR y sus ficheros de respuestas, y genera
un CSV listo para importar en Supabase (tabla `preguntas`).

Uso:
    pip install -r requirements.txt
    python extractor.py

Salida:
    preguntas_extraidas.csv   → CSV con todas las preguntas
    extractor.log             → log detallado de warnings
"""

import csv
import logging
import os
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuración de logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s  %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("extractor.log", mode="w", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).parent
OUTPUT_CSV = BASE_DIR / "preguntas_extraidas.csv"

# Años a procesar (subcarpetas) — solo los que tienen .txt de respuestas
ANIOS = [2021, 2022, 2023, 2024, 2025]

# Mapa de letra → número (posición de respuesta)
LETRA_A_NUM = {"A": 1, "B": 2, "C": 3, "D": 4}

# ---------------------------------------------------------------------------
# Clasificador de asignaturas por palabras clave
# (las preguntas BIR no llevan asignatura; hacemos una inferencia básica)
# ---------------------------------------------------------------------------
# Taxonomía BIR (8 Bloques + Subcategorías) con palabras clave ponderadas
TAXONOMIA_BIR = {
    "Fisiología y Anatomía": {
        "Cardiovascular y Respiratorio": ["corazón", "cardiaco", "presión arterial", "aorta", "pulmón", "respiratorio", "alveolar", "sístole", "diástole", "capilar", "ventilación", "bronquio"],
        "Renal y Digestivo": ["renal", "riñón", "nefrona", "orina", "filtración glomerular", "digestivo", "gástrico", "estómago", "intestino", "hepático", "defecación", "absorción intestinal", "bilis"],
        "Endocrino y Reproductor": ["hormona", "endocrino", "tiroides", "hipófisis", "insulina", "glucagón", "testosterona", "ovario", "espermatozoide", "ovocito", "oxitocina", "somatotropina"],
        "Sistema Nervioso y Sentidos": ["neurona", "sinapsis", "potencial de acción", "nervio", "cerebro", "simpático", "parasimpático", "ojo", "retina", "oído", "olfato", "axón", "mielina", "receptor"]
    },
    "Inmunología": {
        "Inmunidad Innata y Complemento": ["innata", "macrófago", "neutrófilo", "complemento", "fagocitosis", "toll-like", "inflamación", "NK", "quimiotaxis"],
        "Inmunidad Adaptativa": ["linfocito", "anticuerpo", "inmunoglobulina", "CD4", "CD8", "MHC", "HLA", "TCR", "BCR", "citocina", "Th1", "Th2"],
        "Inmunopatología": ["hipersensibilidad", "autoinmune", "alergia", "rechazo", "trasplante", "inmunodeficiencia", "tolerancia", "anafilaxia"],
        "Técnicas Inmunológicas": ["ELISA", "citometría", "inmunofluorescencia", "anticuerpo monoclonal", "hibridoma"]
    },
    "Hematología": {
        "Fisiología y Patología Eritrocitaria": ["eritrocito", "hematíe", "anemia", "hierro", "vitamina B12", "fólico", "reticulocito", "hemoglobina", "eritropoyesis"],
        "Serie Blanca y Neoplasias": ["leucemia", "linfoma", "leucocitosis", "mieloide", "linfoide", "mieloma"],
        "Hemostasia y Coagulación": ["coagulación", "plaqueta", "trombosis", "hemostasia", "heparina", "protrombina", "plasmina", "trombina", "factor tisular"],
        "Banco de Sangre e Inmunohematología": ["grupo sanguíneo", "ABO", "Rh", "transfusión", "Coombs"]
    },
    "Microbiología y Parasitología": {
        "Bacteriología": ["bacteria", "bacteriano", "Gram", "bacilo", "coco", "estafilococo", "estreptococo", "peptidoglicano", "endospora", "LPS", "tuberculosis"],
        "Virología": ["virus", "viral", "VIH", "hepatitis", "herpes", "SARS", "bacteriófago", "virión", "cápside"],
        "Micología": ["hongo", "levadura", "cándida", "aspergillus", "micosis", "espora"],
        "Parasitología": ["parásito", "plasmodium", "leishmania", "trypanosoma", "helminto", "nematodo", "protozoo", "vector"],
        "Antimicrobianos y Resistencias": ["antibiótico", "penicilina", "resistencia", "betalactámico", "antimicrobiano", "CMI", "CBA"]
    },
    "Bioquímica y Biología Molecular": {
        "Metabolismo Energético": ["glucólisis", "Krebs", "ATP", "metabolismo", "lípido", "colesterol", "ácido graso", "glucógeno", "NADH", "FADH", "beta-oxidación"],
        "Proteínas, Enzimas y Aminoácidos": ["proteína", "enzima", "aminoácido", "cinética", "Michaelis", "alostérico", "péptido", "km", "Vmax"],
        "Procesos Moleculares": ["ADN", "ARN", "replicación", "transcripción", "traducción", "polimerasa", "promotor", "operón", "helicasa", "ligasa", "ARNm"],
        "Técnicas de Biología Molecular": ["PCR", "Western blot", "Southern", "Northern", "secuenciación", "electroforesis", "CRISPR", "clonación", "plásmido"]
    },
    "Biología Celular e Histología": {
        "Membrana y Tráfico": ["membrana plasmática", "endocitosis", "exocitosis", "vesícula", "Golgi", "retículo", "transporte activo", "bomba sodio"],
        "Orgánulos, Citoesqueleto y Matriz": ["mitocondria", "lisosoma", "peroxisoma", "citoesqueleto", "microtúbulo", "actina", "colágeno", "matriz extracelular", "fibroblasto"],
        "Ciclo Celular, Mitosis y Apoptosis": ["ciclo celular", "mitosis", "meiosis", "apoptosis", "ciclina", "caspasa", "centrosoma", "cinetocoro"],
        "Histología Humana": ["tejido", "epitelio", "conjuntivo", "muscular", "nervioso", "cartílago", "óseo", "endotelio", "osteoblasto", "epidermis"]
    },
    "Genética": {
        "Genética Mendeliana y Herencia": ["Mendel", "herencia", "alelo", "dominante", "recesivo", "autosómico", "ligado al sexo", "pedigrí", "fenotipo", "genotipo"],
        "Citogenética y Alteraciones Cromosómicas": ["cromosoma", "cariotipo", "aneuploidía", "trisomía", "Down", "translocación", "deleción", "cromátida"],
        "Mutaciones y Reparación del ADN": ["mutación", "reparación", "mutágeno", "nonsense", "missense", "frameshift"],
        "Genética de Poblaciones y Evolución": ["Hardy-Weinberg", "población", "evolución", "deriva genética", "selección natural", "polimorfismo"]
    },
    "Estadística y Metodología": {
        "Bioestadística": ["media", "varianza", "p-valor", "T-student", "ANOVA", "chi-cuadrado", "distribución", "probabilidad", "desviación", "mediana"],
        "Epidemiología y Diseño de Estudios": ["cohorte", "casos y controles", "riesgo relativo", "odds ratio", "ensayo clínico", "sesgo", "prevalencia", "incidencia"],
        "Fiabilidad de Pruebas": ["sensibilidad", "especificidad", "valor predictivo", "ROC"]
    }
}


def clasificar_pregunta(texto: str) -> tuple[str, str]:
    """
    Intenta asignar asignatura y tema (subcategoría) por palabras clave usando un sistema de puntuación.
    Devuelve: (asignatura, tema). Si no encaja, devuelve ('Fisiología y Anatomía', 'General').
    """
    texto_lower = texto.lower()
    
    mejor_asignatura = "Fisiología y Anatomía"
    mejor_tema = "General"
    max_score = 0
    
    for asignatura, temas in TAXONOMIA_BIR.items():
        for tema, keywords in temas.items():
            # Contar cuántas keywords distintas aparecen en el texto
            score = sum(1 for kw in keywords if kw.lower() in texto_lower)
            if score > max_score:
                max_score = score
                mejor_asignatura = asignatura
                mejor_tema = tema
                
    return mejor_asignatura, mejor_tema


# ---------------------------------------------------------------------------
# Parser de fichero de respuestas
# ---------------------------------------------------------------------------
def parsear_respuestas(ruta: Path) -> dict[int, int | None]:
    """
    Lee el .txt de respuestas y devuelve {num_pregunta: num_opcion | None}.
    None indica pregunta anulada (se omitirá).
    """
    respuestas: dict[int, int | None] = {}
    with open(ruta, encoding="utf-8") as f:
        for linea in f:
            linea = linea.strip()
            if not linea or linea.startswith("#") or linea.startswith("."):
                continue
            m = re.match(r"^(\d+)\s*[:=]\s*(.+)$", linea)
            if not m:
                continue
            num = int(m.group(1))
            valor = m.group(2).strip()
            if valor.lower() in ("anulada", "anulado", "-"):
                respuestas[num] = None
            elif valor.upper() in LETRA_A_NUM:
                respuestas[num] = LETRA_A_NUM[valor.upper()]
            else:
                log.warning("  Respuesta no reconocida para pregunta %d: '%s'", num, valor)
    return respuestas


# ---------------------------------------------------------------------------
# Extractor de preguntas desde PDF
# ---------------------------------------------------------------------------
def extraer_texto_pdf(ruta_pdf: Path) -> str:
    """Extrae el texto completo del PDF usando pdfplumber.
    
    Los cuadernillos BIR tienen formato de DOS COLUMNAS por página.
    Se extrae cada columna por separado y se concatenan en orden.
    """
    try:
        import pdfplumber
    except ImportError:
        log.error("pdfplumber no está instalado. Ejecuta: pip install pdfplumber")
        sys.exit(1)

    texto_paginas: list[str] = []
    with pdfplumber.open(ruta_pdf) as pdf:
        for pagina in pdf.pages:
            width = pagina.width
            height = pagina.height

            # Extraer las dos columnas separadamente
            col_izq = pagina.crop((0, 0, width / 2, height))
            col_der = pagina.crop((width / 2, 0, width, height))

            texto_izq = col_izq.extract_text() or ""
            texto_der = col_der.extract_text() or ""

            # Concatenar columna izquierda + derecha con separador de línea
            texto_pagina = texto_izq.strip() + "\n" + texto_der.strip()
            if texto_pagina.strip():
                texto_paginas.append(texto_pagina)

    texto_total = "\n".join(texto_paginas)
    if not texto_total.strip():
        log.warning("  El PDF '%s' parece estar escaneado sin OCR — se omite.", ruta_pdf.name)
        return ""
    return texto_total


def parsear_preguntas_texto(texto: str, anio: int) -> list[dict]:
    """
    Parsea el texto del PDF (ya separado por columnas) y extrae las preguntas.

    Formato real en los cuadernillos BIR (opciones numeradas 1-4, no A-D):
        <número>. <enunciado multilinea>
        1. <opción 1>
        2. <opción 2>
        3. <opción 3>
        4. <opción 4>

    Devuelve lista de dicts con claves:
        num, enunciado, opcion_1, opcion_2, opcion_3, opcion_4
    """
    preguntas: list[dict] = []

    # Eliminar líneas de paginación tipo "- 1 -" o "1 -" o "- 2-"
    texto = re.sub(r"\n\s*-\s*\d+\s*-?\s*\n", "\n", texto)
    texto = re.sub(r"\n\s*\d+\s*-\s*\n", "\n", texto)

    # Normalizar: quitar líneas vacías múltiples
    lineas = [l.strip() for l in texto.splitlines() if l.strip()]
    texto_limpio = "\n".join(lineas)

    # Patrón: número de pregunta (>= 2 dígitos o precedido por salto), enunciado,
    # luego 4 opciones numeradas 1. 2. 3. 4.
    # El lookahead detecta la siguiente pregunta o el fin del texto.
    patron_pregunta = re.compile(
        r"(?<!\d)(\d{1,3})\.\s+"         # número de pregunta (no precedido por dígito)
        r"(.+?)\s+"                        # enunciado (no greedy)
        r"1\.\s+(.+?)\s+"                 # opción 1
        r"2\.\s+(.+?)\s+"                 # opción 2
        r"3\.\s+(.+?)\s+"                 # opción 3
        r"4\.\s+(.+?)"                    # opción 4
        r"(?=\s+\d{1,3}\.\s|\Z)",         # lookahead: siguiente pregunta o fin
        re.DOTALL,
    )

    for m in patron_pregunta.finditer(texto_limpio):
        num = int(m.group(1))
        enunciado = _limpiar(m.group(2))
        opcion_1 = _limpiar(m.group(3))
        opcion_2 = _limpiar(m.group(4))
        opcion_3 = _limpiar(m.group(5))
        opcion_4 = _limpiar(m.group(6))

        if not enunciado or not all([opcion_1, opcion_2, opcion_3, opcion_4]):
            log.warning("  Pregunta %d: datos incompletos — se omite.", num)
            continue

        # Sanity check: las opciones no deberían ser demasiado largas
        if any(len(op) > 500 for op in [opcion_1, opcion_2, opcion_3, opcion_4]):
            log.warning("  Pregunta %d: opción demasiado larga, posible error de parseo — se omite.", num)
            continue

        preguntas.append({
            "num": num,
            "enunciado": enunciado,
            "opcion_1": opcion_1,
            "opcion_2": opcion_2,
            "opcion_3": opcion_3,
            "opcion_4": opcion_4,
        })

    return preguntas


def _limpiar(texto: str) -> str:
    """Normaliza espacios y saltos de línea dentro de un fragmento de texto."""
    # Unir múltiples espacios/saltos en uno solo
    texto = re.sub(r"\s+", " ", texto)
    return texto.strip()


# ---------------------------------------------------------------------------
# Procesamiento por año
# ---------------------------------------------------------------------------
def procesar_anio(anio: int) -> list[dict]:
    """Procesa un año y devuelve las filas listas para el CSV."""
    carpeta = BASE_DIR / str(anio)
    if not carpeta.exists():
        log.warning("Carpeta %s no encontrada — se omite.", anio)
        return []

    # Buscar PDF de preguntas (excluir los que contengan "Respuesta" en el nombre)
    todos_pdfs = list(carpeta.glob("*.pdf"))
    if not todos_pdfs:
        log.warning("[%d] No se encontró ningún PDF en %s", anio, carpeta)
        return []
    # Preferir PDFs que NO contengan "respuesta" en el nombre (case-insensitive)
    pdfs_preguntas = [p for p in todos_pdfs if "respuesta" not in p.name.lower()]
    if pdfs_preguntas:
        ruta_pdf = sorted(pdfs_preguntas)[0]
    else:
        ruta_pdf = sorted(todos_pdfs)[0]
    if len(todos_pdfs) > 1:
        log.info("[%d] Múltiples PDFs encontrados; usando para preguntas: %s", anio, ruta_pdf.name)

    # Buscar TXT de respuestas — cualquier .txt en la carpeta
    txts = list(carpeta.glob("*.txt"))
    if not txts:
        log.warning("[%d] No se encontró fichero .txt de respuestas — se omite.", anio)
        return []
    ruta_txt = sorted(txts)[0]
    if len(txts) > 1:
        log.warning("[%d] Múltiples TXT encontrados; usando: %s", anio, ruta_txt.name)

    log.info("[%d] PDF:         %s", anio, ruta_pdf.name)
    log.info("[%d] Respuestas:  %s", anio, ruta_txt.name)

    # Parsear respuestas
    respuestas = parsear_respuestas(ruta_txt)
    anuladas = [n for n, v in respuestas.items() if v is None]
    log.info("[%d] Preguntas en respuestas: %d  |  Anuladas: %d",
             anio, len(respuestas), len(anuladas))

    # Extraer texto PDF
    texto_pdf = extraer_texto_pdf(ruta_pdf)
    if not texto_pdf:
        return []

    # Parsear preguntas
    preguntas_raw = parsear_preguntas_texto(texto_pdf, anio)
    log.info("[%d] Preguntas extraídas del PDF: %d", anio, len(preguntas_raw))

    # Cruzar con respuestas
    filas: list[dict] = []
    sin_respuesta = 0
    for p in preguntas_raw:
        num = p["num"]
        if num not in respuestas:
            log.warning("[%d] Pregunta %d sin respuesta en el TXT — se omite.", anio, num)
            sin_respuesta += 1
            continue
        if respuestas[num] is None:
            # Anulada: omitir
            continue

        asignatura, tema = clasificar_pregunta(p["enunciado"])
        filas.append({
            "anio": anio,
            "asignatura": asignatura,
            "tema": tema,
            "enunciado": p["enunciado"],
            "opcion_1": p["opcion_1"],
            "opcion_2": p["opcion_2"],
            "opcion_3": p["opcion_3"],
            "opcion_4": p["opcion_4"],
            "respuesta_correcta": respuestas[num],
        })

    log.info("[%d] Filas válidas para CSV: %d  |  Sin respuesta: %d  |  Anuladas: %d",
             anio, len(filas), sin_respuesta, len(anuladas))
    return filas


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    log.info("=" * 60)
    log.info("BIR Extractor  —  inicio")
    log.info("=" * 60)

    todas_las_filas: list[dict] = []
    resumen: list[tuple[int, int]] = []

    for anio in ANIOS:
        filas = procesar_anio(anio)
        todas_las_filas.extend(filas)
        resumen.append((anio, len(filas)))

    # Escribir CSV
    if not todas_las_filas:
        log.error("No se extrajeron preguntas. Revisa los PDFs y los .txt de respuestas.")
        sys.exit(1)

    columnas = [
        "anio", "asignatura", "tema", "enunciado",
        "opcion_1", "opcion_2", "opcion_3", "opcion_4",
        "respuesta_correcta",
    ]
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=columnas)
        writer.writeheader()
        writer.writerows(todas_las_filas)

    log.info("")
    log.info("=" * 60)
    log.info("RESUMEN")
    log.info("=" * 60)
    for anio, n in resumen:
        log.info("  %d: %d preguntas", anio, n)
    log.info("  TOTAL: %d preguntas", len(todas_las_filas))
    log.info("")
    log.info("CSV generado: %s", OUTPUT_CSV)
    log.info("")
    log.info("SIGUIENTE PASO:")
    log.info("  1. Revisa 'preguntas_extraidas.csv' y ajusta la columna 'asignatura'")
    log.info("     si el clasificador automático no fue preciso.")
    log.info("  2. Importa el CSV en Supabase:")
    log.info("     Dashboard → Table Editor → preguntas → Import CSV")
    log.info("     (o usa: supabase db push + seed manual)")


if __name__ == "__main__":
    main()
