-- ============================================================
-- MIGRACIÓN 005: Consolidación
--
-- 1. Recoge en el repo lo que ya existía sólo en la BD remota
--    (apuntes_archivos, preguntas.tema, bucket "biblioteca").
-- 2. Tabla `respuestas` y corrección atómica con `finalizar_test`:
--    corrige, guarda respuestas, fallos, sesión y racha en una
--    sola transacción. El cliente ya no puede inventarse notas.
-- 3. La respuesta correcta deja de ser legible desde el cliente.
-- 4. Caja de fallos resoluble (una pregunta sale al acertarla).
-- 5. RPCs sin `p_user_id` (usan auth.uid()) y fechas en
--    Europe/Madrid.
-- 6. Hitos de pareja que se desbloquean solos.
-- ============================================================


-- ============================================================
-- Utilidad: fecha de hoy en España
-- ============================================================

create or replace function public.hoy_madrid()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Madrid')::date;
$$;

revoke all on function public.hoy_madrid() from public, anon;
grant execute on function public.hoy_madrid() to authenticated;


-- ============================================================
-- preguntas: columnas que faltaban en el repo + número oficial
-- ============================================================

alter table public.preguntas add column if not exists tema text;
alter table public.preguntas add column if not exists numero smallint;

create unique index if not exists preguntas_anio_numero_key
  on public.preguntas (anio, numero);

create index if not exists preguntas_tema_idx
  on public.preguntas (asignatura, tema);

-- La respuesta correcta sólo la ven las funciones SECURITY DEFINER.
revoke select on public.preguntas from anon, authenticated;
grant select (
  id, anio, numero, asignatura, tema, enunciado,
  opcion_1, opcion_2, opcion_3, opcion_4, created_at
) on public.preguntas to authenticated;


-- ============================================================
-- apuntes_archivos (existía sólo en la BD remota)
-- ============================================================

create table if not exists public.apuntes_archivos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists apuntes_archivos_user_id_idx
  on public.apuntes_archivos (user_id, created_at desc);

alter table public.apuntes_archivos enable row level security;

-- Sustituimos cualquier política creada a mano desde el dashboard.
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'apuntes_archivos'
  loop
    execute format('drop policy %I on public.apuntes_archivos', pol.policyname);
  end loop;
end $$;

create policy "Usuarios gestionan sus apuntes"
on public.apuntes_archivos for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- ============================================================
-- Storage: bucket privado "biblioteca", una carpeta por usuario
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('biblioteca', 'biblioteca', false, 52428800, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') like '%biblioteca%'
           or coalesce(with_check, '') like '%biblioteca%')
  loop
    execute format('drop policy %I on storage.objects', pol.policyname);
  end loop;
end $$;

