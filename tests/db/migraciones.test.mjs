import assert from "node:assert/strict";
import { before, describe, test } from "node:test";

import { comoUsuario, crearBD, CSV_PREGUNTAS, filasCsv, mensajeDeError, U1, U2 } from "./harness.mjs";

const ANIOS_CSV = new Set(filasCsv(CSV_PREGUNTAS).map((l) => l.split(",")[0])).size;

let db;
const q = async (sql, params) => (await db.query(sql, params)).rows;
const comoU1 = (fn) => comoUsuario(db, U1, fn);

before(async () => {
  db = await crearBD();
});

describe("consolidación del esquema remoto", () => {
  test("sustituye las políticas permisivas de apuntes y del bucket", async () => {
    assert.equal((await q(`select count(*)::int n from pg_policies where tablename = 'apuntes_archivos'`))[0].n, 1);
    const politicas = (await q(`select policyname from pg_policies where schemaname = 'storage'`)).map((p) => p.policyname);
    assert.ok(!politicas.includes("Give users access to biblioteca"));
    assert.equal(politicas.length, 4);
    assert.equal((await q(`select public from storage.buckets where id = 'biblioteca'`))[0].public, false);
  });

  test("desbloquea los hitos ya conseguidos", async () => {
    const hitos = await q(`select clave from public.hitos_pareja where user_id = $1 and desbloqueado order by clave`, [U1]);
    assert.deepEqual(hitos.map((h) => h.clave), ["primer_simulacro", "racha_3", "racha_7", "test_perfecto"]);
  });
});

describe("seguridad", () => {
  test("la respuesta correcta no es legible desde el cliente", async () => {
    await comoU1(async () => {
      assert.match(await mensajeDeError(q(`select respuesta_correcta from public.preguntas limit 1`)), /permission denied/);
      assert.match(await mensajeDeError(q(`select * from public.preguntas limit 1`)), /permission denied/);
      assert.equal((await q(`select id, enunciado, tema, numero from public.preguntas limit 1`)).length, 1);
      const [p] = await q(`select * from public.obtener_preguntas_aleatorias(1)`);
      assert.ok(!("respuesta_correcta" in p));
    });
  });

  test("sesiones y fallos sólo los escribe finalizar_test", async () => {
    await comoU1(async () => {
      assert.match(
        await mensajeDeError(q(`insert into public.sesiones_estudio (user_id, modo, total_preguntas, aciertos, fallos, blancas, puntuacion) values ($1, 'rapido', 1, 1, 0, 0, 3)`, [U1])),
        /row-level security/
      );
      assert.match(
        await mensajeDeError(q(`insert into public.historial_fallos (user_id, pregunta_id, respuesta_usuario) values ($1, 1, 1)`, [U1])),
        /row-level security/
      );
    });
  });

  test("anon no puede ejecutar las RPC", async () => {
    await db.exec(`set role anon`);
    try {
      assert.match(await mensajeDeError(q(`select * from public.obtener_preguntas_aleatorias(1)`)), /permission denied/);
      assert.match(await mensajeDeError(q(`select public.finalizar_test('rapido', null, '[{"pregunta_id":1,"respuesta":1}]')`)), /permission denied/);
    } finally {
      await db.exec(`reset role`);
    }
  });

  test("evaluar_hitos_de es interna", async () => {
    await comoU1(async () => {
      assert.match(await mensajeDeError(q(`select public.evaluar_hitos_de($1)`, [U2])), /permission denied/);
    });
  });

  test("cada usuario sólo ve lo suyo", async () => {
    await comoUsuario(db, U2, async () => {
      assert.equal((await q(`select count(*)::int n from public.respuestas`))[0].n, 0);
      const fallos = await q(`select pregunta_id from public.obtener_resumen_fallos()`);
      assert.deepEqual(fallos.map((f) => Number(f.pregunta_id)), [9]);
    });
  });
});

