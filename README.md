# BIR Prep

Plataforma personal para preparar el BIR: simulacros con exámenes reales,
caja de fallos, flashcards con repetición espaciada (SM-2), apuntes en PDF
con generación de flashcards por IA, Pomodoro y panel de pareja.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · Supabase (Auth,
Postgres con RLS, Storage) · Tailwind CSS 3 · PWA.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # y rellena las claves
npm run dev
```

Variables (ver [.env.example](.env.example)):

| Variable | Para qué |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Conexión a Supabase |
| `GEMINI_API_KEY` y/o `GROQ_API_KEY` | Flashcards con IA desde los apuntes (Gemini y, si falla, Groq) |
| `GEMINI_MODEL`, `GROQ_MODEL` | Opcional: cambiar de modelo cuando el proveedor retire el actual |

No hay registro público: los usuarios se crean desde el dashboard de
Supabase (Authentication → Users).

## Base de datos

El esquema está en [`supabase/migrations/`](supabase/migrations). Todo lo que
exista en la BD debe estar en una migración: nada de crear tablas o
políticas a mano desde el dashboard.

```bash
npx supabase link --project-ref <ref>   # una vez
npx supabase db push                     # aplica las migraciones pendientes
npm run db:types                         # regenera src/types/database.types.ts
```

Piezas clave:

- **`finalizar_test`** corrige un test y guarda respuestas, fallos, sesión y
  racha en una sola transacción. La respuesta correcta no es legible desde
  el cliente (privilegios por columna); la nota la calcula siempre la BD.
- **Caja de fallos:** una pregunta sale al acertarla (o con «Ya la domino»).
- Las fechas de rachas y repasos usan el día de España (`hoy_madrid()`).
- Los hitos del panel de pareja se desbloquean solos (`evaluar_hitos`).

## Banco de preguntas

Los cuadernillos oficiales y sus respuestas están en
[`supabase/pdf-fuente/`](supabase/pdf-fuente): 2105 preguntas de los
exámenes 2015–2025 (sin las anuladas). Para (re)generar el banco:

```bash
cd supabase/pdf-fuente
pip install -r requirements.txt
python respuestas_pdf_a_txt.py      # plantillas de respuestas en PDF (2015–2020) → .txt
python extractor.py                 # PDFs → preguntas_extraidas.csv
python generar_sql_importacion.py   # CSV → importar_preguntas.sql
```

Después ejecuta `importar_preguntas.sql` (Supabase → SQL Editor, o
`npx supabase db query --linked -f supabase/pdf-fuente/importar_preguntas.sql`).
El SQL conserva los ids existentes (no se pierde el historial de fallos), es
idempotente y requiere la migración 005.

Clasificación: cada pregunta va a uno de los 8 bloques de
[`src/lib/asignaturas.ts`](src/lib/asignaturas.ts). Primero se aplica
[`clasificacion_manual.csv`](supabase/pdf-fuente/clasificacion_manual.csv)
(revisada a mano; sirve también para corregir cualquier pregunta) y, si no
está ahí, las palabras clave del extractor.

Los exámenes de 2010–2014 no se incluyen: tenían 5 opciones y el esquema
admite 4 (además su fórmula de corrección era distinta). No hay examen de
2019 en la carpeta.

## Scripts

| Comando | |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` | ESLint (flat config, reglas de Next y del React Compiler) |
| `npm run typecheck` | TypeScript sin emitir |
| `npm test` | Tests de utilidades, migraciones SQL e importador de preguntas (Postgres en WASM con PGlite, sin Docker) |
| `npm run db:types` | Tipos de la BD desde el proyecto enlazado |

La CI de GitHub ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) pasa
lint, tipos, tests y build en cada push.

## Estructura

```
src/
  app/(auth)/     landing y login (públicas)
  app/(app)/      resto de pantallas (requieren sesión)
  components/     UI por módulo
  lib/actions/    server actions (siempre con requireUser)
  lib/auth.ts     requireUser(): sesión cacheada por petición
  proxy.ts        renueva la sesión y redirige al login
tests/            utilidades y migraciones (tests/db usa PGlite)
supabase/
  migrations/     esquema, RLS y funciones
  pdf-fuente/     PDFs oficiales, extractor e importador
public/sw.js      service worker (sólo cachea estáticos)
```
