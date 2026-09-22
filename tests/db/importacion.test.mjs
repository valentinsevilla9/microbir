import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { before, test } from "node:test";

import { crearBD, CSV_PREGUNTAS, filasCsv } from "./harness.mjs";

// Genera importar_preguntas.sql con el script de Python del repo
const DIR = fileURLToPath(new URL("../../supabase/pdf-fuente/", import.meta.url));
const python = ["python3", "python"].find((cmd) => spawnSync(cmd, ["--version"]).status === 0);

const total = filasCsv(CSV_PREGUNTAS).length;

let db;
let sql;
const q = async (s, p) => (await db.query(s, p)).rows;

before(async () => {
  if (!python) return;
  const gen = spawnSync(python, ["generar_sql_importacion.py"], { cwd: DIR, encoding: "utf8" });
  assert.equal(gen.status, 0, gen.stderr);
  sql = readFileSync(`${DIR}importar_preguntas.sql`, "utf8");
  // Estado previo: el banco cargado sin número oficial (como está en producción)
  db = await crearBD();
});

test("la importación conserva los ids y numera todas las preguntas", { skip: !python && "sin Python" }, async () => {
  const antes = await q(`select id, anio, enunciado from public.preguntas order by id`);
  const fallosAntes = await q(`select pregunta_id from public.historial_fallos order by id`);

  await db.exec(sql);

  const despues = await q(`select id, anio, numero from public.preguntas order by id`);
  assert.equal(despues.length, total);
  assert.ok(despues.every((p) => p.numero !== null));
  // Todas las filas existentes se emparejan: ningún id cambia ni se pierde
  assert.deepEqual(despues.map((p) => p.id), antes.map((p) => p.id));
  assert.deepEqual(await q(`select pregunta_id from public.historial_fallos order by id`), fallosAntes);
});

test("reimportar es idempotente e inserta las que falten", { skip: !python && "sin Python" }, async () => {
  await db.exec(`delete from public.preguntas where id = (select max(id) from public.preguntas)`);
  await db.exec(sql);
  await db.exec(sql);
  const [{ n, distintas }] = await q(
    `select count(*)::int n, count(distinct (anio, numero))::int distintas from public.preguntas`
  );
  assert.equal(n, total);
  assert.equal(distintas, total);
});
