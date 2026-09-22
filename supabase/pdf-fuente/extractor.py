"""
extractor.py — BIR Exam PDF Extractor
======================================
Lee los PDFs de exámenes BIR y sus ficheros de respuestas, y genera
un CSV listo para importar en Supabase (tabla `preguntas`).

Uso:
    pip install -r requirements.txt
    python extractor.py

Salida:
    preguntas_extraidas.csv   → CSV con todas las preguntas (con su número oficial)
    extractor.log             → log detallado de warnings

Después: `python generar_sql_importacion.py` para actualizar Supabase.
"""

import csv
import logging
import re
import sys
import unicodedata
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuración de logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s  %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(Path(__file__).parent / "extractor.log", mode="w", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).parent
OUTPUT_CSV = BASE_DIR / "preguntas_extraidas.csv"

# Años a procesar: las subcarpetas con .txt de respuestas (los de 2015–2020
# se generan con respuestas_pdf_a_txt.py a partir de la plantilla en PDF)
ANIOS = sorted(
    int(p.name) for p in BASE_DIR.iterdir()
    if p.is_dir() and p.name.isdigit() and any(p.glob("*.txt"))
)

# Mapa de letra → número (posición de respuesta)
LETRA_A_NUM = {"A": 1, "B": 2, "C": 3, "D": 4}

