"""
generar_sql_importacion.py — CSV → SQL de actualización de `preguntas`
=====================================================================
Genera `importar_preguntas.sql`, que actualiza el banco de preguntas de
Supabase con el CSV del extractor SIN cambiar los ids existentes (así no se
pierde el historial de fallos ni las respuestas de los usuarios).

Requiere la migración 005 (columna `preguntas.numero`).

Estrategia del SQL generado (todo en una transacción):
  1. Las filas antiguas sin `numero` se emparejan con las nuevas por año +
     texto normalizado de las opciones 1-3 (sin espacios, guiones ni
     signos, así "nega- tivo" y "negativo" coinciden).
  2. Se actualiza el contenido de todas las filas emparejadas por
     (anio, numero): enunciado, opciones, asignatura, tema y solución.
  3. Se insertan las preguntas nuevas.
  4. Se borran las filas antiguas que no se han podido emparejar (la
     basura de la portada y duplicados del parser antiguo).

Uso:
    python extractor.py                 # regenera preguntas_extraidas.csv
    python generar_sql_importacion.py   # genera importar_preguntas.sql
    → pega el SQL en Supabase (SQL Editor) y ejecútalo.
"""

import csv
from pathlib import Path

BASE_DIR = Path(__file__).parent
CSV_ENTRADA = BASE_DIR / "preguntas_extraidas.csv"
SQL_SALIDA = BASE_DIR / "importar_preguntas.sql"

COLUMNAS = [
    "anio", "numero", "asignatura", "tema", "enunciado",
    "opcion_1", "opcion_2", "opcion_3", "opcion_4", "respuesta_correcta",
]
NUMERICAS = {"anio", "numero", "respuesta_correcta"}


def literal(columna: str, valor: str) -> str:
    if valor == "" and columna == "tema":
        return "null"
    if columna in NUMERICAS:
        return str(int(valor))
    return "'" + valor.replace("'", "''") + "'"


def main() -> None:
    with open(CSV_ENTRADA, encoding="utf-8") as f:
        filas = list(csv.DictReader(f))

    faltan = [c for c in COLUMNAS if c not in filas[0]]
    if faltan:
        raise SystemExit(f"El CSV no tiene las columnas {faltan}. Regenera el CSV con extractor.py.")

    valores = ",\n".join(
        "(" + ", ".join(literal(c, fila[c]) for c in COLUMNAS) + ")" for fila in filas
    )

    sql = f"""-- Generado por generar_sql_importacion.py a partir de {CSV_ENTRADA.name}
-- {len(filas)} preguntas. Ejecutar DESPUÉS de la migración 005.

begin;

create temp table _nuevas (
  anio integer, numero smallint, asignatura text, tema text, enunciado text,
  opcion_1 text, opcion_2 text, opcion_3 text, opcion_4 text,
  respuesta_correcta smallint
) on commit drop;

insert into _nuevas ({", ".join(COLUMNAS)}) values
{valores};

create or replace function pg_temp.clave(a text, b text, c text) returns text
language sql immutable as $$
  select regexp_replace(lower(a || b || c), '[^[:alnum:]]', '', 'g')
$$;

create or replace function pg_temp.letras(t text) returns text
language sql immutable as $$
  select left(regexp_replace(lower(t), '[^[:alpha:]]', '', 'g'), 120)
$$;

-- 1. Emparejar filas antiguas (sin numero) por año + opciones 1-3
with candidatos as (
  select p.id, n.anio, n.numero
  from public.preguntas p
  join _nuevas n
    on n.anio = p.anio
   and pg_temp.clave(n.opcion_1, n.opcion_2, n.opcion_3)
     = pg_temp.clave(p.opcion_1, p.opcion_2, p.opcion_3)
  where p.numero is null
    and not exists (
      select 1 from public.preguntas ya
      where ya.anio = n.anio and ya.numero = n.numero
    )
),
unicos as (
  select c.* from candidatos c
  where (select count(*) from candidatos x where x.id = c.id) = 1
    and (select count(*) from candidatos x where x.anio = c.anio and x.numero = c.numero) = 1
)
update public.preguntas p
set numero = u.numero
from unicos u
where p.id = u.id;

-- 1b. Segunda pasada para las que quedan: por el enunciado, sólo letras
--     (el parser antiguo metía los subíndices en medio del texto).
with candidatos as (
  select p.id, n.anio, n.numero
  from public.preguntas p
  join _nuevas n
    on n.anio = p.anio
   and pg_temp.letras(n.enunciado) = pg_temp.letras(p.enunciado)
  where p.numero is null
    and not exists (
      select 1 from public.preguntas ya
      where ya.anio = n.anio and ya.numero = n.numero
    )
),
unicos as (
  select c.* from candidatos c
  where (select count(*) from candidatos x where x.id = c.id) = 1
    and (select count(*) from candidatos x where x.anio = c.anio and x.numero = c.numero) = 1
)
update public.preguntas p
set numero = u.numero
from unicos u
where p.id = u.id;

-- 2. Actualizar el contenido de las emparejadas
update public.preguntas p
set asignatura = n.asignatura,
    tema = n.tema,
    enunciado = n.enunciado,
    opcion_1 = n.opcion_1,
    opcion_2 = n.opcion_2,
    opcion_3 = n.opcion_3,
    opcion_4 = n.opcion_4,
    respuesta_correcta = n.respuesta_correcta
from _nuevas n
where p.anio = n.anio and p.numero = n.numero;

-- 3. Insertar las que no existían
insert into public.preguntas
  (anio, numero, asignatura, tema, enunciado, opcion_1, opcion_2, opcion_3, opcion_4, respuesta_correcta)
select n.anio, n.numero, n.asignatura, n.tema, n.enunciado,
       n.opcion_1, n.opcion_2, n.opcion_3, n.opcion_4, n.respuesta_correcta
from _nuevas n
where not exists (
  select 1 from public.preguntas p where p.anio = n.anio and p.numero = n.numero
);

-- 4. Borrar las antiguas que no corresponden a ninguna pregunta real
delete from public.preguntas p
where p.numero is null
  and p.anio in (select distinct anio from _nuevas);

select anio, count(*) as preguntas from public.preguntas group by anio order by anio;

commit;
"""
    SQL_SALIDA.write_text(sql, encoding="utf-8")
    print(f"Generado {SQL_SALIDA} ({len(filas)} preguntas)")


if __name__ == "__main__":
    main()