create policy "biblioteca: leer archivos propios"
on storage.objects for select to authenticated
using (bucket_id = 'biblioteca' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "biblioteca: subir archivos propios"
on storage.objects for insert to authenticated
with check (bucket_id = 'biblioteca' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "biblioteca: modificar archivos propios"
on storage.objects for update to authenticated
using (bucket_id = 'biblioteca' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'biblioteca' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "biblioteca: borrar archivos propios"
on storage.objects for delete to authenticated
using (bucket_id = 'biblioteca' and (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================================
-- historial_fallos: resolubles y sólo escribibles por el servidor
-- ============================================================

alter table public.historial_fallos
  add column if not exists resuelto boolean not null default false;

create index if not exists historial_fallos_pendientes_idx
  on public.historial_fallos (user_id, pregunta_id)
  where not resuelto;

drop policy if exists "Usuarios pueden insertar sus fallos" on public.historial_fallos;


-- ============================================================
-- sesiones_estudio: sólo las escribe finalizar_test
-- ============================================================

drop policy if exists "Usuarios pueden insertar sus sesiones" on public.sesiones_estudio;


-- ============================================================
-- TABLA: respuestas (todas, no sólo los fallos)
-- ============================================================

create table if not exists public.respuestas (
  id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sesion_id bigint references public.sesiones_estudio(id) on delete cascade,
  pregunta_id bigint not null references public.preguntas(id) on delete cascade,
  respuesta smallint,           -- null = en blanco
  correcta boolean,             -- null = en blanco
  created_at timestamptz not null default now(),

  constraint respuestas_respuesta_check
    check (respuesta between 1 and 4)
);

create index if not exists respuestas_user_idx
  on public.respuestas (user_id, created_at desc);

create index if not exists respuestas_user_pregunta_idx
  on public.respuestas (user_id, pregunta_id);

create index if not exists respuestas_sesion_idx
  on public.respuestas (sesion_id);

alter table public.respuestas enable row level security;

drop policy if exists "Usuarios pueden ver sus respuestas" on public.respuestas;
create policy "Usuarios pueden ver sus respuestas"
on public.respuestas for select to authenticated
using (auth.uid() = user_id);


-- ============================================================
-- Funciones antiguas que cambian de firma o desaparecen
-- ============================================================

drop function if exists public.corregir_test(jsonb);
drop function if exists public.obtener_preguntas_aleatorias(integer);
drop function if exists public.obtener_preguntas_por_asignatura(text, integer);
drop function if exists public.obtener_preguntas_de_fallos(uuid, integer);
drop function if exists public.obtener_resumen_fallos(uuid);
drop function if exists public.obtener_flashcards_pendientes(uuid, integer);
drop function if exists public.inicializar_hitos_pareja(uuid);
drop function if exists public.obtener_stats_por_asignatura(uuid);


-- ============================================================
-- Preguntas para los tests (sin respuesta correcta)
-- ============================================================

create function public.obtener_preguntas_aleatorias(
  cantidad integer default 10
)
returns table (
  id bigint, anio integer, numero smallint, asignatura text, tema text,
  enunciado text, opcion_1 text, opcion_2 text, opcion_3 text, opcion_4 text
)
language sql
volatile
security invoker
set search_path = public
as $$
  select p.id, p.anio, p.numero, p.asignatura, p.tema, p.enunciado,
         p.opcion_1, p.opcion_2, p.opcion_3, p.opcion_4
  from public.preguntas p
  order by random()
  limit greatest(1, least(cantidad, 250));
$$;


create function public.obtener_preguntas_por_asignatura(
  p_asignatura text,
  cantidad integer default 20
)
returns table (
  id bigint, anio integer, numero smallint, asignatura text, tema text,
  enunciado text, opcion_1 text, opcion_2 text, opcion_3 text, opcion_4 text
)
language sql
volatile
security invoker
set search_path = public
as $$
  select p.id, p.anio, p.numero, p.asignatura, p.tema, p.enunciado,
         p.opcion_1, p.opcion_2, p.opcion_3, p.opcion_4
  from public.preguntas p
  where p.asignatura = p_asignatura
  order by random()
  limit greatest(1, least(cantidad, 250));
$$;


-- Examen completo de un año, en el orden oficial.
create function public.obtener_examen(
  p_anio integer
)
returns table (
  id bigint, anio integer, numero smallint, asignatura text, tema text,
  enunciado text, opcion_1 text, opcion_2 text, opcion_3 text, opcion_4 text
)
language sql
stable
security invoker
set search_path = public
as $$
  select p.id, p.anio, p.numero, p.asignatura, p.tema, p.enunciado,
         p.opcion_1, p.opcion_2, p.opcion_3, p.opcion_4
  from public.preguntas p
  where p.anio = p_anio
  order by p.numero nulls last, p.id
  limit 250;
$$;


create function public.obtener_anios()
returns table (anio integer, total bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select p.anio, count(*) as total
  from public.preguntas p
  group by p.anio
  order by p.anio desc;
$$;


-- ============================================================
-- Caja de fallos (sólo preguntas no resueltas)
-- ============================================================

create function public.obtener_preguntas_de_fallos(
  cantidad integer default 20
)
returns table (
  id bigint, anio integer, numero smallint, asignatura text, tema text,
  enunciado text, opcion_1 text, opcion_2 text, opcion_3 text, opcion_4 text,
  veces_fallada bigint
)
language sql
volatile
security invoker
set search_path = public
as $$
  select p.id, p.anio, p.numero, p.asignatura, p.tema, p.enunciado,
         p.opcion_1, p.opcion_2, p.opcion_3, p.opcion_4,
         count(hf.id) as veces_fallada
  from public.historial_fallos hf
  inner join public.preguntas p on p.id = hf.pregunta_id
  where hf.user_id = auth.uid()
  group by p.id
  having bool_or(not hf.resuelto)
  order by veces_fallada desc, random()
  limit greatest(1, least(cantidad, 250));
$$;


create function public.obtener_resumen_fallos()
returns table (
  pregunta_id bigint,
  enunciado text,
  asignatura text,
  veces_fallada bigint,
  ultima_vez timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select p.id as pregunta_id, p.enunciado, p.asignatura,
         count(hf.id) as veces_fallada,
         max(hf.created_at) as ultima_vez
  from public.historial_fallos hf
  inner join public.preguntas p on p.id = hf.pregunta_id
  where hf.user_id = auth.uid()
  group by p.id, p.enunciado, p.asignatura
  having bool_or(not hf.resuelto)
  order by veces_fallada desc, ultima_vez desc;
$$;


create function public.contar_fallos_pendientes()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(distinct hf.pregunta_id)::integer
  from public.historial_fallos hf
  where hf.user_id = auth.uid() and not hf.resuelto;
$$;


-- Sacar a mano una pregunta de la caja de fallos.
create function public.resolver_fallo(
  p_pregunta_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  update public.historial_fallos
  set resuelto = true
  where user_id = auth.uid()
    and pregunta_id = p_pregunta_id
    and not resuelto;
end;
$$;


-- ============================================================
-- Flashcards
-- ============================================================

alter table public.flashcards
  alter column proxima_vez set default public.hoy_madrid();

create function public.obtener_flashcards_pendientes(
  cantidad integer default 50
)
returns table (
  id bigint, frente text, dorso text, asignatura text,
  intervalo integer, facilidad numeric, repeticiones integer,
  proxima_vez date, created_at timestamptz, updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select f.id, f.frente, f.dorso, f.asignatura,
         f.intervalo, f.facilidad, f.repeticiones, f.proxima_vez,
         f.created_at, f.updated_at
  from public.flashcards f
  where f.user_id = auth.uid()
    and f.proxima_vez <= public.hoy_madrid()
  order by f.proxima_vez asc, f.id asc
  limit greatest(1, least(cantidad, 200));
$$;


create function public.contar_flashcards_pendientes()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::integer
  from public.flashcards f
  where f.user_id = auth.uid()
    and f.proxima_vez <= public.hoy_madrid();
$$;


-- ============================================================
-- Estadísticas
-- ============================================================

-- Precisión por asignatura. Usa todas las respuestas (cualquier modo)
-- y, para las sesiones anteriores a esta migración (sin respuestas
-- individuales), los totales de los tests por asignatura.
create function public.obtener_stats_por_asignatura()
returns table (
  asignatura text,
  total bigint,
  aciertos bigint,
  fallos bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with datos as (
    select p.asignatura,
           1 as total,
           case when r.correcta then 1 else 0 end as aciertos,
           case when r.correcta = false then 1 else 0 end as fallos
    from public.respuestas r
    inner join public.preguntas p on p.id = r.pregunta_id
    where r.user_id = auth.uid()

    union all

    select s.asignatura, s.total_preguntas, s.aciertos, s.fallos
    from public.sesiones_estudio s
    where s.user_id = auth.uid()
      and s.modo = 'asignatura'
      and s.asignatura is not null
      and not exists (select 1 from public.respuestas r where r.sesion_id = s.id)
  )
  select asignatura,
         sum(total)::bigint,
         sum(aciertos)::bigint,
         sum(fallos)::bigint
  from datos
  group by asignatura;
$$;


create function public.obtener_fallos_por_tema()
returns table (
  asignatura text,
  tema text,
  fallos bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select p.asignatura, coalesce(p.tema, 'Sin tema') as tema, count(*) as fallos
  from public.historial_fallos hf
  inner join public.preguntas p on p.id = hf.pregunta_id
  where hf.user_id = auth.uid()
  group by p.asignatura, coalesce(p.tema, 'Sin tema');
$$;


-- ============================================================
-- Hitos de pareja: clave estable + desbloqueo automático
-- ============================================================

alter table public.hitos_pareja add column if not exists clave text;

update public.hitos_pareja set clave = case titulo
    when 'Primer simulacro'         then 'primer_simulacro'
    when 'Racha de 7 días'          then 'racha_7'
    when 'Racha de 30 días'         then 'racha_30'
    when '100 flashcards creadas'   then 'flashcards_100'
    when 'Cero fallos en un test'   then 'test_perfecto'
    when 'Top 3 materias repasadas' then 'tres_materias'
    when 'Simulacro oficial 200Q'   then 'simulacro_oficial'
    when 'Primera racha'            then 'racha_3'
  end
where clave is null;

create unique index if not exists hitos_pareja_user_clave_key
  on public.hitos_pareja (user_id, clave);


create function public.inicializar_hitos_pareja()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  insert into public.hitos_pareja (user_id, clave, titulo, descripcion, emoji)
  values
    (v_uid, 'primer_simulacro',  'Primer simulacro',         'Completar el primer test',                  '🎯'),
    (v_uid, 'racha_3',           'Primera racha',            'Estudiar 3 días consecutivos',              '✨'),
    (v_uid, 'racha_7',           'Racha de 7 días',          'Estudiar 7 días seguidos',                  '🔥'),
    (v_uid, 'racha_30',          'Racha de 30 días',         'Estudiar 30 días seguidos',                 '🌟'),
    (v_uid, 'flashcards_100',    '100 flashcards creadas',   'Crear al menos 100 tarjetas en el mazo',    '🃏'),
    (v_uid, 'test_perfecto',     'Cero fallos en un test',   'Completar un test de 10+ preguntas sin ningún error', '💎'),
    (v_uid, 'tres_materias',     'Top 3 materias repasadas', 'Practicar 3 asignaturas distintas',         '📚'),
    (v_uid, 'simulacro_oficial', 'Simulacro oficial 200Q',   'Completar un simulacro oficial completo',   '🏆')
  on conflict (user_id, clave) do nothing;

  perform public.evaluar_hitos();
end;
$$;


-- Interna: no se expone a los clientes (recibe un user_id arbitrario).
create or replace function public.evaluar_hitos_de(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_racha_max integer;
  v_num_sesiones integer;
  v_num_flashcards integer;
  v_test_perfecto boolean;
  v_materias integer;
  v_oficial boolean;
begin
  select coalesce(max(racha_maxima), 0) into v_racha_max
  from public.rachas where user_id = p_user_id;

  select count(*),
         coalesce(bool_or(fallos = 0 and aciertos > 0 and total_preguntas >= 10), false),
         count(distinct asignatura) filter (where modo = 'asignatura'),
         -- Un examen oficial completo: 2020 tiene 177 preguntas válidas, el resto más
         coalesce(bool_or(modo = 'oficial' and total_preguntas >= 170), false)
    into v_num_sesiones, v_test_perfecto, v_materias, v_oficial
  from public.sesiones_estudio where user_id = p_user_id;

  select count(*) into v_num_flashcards
  from public.flashcards where user_id = p_user_id;

  update public.hitos_pareja
  set desbloqueado = true,
      fecha_desbloqueo = public.hoy_madrid()
  where user_id = p_user_id
    and not desbloqueado
    and (
         (clave = 'primer_simulacro'  and v_num_sesiones >= 1)
      or (clave = 'racha_3'           and v_racha_max >= 3)
      or (clave = 'racha_7'           and v_racha_max >= 7)
      or (clave = 'racha_30'          and v_racha_max >= 30)
      or (clave = 'flashcards_100'    and v_num_flashcards >= 100)
      or (clave = 'test_perfecto'     and v_test_perfecto)
      or (clave = 'tres_materias'     and v_materias >= 3)
      or (clave = 'simulacro_oficial' and v_oficial)
    );
end;
$$;

revoke all on function public.evaluar_hitos_de(uuid) from public, anon, authenticated;


create function public.evaluar_hitos()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  perform public.evaluar_hitos_de(auth.uid());
end;
$$;


-- ============================================================
-- Racha diaria (ahora con el día de España)
-- ============================================================

create or replace function public.registrar_actividad()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_hoy     date := public.hoy_madrid();
  v_racha   public.rachas%rowtype;
begin
  if v_user_id is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select * into v_racha from public.rachas where user_id = v_user_id;

  if not found then
    insert into public.rachas (user_id, racha_actual, racha_maxima, ultimo_estudio)
    values (v_user_id, 1, 1, v_hoy);
  elsif v_racha.ultimo_estudio = v_hoy then
    null; -- ya estudió hoy
  elsif v_racha.ultimo_estudio = v_hoy - 1 then
    update public.rachas set
      racha_actual   = v_racha.racha_actual + 1,
      racha_maxima   = greatest(v_racha.racha_maxima, v_racha.racha_actual + 1),
      ultimo_estudio = v_hoy,
      updated_at     = now()
    where user_id = v_user_id;
  else
    update public.rachas set
      racha_actual   = 1,
      racha_maxima   = greatest(v_racha.racha_maxima, 1),
      ultimo_estudio = v_hoy,
      updated_at     = now()
    where user_id = v_user_id;
  end if;

  perform public.evaluar_hitos();
end;
$$;


-- ============================================================
-- finalizar_test: corrección + persistencia en una transacción
-- ============================================================

create function public.finalizar_test(
  p_modo text,
  p_asignatura text,
  p_respuestas jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_resultado jsonb;
begin
  if v_uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  if p_modo not in ('rapido', 'asignatura', 'oficial', 'fallos') then
    raise exception 'Modo de test no válido: %', p_modo;
  end if;

  if jsonb_typeof(p_respuestas) is distinct from 'array'
     or jsonb_array_length(p_respuestas) = 0
     or jsonb_array_length(p_respuestas) > 250 then
    raise exception 'Lista de respuestas no válida';
  end if;

  with parseadas as (
    -- Si una pregunta viene repetida, vale la última respuesta.
    select distinct on (pregunta_id) pregunta_id, respuesta
    from (
      select (item->>'pregunta_id')::bigint as pregunta_id,
             (item->>'respuesta')::smallint as respuesta,
             orden
      from jsonb_array_elements(p_respuestas) with ordinality as t(item, orden)
    ) x
    order by pregunta_id, orden desc
  ),
  correccion as (
    select r.pregunta_id,
           r.respuesta,
           p.respuesta_correcta,
           case when r.respuesta is null then null
                else r.respuesta = p.respuesta_correcta end as correcta
    from parseadas r
    inner join public.preguntas p on p.id = r.pregunta_id
  ),
  totales as (
    select count(*) filter (where correcta)          as aciertos,
           count(*) filter (where correcta = false)  as fallos,
           count(*) filter (where correcta is null)  as blancas
    from correccion
  ),
  sesion as (
    insert into public.sesiones_estudio
      (user_id, modo, asignatura, total_preguntas, aciertos, fallos, blancas, puntuacion)
    select v_uid,
           p_modo,
           case when p_modo = 'asignatura' then p_asignatura end,
           aciertos + fallos + blancas,
           aciertos, fallos, blancas,
           aciertos * 3 - fallos
    from totales
    where aciertos + fallos + blancas > 0
    returning id, total_preguntas, aciertos, fallos, blancas, puntuacion
  ),
  guardar_respuestas as (
    insert into public.respuestas (user_id, sesion_id, pregunta_id, respuesta, correcta)
    select v_uid, s.id, c.pregunta_id, c.respuesta, c.correcta
    from correccion c cross join sesion s
  ),
  guardar_fallos as (
    insert into public.historial_fallos (user_id, pregunta_id, respuesta_usuario)
    select v_uid, c.pregunta_id, c.respuesta
    from correccion c
    where c.correcta = false
  ),
  resolver_fallos as (
    update public.historial_fallos hf
    set resuelto = true
    from correccion c
    where hf.user_id = v_uid
      and hf.pregunta_id = c.pregunta_id
      and c.correcta
      and not hf.resuelto
  )
  select jsonb_build_object(
           'sesion_id',       s.id,
           'total_preguntas', s.total_preguntas,
           'aciertos',        s.aciertos,
           'fallos',          s.fallos,
           'blancas',         s.blancas,
           'puntuacion',      s.puntuacion,
           'correctas',       (select coalesce(jsonb_object_agg(c.pregunta_id::text, c.respuesta_correcta), '{}'::jsonb)
                               from correccion c)
         )
    into v_resultado
  from sesion s;

  if v_resultado is null then
    raise exception 'Ninguna de las preguntas enviadas existe';
  end if;

  perform public.registrar_actividad();

  return v_resultado;
end;
$$;


-- ============================================================
-- GRANTS
-- (Supabase concede EXECUTE a anon por defecto: lo quitamos)
-- ============================================================

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.obtener_preguntas_aleatorias(integer)',
    'public.obtener_preguntas_por_asignatura(text, integer)',
    'public.obtener_examen(integer)',
    'public.obtener_anios()',
    'public.obtener_preguntas_de_fallos(integer)',
    'public.obtener_resumen_fallos()',
    'public.contar_fallos_pendientes()',
    'public.resolver_fallo(bigint)',
    'public.obtener_flashcards_pendientes(integer)',
    'public.contar_flashcards_pendientes()',
    'public.obtener_stats_por_asignatura()',
    'public.obtener_fallos_por_tema()',
    'public.inicializar_hitos_pareja()',
    'public.evaluar_hitos()',
    'public.registrar_actividad()',
    'public.finalizar_test(text, text, jsonb)',
    'public.obtener_asignaturas()'
  ]
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;


-- ============================================================
-- Desbloquear los hitos que ya se hayan conseguido
-- ============================================================

select public.evaluar_hitos_de(user_id)
from (select distinct user_id from public.hitos_pareja) u;