# ---------------------------------------------------------------------------
# Clasificador de asignaturas por palabras clave
# (las preguntas BIR no llevan asignatura; hacemos una inferencia básica)
# ---------------------------------------------------------------------------
# Taxonomía BIR (8 Bloques + Subcategorías) con palabras clave ponderadas
TAXONOMIA_BIR = {
    "Fisiología y Anatomía": {
        "Cardiovascular y Respiratorio": ["hematoencefálica", "tensión arterial", "gasto cardiaco", "hemodinámica", "corazón", "cardiaco", "presión arterial", "aorta", "pulmón", "respiratorio", "alveolar", "sístole", "diástole", "capilar", "ventilación", "bronquio"],
        "Renal y Digestivo": ["alcalosis", "acidosis", "equilibrio ácido-base", "agua corporal", "líquido extracelular", "páncreas", "hígado", "renal", "riñón", "nefrona", "orina", "filtración glomerular", "digestivo", "gástrico", "estómago", "intestino", "hepático", "defecación", "absorción intestinal", "bilis"],
        "Endocrino y Reproductor": ["testículo", "escroto", "gonadotropina", "diabetes", "embrión", "embrionario", "intrauterino", "placenta", "cortisol", "estrógeno", "progesterona", "inhibina", "glándula", "hormona", "endocrino", "tiroides", "hipófisis", "insulina", "glucagón", "testosterona", "ovario", "espermatozoide", "ovocito", "oxitocina", "somatotropina"],
        "Sistema Nervioso y Sentidos": ["mielínico", "amielínico", "sonora", "cóclea", "audición", "visión", "potencial de reposo", "músculo", "sarcómero", "neurona", "sinapsis", "potencial de acción", "nervio", "cerebro", "simpático", "parasimpático", "ojo", "retina", "oído", "olfato", "axón", "mielina", "receptor"]
    },
    "Inmunología": {
        "Inmunidad Innata y Complemento": ["innata", "macrófago", "neutrófilo", "complemento", "fagocitosis", "toll-like", "inflamación", "NK", "quimiotaxis"],
        "Inmunidad Adaptativa": ["sistema inmune", "inmunitario", "inmunológico", "timo", "vacuna", "antígeno", "linfocito", "anticuerpo", "inmunoglobulina", "CD4", "CD8", "MHC", "HLA", "TCR", "BCR", "citocina", "Th1", "Th2"],
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
        "Bacteriología": ["agar", "cultivo", "Neisseria", "Escherichia", "Salmonella", "Klebsiella", "Pseudomonas", "Staphylococcus", "Streptococcus", "Mycobacterium", "Clostridium", "Chlamydia", "Treponema", "Haemophilus", "Legionella", "Listeria", "granuloma inguinal", "transmisión sexual", "infección", "bacteria", "bacteriano", "Gram", "bacilo", "coco", "estafilococo", "estreptococo", "peptidoglicano", "endospora", "LPS", "tuberculosis"],
        "Virología": ["virus", "viral", "VIH", "hepatitis", "herpes", "SARS", "bacteriófago", "virión", "cápside"],
        "Micología": ["hongo", "levadura", "cándida", "aspergillus", "micosis", "espora"],
        "Parasitología": ["Enterobius", "Giardia", "Toxoplasma", "Entamoeba", "Taenia", "Ascaris", "Schistosoma", "Trichomonas", "parásito", "plasmodium", "leishmania", "trypanosoma", "helminto", "nematodo", "protozoo", "vector"],
        "Antimicrobianos y Resistencias": ["antibiótico", "penicilina", "resistencia", "betalactámico", "antimicrobiano", "CMI", "CBA"]
    },
    "Bioquímica y Biología Molecular": {
        "Metabolismo Energético": ["ácidos grasos", "gluconeogénesis", "cetogénesis", "urea", "amoniaco", "vitamina", "coenzima", "glucólisis", "Krebs", "ATP", "metabolismo", "lípido", "colesterol", "ácido graso", "glucógeno", "NADH", "FADH", "beta-oxidación"],
        "Proteínas, Enzimas y Aminoácidos": ["proteína", "enzima", "aminoácido", "cinética", "Michaelis", "alostérico", "péptido", "km", "Vmax"],
        "Procesos Moleculares": ["nucleótido", "desoxinucleótido", "nucleosoma", "cromatina", "histona", "ADN", "ARN", "replicación", "transcripción", "traducción", "polimerasa", "promotor", "operón", "helicasa", "ligasa", "ARNm"],
        "Técnicas de Biología Molecular": ["PCR", "Western blot", "Southern", "Northern", "secuenciación", "electroforesis", "CRISPR", "clonación", "plásmido"],
        "Bioquímica Clínica": ["suero", "sérico", "plasmático", "líquido pleural", "líquido sinovial", "líquido cefalorraquídeo", "cribado", "marcador", "transaminasa", "creatinina", "bilirrubina", "troponina", "glucemia", "hemoglobina glicada", "proteinograma", "albúmina", "sepsis", "procalcitonina"]
    },
    "Biología Celular e Histología": {
        "Membrana y Tráfico": ["membrana plasmática", "endocitosis", "exocitosis", "vesícula", "Golgi", "retículo", "transporte activo", "bomba sodio"],
        "Orgánulos, Citoesqueleto y Matriz": ["mitocondria", "lisosoma", "peroxisoma", "citoesqueleto", "microtúbulo", "actina", "colágeno", "matriz extracelular", "fibroblasto"],
        "Ciclo Celular, Mitosis y Apoptosis": ["ciclo celular", "mitosis", "meiosis", "apoptosis", "ciclina", "caspasa", "centrosoma", "cinetocoro"],
        "Histología Humana": ["hueso", "ósea", "osteoclasto", "Paget", "piel", "sebácea", "sudorípara", "tejido", "epitelio", "conjuntivo", "muscular", "nervioso", "cartílago", "óseo", "endotelio", "osteoblasto", "epidermis"]
    },
    "Genética": {
        "Genética Mendeliana y Herencia": ["gen supresor", "oncogén", "poliposis", "síndrome de", "hereditario", "Mendel", "herencia", "alelo", "dominante", "recesivo", "autosómico", "ligado al sexo", "pedigrí", "fenotipo", "genotipo"],
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


SIN_CLASIFICAR = "Sin clasificar"


def _normalizar(texto: str) -> str:
    """Minúsculas y sin tildes, para comparar palabras clave."""
    texto = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in texto if unicodedata.category(c) != "Mn")


def _patron_keyword(kw: str) -> re.Pattern:
    """
    Palabras cortas: palabra exacta ("ojo" no casa con "rojo").
    Palabras largas: prefijo de palabra ("neurona" casa con "neuronas").
    """
    kw_norm = re.escape(_normalizar(kw))
    if len(kw) >= 5:
        return re.compile(rf"\b{kw_norm}")
    return re.compile(rf"\b{kw_norm}\b")


_PATRONES = {
    asignatura: {
        tema: [_patron_keyword(kw) for kw in keywords]
        for tema, keywords in temas.items()
    }
    for asignatura, temas in TAXONOMIA_BIR.items()
}


def clasificar_pregunta(enunciado: str, opciones: list[str]) -> tuple[str, str | None]:
    """
    Asigna asignatura y tema por palabras clave. Las coincidencias en el
    enunciado pesan el doble que en las opciones.
    Si nada encaja devuelve (SIN_CLASIFICAR, None) en lugar de inventarse
    un bloque.
    """
    texto_enunciado = _normalizar(enunciado)
    texto_opciones = _normalizar(" ".join(opciones))

    mejor = (SIN_CLASIFICAR, None)
    max_score = 0

    for asignatura, temas in _PATRONES.items():
        for tema, patrones in temas.items():
            score = sum(
                2 * bool(p.search(texto_enunciado)) + bool(p.search(texto_opciones))
                for p in patrones
            )
            if score > max_score:
                max_score = score
                mejor = (asignatura, tema)

    return mejor


CLASIFICACION_MANUAL = BASE_DIR / "clasificacion_manual.csv"


def cargar_clasificacion_manual() -> dict[tuple[int, int], tuple[str, str]]:
    """
    Clasificación revisada a mano: {(anio, numero): (asignatura, tema)}.
    Tiene prioridad sobre las palabras clave, así que sirve también para
    corregir preguntas mal clasificadas.
    """
    if not CLASIFICACION_MANUAL.exists():
        return {}
    manual: dict[tuple[int, int], tuple[str, str]] = {}
    with open(CLASIFICACION_MANUAL, encoding="utf-8") as f:
        for fila in csv.DictReader(f):
            asignatura, tema = fila["asignatura"], fila["tema"]
            if tema not in TAXONOMIA_BIR.get(asignatura, {}):
                raise ValueError(
                    f"{CLASIFICACION_MANUAL.name}: '{asignatura} / {tema}' "
                    f"({fila['anio']}-{fila['numero']}) no existe en TAXONOMIA_BIR"
                )
            manual[(int(fila["anio"]), int(fila["numero"]))] = (asignatura, tema)
    return manual


_MANUAL = cargar_clasificacion_manual()


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
MARCAS_PORTADA = ("ANTES DE COMENZAR SU EXAMEN", "ADVERTENCIA IMPORTANTE", "NÚMERO DE MESA")

# Distancia vertical (pt) para considerar que dos caracteres van en la misma
# línea. 5 junta subíndices ("O2", "CO2") sin mezclar líneas contiguas.
Y_TOLERANCIA = 5

# Glifos que el PDF no mapea a texto: pdfplumber los devuelve como "(cid:N)".
# Verificados renderizando la página (¡no son αβ, son γδ!).
GLIFOS_SIN_TEXTO = {
    "(cid:2011)": "γ",   # 2015: linfocitos Tγδ
    "(cid:2012)": "δ",
    "(cid:3493)": "√",   # 2025: √(p(1−p)/100)
}
RE_GLIFO = re.compile(r"\(cid:\d+\)")


def _es_portada(texto_pagina: str) -> bool:
    return sum(marca in texto_pagina for marca in MARCAS_PORTADA) >= 2


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
            # La portada trae instrucciones numeradas ("2. Compruebe...")
            # que el parser confundía con la pregunta 1.
            if _es_portada(pagina.extract_text() or ""):
                continue

            width = pagina.width
            height = pagina.height

            # Fuera el texto girado: en 2018 un pie de página vertical
            # ("FSE BIOLOGÍA 2018/19" + código de barras) se colaba en la
            # última pregunta de cada página.
            pagina = pagina.filter(lambda obj: obj.get("upright", True))

            # Extraer las dos columnas separadamente
            col_izq = pagina.crop((0, 0, width / 2, height))
            col_der = pagina.crop((width / 2, 0, width, height))

            # Con la tolerancia por defecto (3) los subíndices y
            # superíndices salían en una línea aparte: "O y CO inspirados. 2 2"
            texto_izq = col_izq.extract_text(y_tolerance=Y_TOLERANCIA) or ""
            texto_der = col_der.extract_text(y_tolerance=Y_TOLERANCIA) or ""

            # Concatenar columna izquierda + derecha con separador de línea
            texto_pagina = texto_izq.strip() + "\n" + texto_der.strip()
            if texto_pagina.strip():
                texto_paginas.append(texto_pagina)

    texto_total = "\n".join(texto_paginas)
    if not texto_total.strip():
        log.warning("  El PDF '%s' parece estar escaneado sin OCR — se omite.", ruta_pdf.name)
        return ""
    return texto_total


# Líneas de maquetación que no forman parte de ninguna pregunta
RE_LINEA_RUIDO = re.compile(
    # "Página: 3", "Pagina: 3" (la tilde se pierde al juntar líneas), "3 de 20", "- 3 -",
    # y el pie "FSE BIOLOGÍA 2020/21", que al ir centrado se parte entre las
    # dos columnas en "FSE BIOLOG" + "GÍA 2020/21"
    r"^(?:P[aá]gina:?(?:\s*\d+)?|\d+\s+de\s+\d+|-?\s*\d+\s*-?"
    r"|FSE\s+BIOLOG\w*(?:\s+\d{4}/\d{2})?|\w{0,4}ÍA\s+\d{4}/\d{2})$",
    re.IGNORECASE
)
RE_LINEA_NUMERADA = re.compile(r"^(\d{1,4})\.+\s+(.*)$")


def _es_numero_corrupto(token: str, esperado: int) -> bool:
    """
    Algún PDF trae el número de pregunta con un carácter duplicado por
    la negrita simulada ("1317.." en lugar de "137.").
    """
    objetivo = str(esperado)
    return len(token) == len(objetivo) + 1 and any(
        token[:i] + token[i + 1:] == objetivo for i in range(len(token))
    )


def parsear_preguntas_texto(texto: str, anio: int) -> list[dict]:
    """
    Parsea el texto del PDF (ya separado por columnas) y extrae las preguntas.

    Formato real en los cuadernillos BIR (opciones numeradas 1-4, no A-D):
        <número>. <enunciado multilinea>
        1. <opción 1>
        2. <opción 2>
        3. <opción 3>
        4. <opción 4>

    Es un parser secuencial: sólo acepta la opción k+1 después de la k, y
    sólo abre una pregunta nueva tras la opción 4 y con un número mayor que
    el actual. Así un "0." o un "2." dentro de un texto no se confunden con
    el inicio de otra pregunta.

    Devuelve lista de dicts con claves:
        num, enunciado, opcion_1, opcion_2, opcion_3, opcion_4
    """
    lineas = [l.strip() for l in texto.splitlines()]
    lineas = [l for l in lineas if l and not RE_LINEA_RUIDO.match(l)]

    preguntas: list[dict] = []
    actual: dict | None = None   # {"num": int, "partes": {campo: [líneas]}, "campo": ...}

    def cerrar(pregunta: dict) -> None:
        partes = {k: _limpiar("\n".join(v)) for k, v in pregunta["partes"].items()}
        campos = ["enunciado", 1, 2, 3, 4]
        if not all(partes.get(c) for c in campos):
            log.warning("  [%d] Pregunta %d: datos incompletos — se omite.", anio, pregunta["num"])
            return
        if any(len(partes[c]) > 600 for c in (1, 2, 3, 4)):
            log.warning("  [%d] Pregunta %d: opción demasiado larga, posible error de parseo — se omite.",
                        anio, pregunta["num"])
            return
        preguntas.append({
            "num": pregunta["num"],
            "enunciado": partes["enunciado"],
            "opcion_1": partes[1],
            "opcion_2": partes[2],
            "opcion_3": partes[3],
            "opcion_4": partes[4],
        })

    for linea in lineas:
        m = RE_LINEA_NUMERADA.match(linea)
        n = int(m.group(1)) if m else None
        resto = m.group(2) if m else linea

        if actual is None:
            # Esperando la primera pregunta
            if n is not None and 1 <= n <= 5:
                actual = {"num": n, "partes": {"enunciado": [resto]}, "campo": "enunciado"}
            continue

        campo = actual["campo"]
        siguiente_opcion = 1 if campo == "enunciado" else (campo + 1 if campo < 4 else None)

        if n is not None and n == siguiente_opcion:
            actual["campo"] = n
            actual["partes"][n] = [resto]
        elif n is not None and campo == 4 and (
            actual["num"] < n <= actual["num"] + 5
            or _es_numero_corrupto(m.group(1), actual["num"] + 1)
        ):
            if not actual["num"] < n <= actual["num"] + 5:
                n = actual["num"] + 1
            cerrar(actual)
            actual = {"num": n, "partes": {"enunciado": [resto]}, "campo": "enunciado"}
        else:
            actual["partes"][campo].append(linea)

    if actual is not None:
        cerrar(actual)

    return preguntas


def _limpiar(texto: str) -> str:
    """Normaliza espacios y saltos de línea dentro de un fragmento de texto."""
    # Deshacer el guionado de fin de línea: "nega-\ntivo" → "negativo".
    # Sólo si sigue una minúscula, para respetar "IL-\n2" o "anti-\nHIV".
    texto = re.sub(r"([a-záéíóúüñ])-[ \t]*\n\s*([a-záéíóúüñ])", r"\1\2", texto)
    # Glifos sin texto en el PDF
    for glifo, caracter in GLIFOS_SIN_TEXTO.items():
        texto = texto.replace(glifo, caracter)
    for desconocido in set(RE_GLIFO.findall(texto)):
        log.warning("  Glifo sin mapear %s en: %s… (añádelo a GLIFOS_SIN_TEXTO)", desconocido, texto[:60])
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

        opciones = [p["opcion_1"], p["opcion_2"], p["opcion_3"], p["opcion_4"]]
        asignatura, tema = _MANUAL.get((anio, num)) or clasificar_pregunta(p["enunciado"], opciones)
        filas.append({
            "anio": anio,
            "numero": num,
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
        "anio", "numero", "asignatura", "tema", "enunciado",
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
    log.info("  1. Revisa las filas con asignatura '%s' si quieres afinar el clasificador.", SIN_CLASIFICAR)
    log.info("  2. Genera el SQL de importación (conserva los ids y el historial):")
    log.info("     python generar_sql_importacion.py")
    log.info("  3. Ejecuta importar_preguntas.sql en Supabase → SQL Editor.")


if __name__ == "__main__":
    main()
