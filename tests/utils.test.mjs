import assert from "node:assert/strict";
import { test } from "node:test";

// Node ejecuta el .ts directamente (type stripping)
import {
  formatearTiempo,
  hoyMadrid,
  porcentaje,
  rachaVigente,
  rutaInternaSegura,
  sumarDias,
} from "../src/lib/utils.ts";

test("formatearTiempo", () => {
  assert.equal(formatearTiempo(0), "00:00");
  assert.equal(formatearTiempo(65), "01:05");
  assert.equal(formatearTiempo(4 * 3600 + 30 * 60), "4:30:00");
  assert.equal(formatearTiempo(-5), "00:00");
});

test("hoyMadrid usa el día de España, no el de UTC", () => {
  // 23:30 UTC del 21 de junio = 01:30 del 22 en Madrid (verano, UTC+2)
  assert.equal(hoyMadrid(new Date("2026-06-21T23:30:00Z")), "2026-06-22");
  // 22:30 UTC del 21 de diciembre = 23:30 del 21 en Madrid (invierno, UTC+1)
  assert.equal(hoyMadrid(new Date("2026-12-21T22:30:00Z")), "2026-12-21");
});

test("sumarDias cruza meses y años", () => {
  assert.equal(sumarDias("2026-01-31", 1), "2026-02-01");
  assert.equal(sumarDias("2026-12-31", 6), "2027-01-06");
  assert.equal(sumarDias("2026-03-01", -1), "2026-02-28");
});

test("rutaInternaSegura evita redirecciones abiertas", () => {
  assert.equal(rutaInternaSegura("/fallos"), "/fallos");
  assert.equal(rutaInternaSegura("/simulacros/oficial/2023?x=1"), "/simulacros/oficial/2023?x=1");
  assert.equal(rutaInternaSegura("//evil.com"), "/dashboard");
  assert.equal(rutaInternaSegura("/\\evil.com"), "/dashboard");
  assert.equal(rutaInternaSegura("https://evil.com"), "/dashboard");
  assert.equal(rutaInternaSegura("/login?next=/x"), "/dashboard");
  assert.equal(rutaInternaSegura(null), "/dashboard");
});

test("rachaVigente se rompe si no se estudió ni hoy ni ayer", () => {
  const hoy = hoyMadrid();
  assert.equal(rachaVigente({ racha_actual: 5, ultimo_estudio: hoy }), 5);
  assert.equal(rachaVigente({ racha_actual: 5, ultimo_estudio: sumarDias(hoy, -1) }), 5);
  assert.equal(rachaVigente({ racha_actual: 5, ultimo_estudio: sumarDias(hoy, -2) }), 0);
  assert.equal(rachaVigente(null), 0);
});

test("porcentaje", () => {
  assert.equal(porcentaje(1, 3), 33);
  assert.equal(porcentaje(0, 0), null);
});