describe("tests y caja de fallos", () => {
  test("preguntas por año y por asignatura", async () => {
    await comoU1(async () => {
      assert.equal((await q(`select * from public.obtener_anios()`)).length, ANIOS_CSV);
      assert.ok((await q(`select * from public.obtener_examen(2023)`)).length > 200);
      const asig = await q(`select * from public.obtener_preguntas_por_asignatura('Genética', 5)`);
      assert.ok(asig.length > 0 && asig.every((p) => p.asignatura === "Genética"));
    });
  });

  test("finalizar_test corrige, guarda todo y mueve la caja de fallos", async () => {
    const sol = Object.fromEntries(
      (await q(`select id, respuesta_correcta from public.preguntas where id in (3, 7, 10, 11, 12)`)).map((r) => [r.id, r.respuesta_correcta])
    );
    const mal = (n) => (n % 4) + 1;

    await comoU1(async () => {
      const envio = [
        { pregunta_id: 3, respuesta: sol[3] },        // acierta un fallo antiguo → sale de la caja
        { pregunta_id: 7, respuesta: mal(sol[7]) },   // vuelve a fallar
        { pregunta_id: 10, respuesta: sol[10] },
        { pregunta_id: 11, respuesta: null },         // en blanco
        { pregunta_id: 12, respuesta: mal(sol[12]) },
        { pregunta_id: 12, respuesta: sol[12] },      // repetida: vale la última
        { pregunta_id: 999999, respuesta: 1 },        // no existe: se ignora
      ];
      const [{ r }] = await q(`select public.finalizar_test('rapido', null, $1::jsonb) r`, [JSON.stringify(envio)]);

      assert.deepEqual(
        { aciertos: r.aciertos, fallos: r.fallos, blancas: r.blancas, total: r.total_preguntas, puntuacion: r.puntuacion },
        { aciertos: 3, fallos: 1, blancas: 1, total: 5, puntuacion: 8 }
      );
      assert.equal(r.correctas["7"], sol[7]);
      assert.equal((await q(`select count(*)::int n from public.respuestas where sesion_id = $1`, [r.sesion_id]))[0].n, 5);

      const caja = await q(`select pregunta_id, veces_fallada from public.obtener_resumen_fallos()`);
      assert.deepEqual(caja.map((c) => [Number(c.pregunta_id), Number(c.veces_fallada)]), [[7, 2]]);

      const [racha] = await q(`select racha_actual, ultimo_estudio = public.hoy_madrid() hoy from public.rachas`);
      assert.deepEqual(racha, { racha_actual: 3, hoy: true });
    });
  });

  test("finalizar_test valida y hace rollback", async () => {
    await comoU1(async () => {
      const antes = (await q(`select count(*)::int n from public.sesiones_estudio`))[0].n;
      assert.match(await mensajeDeError(q(`select public.finalizar_test('trampa', null, '[{"pregunta_id":1,"respuesta":1}]')`)), /Modo/);
      assert.match(await mensajeDeError(q(`select public.finalizar_test('rapido', null, '[{"pregunta_id":1,"respuesta":7}]')`)), /check/);
      assert.match(await mensajeDeError(q(`select public.finalizar_test('rapido', null, '[]')`)), /no válida/);
      assert.match(await mensajeDeError(q(`select public.finalizar_test('rapido', null, '[{"pregunta_id":999999,"respuesta":1}]')`)), /existe/);
      assert.equal((await q(`select count(*)::int n from public.sesiones_estudio`))[0].n, antes);
    });
  });

  test("resolver_fallo vacía la caja", async () => {
    await comoU1(async () => {
      await q(`select public.resolver_fallo(7)`);
      assert.equal((await q(`select public.contar_fallos_pendientes() n`))[0].n, 0);
    });
  });

  test("estadísticas por asignatura incluyen las sesiones antiguas", async () => {
    await comoU1(async () => {
      const stats = await q(`select * from public.obtener_stats_por_asignatura()`);
      const genetica = stats.find((s) => s.asignatura === "Genética");
      assert.ok(genetica && Number(genetica.total) >= 20);
      assert.equal(stats.reduce((acc, s) => acc + Number(s.total), 0), 25);
      assert.ok((await q(`select * from public.obtener_fallos_por_tema()`)).length > 0);
    });
  });
});

describe("flashcards e hitos", () => {
  test("pendientes según el día de España", async () => {
    await comoU1(async () => {
      await q(`insert into public.flashcards (user_id, frente, dorso) values ($1, 'a', 'b'), ($1, 'c', 'd')`, [U1]);
      await q(`update public.flashcards set proxima_vez = public.hoy_madrid() + 3 where frente = 'c'`);
      assert.equal((await q(`select public.contar_flashcards_pendientes() n`))[0].n, 1);
      assert.equal((await q(`select * from public.obtener_flashcards_pendientes(10)`)).length, 1);
    });
  });

  test("inicializar_hitos_pareja es idempotente", async () => {
    await comoU1(async () => {
      await q(`select public.inicializar_hitos_pareja()`);
      assert.equal((await q(`select count(*)::int n from public.hitos_pareja`))[0].n, 8);
    });
  });
});
