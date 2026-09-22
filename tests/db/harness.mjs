// Banco de pruebas de la base de datos: aplica las migraciones sobre PGlite
// (Postgres en WebAssembly) con stubs mínimos de lo que aporta Supabase
// (auth.uid(), roles, storage). No necesita Docker ni conexión.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const MIGRACIONES = `${RAIZ}supabase/migrations/`;
export const CSV_PREGUNTAS = `${RAIZ}supabase/pdf-fuente/preguntas_extraidas.csv`;

export const U1 = "11111111-1111-1111-1111-111111111111";
export const U2 = "22222222-2222-2222-2222-222222222222";

const FIN_DE_LINEA = /\r?\n/;

/** Filas de datos (sin cabecera) de un CSV sencillo. */
export function filasCsv(ruta) {
  return readFileSync(ruta, "utf8").split(FIN_DE_LINEA).slice(1).filter(Boolean);
}

const STUBS_SUPABASE = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema storage to authenticated;
  -- Privilegios por defecto como en Supabase
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  insert into auth.users values ('${U1}', 'opositora@test.com'), ('${U2}', 'otra@test.com');
`;

// Estado que la BD remota tenía antes de la 005 sin estar en el repo
const ESTADO_REMOTO_PREVIO = `
  alter table public.preguntas add column tema text;
  create table public.apuntes_archivos (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id),
    nombre text not null, storage_path text not null,
    created_at timestamptz not null default now());
  alter table public.apuntes_archivos enable row level security;
  create policy "permisiva vieja" on public.apuntes_archivos for all to authenticated using (true);
  insert into storage.buckets values ('biblioteca', 'biblioteca', true, null, null);
  create policy "Give users access to biblioteca" on storage.objects
    for select to authenticated using (bucket_id = 'biblioteca');
`;

function migracion(nombre) {
  return readFileSync(MIGRACIONES + nombre, "utf8")
    // PGlite trae gen_random_uuid() de serie
    .replace("create extension if not exists pgcrypto;", "");
}

/**
 * BD con las migraciones 001-004, el estado remoto previo, el banco de
 * preguntas del CSV (sin su número oficial, como estaba antes de la 005),
 * algo de actividad de usuario y, al final, el resto de migraciones (005+).
 */
export async function crearBD({ csv = CSV_PREGUNTAS } = {}) {
  const db = new PGlite();
  await db.exec(STUBS_SUPABASE);

  const nombres = readdirSync(MIGRACIONES).filter((f) => f.endsWith(".sql")).sort();
  const previas = nombres.filter((n) => n < "005");
  const nuevas = nombres.filter((n) => n >= "005");

  for (const n of previas) await db.exec(migracion(n));
  await db.exec(ESTADO_REMOTO_PREVIO);

  // Admite el CSV actual y el antiguo (sin columna "numero")
  const contenido = readFileSync(csv);
  const cabecera = contenido.toString("utf8").split(FIN_DE_LINEA, 1)[0].split(",");
  const tipos = { anio: "int", numero: "smallint", respuesta_correcta: "smallint" };
  await db.exec(`create temp table _csv (${cabecera.map((c) => `${c} ${tipos[c] ?? "text"}`).join(", ")})`);
  await db.query(`copy _csv from '/dev/blob' with (format csv, header true)`, [], {
    blob: new Blob([contenido]),
  });
  await db.exec(`insert into public.preguntas
      (anio, asignatura, tema, enunciado, opcion_1, opcion_2, opcion_3, opcion_4, respuesta_correcta)
    select anio, asignatura, tema, enunciado, opcion_1, opcion_2, opcion_3, opcion_4, respuesta_correcta
    from _csv order by anio${cabecera.includes("numero") ? ", numero" : ""}`);
  await db.exec(`drop table _csv`);

  await db.exec(`
    insert into public.sesiones_estudio (user_id, modo, asignatura, total_preguntas, aciertos, fallos, blancas, puntuacion)
      values ('${U1}', 'asignatura', 'Genética', 20, 12, 5, 3, 31),
             ('${U1}', 'rapido', null, 10, 10, 0, 0, 30);
    insert into public.historial_fallos (user_id, pregunta_id, respuesta_usuario)
      values ('${U1}', 3, 1), ('${U1}', 3, 2), ('${U1}', 7, 4), ('${U2}', 9, 1);
    insert into public.rachas values ('${U1}', 2, 8, current_date - 1, now());
    select public.inicializar_hitos_pareja('${U1}');
  `);

  for (const n of nuevas) await db.exec(migracion(n));
  return db;
}

/** Ejecuta `fn` como el rol `authenticated` con la sesión de `uid`. */
export async function comoUsuario(db, uid, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

/** Devuelve el mensaje de error de la promesa, o null si no falla. */
export async function mensajeDeError(promesa) {
  try {
    await promesa;
    return null;
  } catch (e) {
    return e.message;
  }
}
