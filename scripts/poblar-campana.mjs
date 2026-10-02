/**
 * Borra la hacienda y el historial operativo y carga una campaña larga
 * de Estancia El Quebracho (Las Lomitas, Formosa).
 *
 * No toca usuarios, perfiles ni membresías.
 * Conserva el dibujo de los potreros y les unifica el nombre.
 * No dispara el correo diario.
 *
 * Uso: node scripts/poblar-campana.mjs --confirmar
 */
import { readFileSync } from 'node:fs'
import { decidirLote } from '../src/utils/decisionLote.js'
import { evaluateOperationalAlerts } from '../src/utils/operationalAlerts.js'
import { calcGdpv } from '../src/utils/gdpv.js'

const soloLectura = process.argv.includes('--solo-lectura')
if (!soloLectura && !process.argv.includes('--confirmar')) {
  console.error('Este script borra la hacienda cargada. Volvé a correrlo con --confirmar.')
  process.exit(1)
}

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const i = line.indexOf('=')
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^"|"$/g, '')]
    }),
)
const ref = new URL(env.VITE_SUPABASE_URL).host.split('.')[0]

async function q(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text.slice(0, 400)
  }
  if (!res.ok) {
    const msg = typeof data === 'object' ? data.message || data.error || JSON.stringify(data).slice(0, 800) : data
    throw new Error(`SQL ${res.status}: ${msg}`)
  }
  return data
}

const seed = `
do $$
declare
  est uuid;
  pids uuid[];
  rec record;
  lote uuid;
  f date;
  i int;
  peso numeric;
  cc numeric;
  frac numeric;
  span int;
  maiz uuid;
  soja uuid;
  sal uuid;
  nucleo uuid;
  iver uuid;
  vacuna uuid;
  rollo uuid;
  fuente uuid;
  cat_id uuid;
begin
  select e.id into est
  from establecimientos e
  where exists (select 1 from potreros p where p.establecimiento_id = e.id)
  order by e.created_at nulls last
  limit 1;

  if est is null then
    raise exception 'No hay un establecimiento con potreros dibujados';
  end if;

  update potreros set fuente_agua_id = null where establecimiento_id = est;

  delete from lecturas_ndvi;
  delete from registros_vision;
  delete from situaciones_lote;
  delete from consumos_de_dieta;
  if to_regclass('public.dietas_items') is not null then
    delete from dietas_items;
  end if;
  delete from eventos_reproductivos;
  delete from eventos_sanitarios;
  delete from evaluaciones;
  delete from movimientos_de_lotes;
  delete from inventario_movimientos;
  delete from analisis_de_agua;
  delete from registros_lluvia;
  delete from notificaciones_programadas;
  delete from lotes;
  delete from inventario_items;
  delete from alimentos;
  delete from dietas;
  delete from fuentes_de_agua;
  delete from categorias_zootecnicas;

  begin
    delete from storage.objects where bucket_id = 'vision';
  exception when others then
    null;
  end;

  delete from establecimientos e
  where e.id <> est
    and not exists (select 1 from miembros_establecimiento m where m.establecimiento_id = e.id)
    and not exists (select 1 from perfiles_usuarios u where u.establecimiento_id = e.id)
    and not exists (select 1 from potreros p where p.establecimiento_id = e.id);

  update establecimientos set
    nombre = 'Estancia El Quebracho',
    ubicacion = 'Ruta 81, departamento Patiño',
    ciudad = 'Las Lomitas',
    provincia = 'Formosa'
  where id = est;

  select array_agg(id order by superficie_ha desc, id) into pids
  from potreros
  where establecimiento_id = est;

  update potreros p
  set nombre = v.nombre,
      tipo = 'Pastoreo',
      estado = 'En uso',
      descripcion = v.descripcion,
      activo = true
  from (
    select id, row_number() over (order by superficie_ha desc, id) as rn
    from potreros
    where establecimiento_id = est
  ) r
  join (values
    (1, 'Potrero Norte', 'Monte abierto. Rodeo de vientres.'),
    (2, 'Potrero del Tajamar', 'Junto a la represa principal.'),
    (3, 'Potrero Bajo Hondo', 'Bajo dulce. Se encharca cuando llueve.'),
    (4, 'Potrero del Monte', 'Monte alto, con sombra.'),
    (5, 'Potrero de la Manga', 'Al lado de la manga y la balanza.'),
    (6, 'Potrero Este', 'Pastura de gatton panic.'),
    (7, 'Potrero de las Vacas', 'Vientres del sector sur.'),
    (8, 'Potrero de Recría', 'Limpio, cerca del casco.'),
    (9, 'Potrero de Engorde', 'Chico. Ahí se suplementa la punta.'),
    (10, 'Potrero de Descanso', 'En recuperación, pocas cabezas.')
  ) as v(rn, nombre, descripcion) on v.rn = r.rn
  where p.id = r.id;

  insert into categorias_zootecnicas (establecimiento_id, nombre, descripcion) values
    (est, 'Novillo', 'Macho castrado'),
    (est, 'Vaquillona', 'Hembra joven'),
    (est, 'Vaca', 'Vientre o descarte'),
    (est, 'Ternero', 'Destete del año'),
    (est, 'Toro', 'Reproductor');

  create temp table plan (
    clave text primary key,
    identificacion text,
    objetivo text,
    categoria text,
    rn int,
    cabezas int,
    peso0 numeric,
    paso numeric,
    desde date,
    hasta date,
    cc0 numeric,
    cc1 numeric,
    entrada date
  ) on commit drop;

  insert into plan values
    ('punta', 'Novillos de punta', 'Engorde', 'Novillo', 9, 28, 332, 4.6, date '2025-04-03', date '2026-09-24', 5.0, 6.0, date '2026-08-05'),
    ('cola', 'Novillos de cola', 'Engorde', 'Novillo', 8, 20, 404, -5.5, date '2026-06-04', date '2026-09-24', 4.5, 3.0, date '2026-06-04'),
    ('reposicion', 'Vaquillonas de reposición', 'Recría', 'Vaquillona', 8, 36, 188, 4.4, date '2025-04-03', date '2026-09-24', 4.4, 5.2, date '2026-09-10'),
    ('servicio', 'Vaquillonas de primer servicio', 'Recría', 'Vaquillona', 2, 70, 236, 3.6, date '2025-04-03', date '2026-09-24', 4.6, 4.2, date '2026-09-12'),
    ('vientre_norte', 'Vacas vientre del norte', 'Cría', 'Vaca', 1, 110, 386, 0.7, date '2025-04-03', date '2026-09-24', 4.5, 4.8, date '2026-07-01'),
    ('vientre_sur', 'Vacas vientre del sur', 'Cría', 'Vaca', 7, 48, 368, 0.5, date '2025-04-03', date '2026-09-24', 4.2, 3.2, date '2026-07-20'),
    ('destete', 'Terneros del destete de marzo', 'Recría', 'Ternero', 6, 62, 168, 8.0, date '2026-03-12', date '2026-09-24', 4.6, 5.4, date '2026-09-08'),
    ('cola_destete', 'Terneros cola de destete', 'Recría', 'Ternero', 3, 55, 152, 2.6, date '2026-03-12', date '2026-09-24', 4.0, 4.2, date '2026-08-01'),
    ('toros', 'Toros de repaso', 'Cría', 'Toro', 5, 8, 674, 0.8, date '2025-04-03', date '2026-09-24', 5.5, 6.0, date '2026-08-20'),
    ('invernada', 'Novillitos de invernada', 'Engorde', 'Novillo', 5, 48, 348, 3.0, date '2026-07-02', date '2026-09-24', 5.0, 5.5, date '2026-09-20'),
    ('descarte', 'Vacas de descarte', 'Engorde', 'Vaca', 4, 36, 452, -4.2, date '2026-04-02', date '2026-09-24', 4.0, 3.0, date '2026-08-15'),
    ('quebracho', 'Vaquillonas del quebracho', 'Recría', 'Vaquillona', 10, 14, 214, 5.2, date '2026-01-08', date '2026-09-24', 4.3, 4.7, date '2026-09-22');

  create temp table mapa (clave text primary key, lote_id uuid, rn int) on commit drop;

  for rec in select * from plan loop
    select id into cat_id from categorias_zootecnicas
    where establecimiento_id = est and nombre = rec.categoria;

    insert into lotes (
      establecimiento_id, identificacion, categoria_zootecnica_id, potrero_actual_id,
      activo, objetivo, cantidad_animales, peso_ingreso_kg
    ) values (
      est, rec.identificacion, cat_id, pids[rec.rn],
      true, rec.objetivo, rec.cabezas, rec.peso0
    ) returning id into lote;

    insert into mapa values (rec.clave, lote, rec.rn);

    if rec.entrada > rec.desde + 20 then
      insert into movimientos_de_lotes (lote_id, potrero_id, fecha_entrada, fecha_salida, observaciones)
      values (
        lote,
        pids[case when rec.rn = 1 then 10 else rec.rn - 1 end],
        rec.desde,
        rec.entrada - 1,
        'Pasaron el verano en el potrero anterior.'
      );
    end if;

    insert into movimientos_de_lotes (lote_id, potrero_id, fecha_entrada, fecha_salida, observaciones)
    values (lote, pids[rec.rn], rec.entrada, null, 'Entrada vigente.');

    f := rec.desde;
    i := 0;
    while f <= rec.hasta loop
      peso := round(rec.peso0 + rec.paso * i, 1);
      if peso < 120 then peso := 120; end if;
      span := rec.hasta - rec.desde;
      if span <= 0 then frac := 1; else frac := (f - rec.desde)::numeric / span; end if;
      cc := round(rec.cc0 + (rec.cc1 - rec.cc0) * frac, 1);
      if cc < 1 then cc := 1; end if;
      if cc > 9 then cc := 9; end if;

      insert into evaluaciones (lote_id, fecha_evaluacion, peso_promedio_kg, condicion_corporal, observaciones)
      values (lote, f, peso, cc, 'Pesada de manga.');

      if i % 2 = 0 then
        insert into registros_vision (
          lote_id, modo, fecha, texto_confirmado, condicion_corporal
        ) values (
          lote, 'condicion', f,
          'Condición confirmada en la manga.',
          cc
        );
      end if;

      i := i + 1;
      f := f + 14;
    end loop;

    if rec.desde <= date '2025-05-12' then
      insert into eventos_sanitarios (lote_id, fecha, tipo_evento, descripcion)
      values (lote, date '2025-05-12', 'Vacunación', 'Antiaftosa de todo el lote.');
    end if;
    if rec.desde <= date '2026-03-18' then
      insert into eventos_sanitarios (lote_id, fecha, tipo_evento, descripcion)
      values (lote, date '2026-03-18', 'Desparasitación', 'Ivermectina según peso de manga.');
    end if;
    if rec.desde <= date '2026-08-04' then
      insert into eventos_sanitarios (lote_id, fecha, tipo_evento, descripcion)
      values (lote, date '2026-08-04', 'Baño', 'Baño de control de garrapata.');
    end if;

    insert into registros_vision (
      lote_id, modo, fecha, texto_confirmado, consistencia, color, presencia_parasitos
    ) values (
      lote, 'fecal', date '2026-09-15',
      'Bosta firme, sin signos visibles.',
      'Normal', 'Marrón', false
    );

    if rec.desde <= date '2026-05-06' then
      insert into registros_vision (
        lote_id, modo, fecha, texto_confirmado, gravedad
      ) values (
        lote, 'anomalia', date '2026-05-06',
        'Sin lesiones visibles.',
        'baja'
      );
    end if;
  end loop;

  -- La cola pierde estado: absceso confirmado, más nuevo que la lectura limpia.
  insert into eventos_sanitarios (lote_id, fecha, tipo_evento, descripcion)
  select lote_id, date '2026-09-26', 'Tratamiento', 'Absceso en el garrón derecho. Se apartaron los afectados.'
  from mapa where clave = 'cola';

  insert into registros_vision (lote_id, modo, fecha, texto_confirmado, gravedad)
  select lote_id, 'anomalia', date '2026-09-26', 'Absceso en el garrón derecho, confirmado en la manga.', 'seria'
  from mapa where clave = 'cola';

  -- Primer servicio: la última bosta muestra parásitos.
  insert into eventos_sanitarios (lote_id, fecha, tipo_evento, descripcion)
  select lote_id, date '2026-09-28', 'Desparasitación', 'Signos visibles en la bosta. Se dosificó el lote.'
  from mapa where clave = 'servicio';

  insert into registros_vision (
    lote_id, modo, fecha, texto_confirmado, consistencia, color, presencia_parasitos
  )
  select lote_id, 'fecal', date '2026-09-28',
    'Bosta blanda con signos visibles de parásitos.',
    'Blanda', 'Pálido', true
  from mapa where clave = 'servicio';

  insert into eventos_reproductivos (lote_id, fecha, tipo_evento, descripcion)
  select lote_id, date '2025-11-02', 'Servicio', 'Entrado de toros al rodeo norte.' from mapa where clave = 'vientre_norte'
  union all
  select lote_id, date '2026-02-10', 'Tacto', 'Mayoría preñada.' from mapa where clave = 'vientre_norte'
  union all
  select lote_id, date '2026-08-18', 'Parto', 'Parición de invierno en el norte.' from mapa where clave = 'vientre_norte'
  union all
  select lote_id, date '2025-11-18', 'Servicio', 'Servicio del rodeo sur.' from mapa where clave = 'vientre_sur'
  union all
  select lote_id, date '2026-02-24', 'Tacto', 'Varias vacías. Se volvieron a servir.' from mapa where clave = 'vientre_sur'
  union all
  select lote_id, date '2026-04-06', 'Servicio', 'Repaso de las vacías.' from mapa where clave = 'vientre_sur'
  union all
  select lote_id, date '2026-01-12', 'Servicio', 'Primer servicio de las vaquillonas.' from mapa where clave = 'servicio'
  union all
  select lote_id, date '2026-04-16', 'Tacto', 'Preñadas en su mayoría.' from mapa where clave = 'servicio'
  union all
  select lote_id, date '2025-11-02', 'Servicio', 'Repaso de los vientres.' from mapa where clave = 'toros';

  insert into situaciones_lote (lote_id, fecha, ambito, tipo, detalle, pedir_revision)
  select lote_id, date '2026-06-12', 'potrero', 'Falta de sombra', 'Al mediodía se juntan bajo los quebrachos del borde.', false
  from mapa where clave = 'punta'
  union all
  select lote_id, date '2026-09-18', 'sanidad', 'Bicheras', 'Varias vaquillonas con bicheras en el lomo.', true
  from mapa where clave = 'quebracho'
  union all
  select lote_id, date '2026-09-09', 'agua', 'Agua salada', 'El pozo del sur está más salado que en el análisis de otoño.', true
  from mapa where clave = 'vientre_sur'
  union all
  select lote_id, date '2026-08-22', 'hacienda', 'Apartes', 'Se apartaron tres novillos que no comían.', false
  from mapa where clave = 'cola'
  union all
  select lote_id, date '2026-03-20', 'hacienda', 'Destete', 'Destete de marzo, manga del casco.', false
  from mapa where clave = 'destete'
  union all
  select lote_id, date '2026-05-02', 'comida', 'Racionamiento', 'Se arrancó con maíz partido a la tarde.', false
  from mapa where clave = 'invernada';

  -- Lluvia del pluviómetro del casco. El último mes queda seco a propósito.
  f := date '2025-04-06';
  while f <= date '2026-08-30' loop
    insert into registros_lluvia (establecimiento_id, fecha, milimetros, observaciones)
    values (
      est,
      f,
      case extract(month from f)
        when 6 then 5
        when 7 then 3
        when 8 then 6
        when 12 then 42
        when 1 then 55
        when 2 then 38
        when 3 then 46
        else 18
      end
      + (extract(day from f)::int % 5),
      'Pluviómetro del casco.'
    );
    f := f + 7;
  end loop;

  insert into registros_lluvia (establecimiento_id, fecha, milimetros, observaciones) values
    (est, date '2026-09-08', 6, 'Pluviómetro del casco.'),
    (est, date '2026-09-22', 4, 'Pluviómetro del casco.');

  -- Vigor satelital, una escena por mes y potrero. No son kilos de pasto.
  for i in 1..10 loop
    for rec in
      select g.m, (date '2025-04-15' + (g.m || ' months')::interval)::date as fecha
      from generate_series(0, 17) as g(m)
    loop
      insert into lecturas_ndvi (potrero_id, fecha, ndvi, fuente)
      values (
        pids[i],
        rec.fecha,
        least(0.86, greatest(0.12, round((
          (case i
            when 1 then 0.48 + 0.07 * rec.m / 17.0
            when 2 then 0.52 - 0.06 * rec.m / 17.0
            when 3 then 0.60 - 0.28 * rec.m / 17.0
            when 4 then 0.62 - 0.35 * rec.m / 17.0
            when 5 then 0.50 + 0.11 * rec.m / 17.0
            when 6 then 0.50 - 0.06 * rec.m / 17.0
            when 7 then 0.56 - 0.18 * rec.m / 17.0
            when 8 then 0.49 + 0.03 * rec.m / 17.0
            when 9 then 0.58 - 0.29 * rec.m / 17.0
            else 0.42 + 0.26 * rec.m / 17.0
          end)
          + 0.025 * sin(rec.m::float8)
        )::numeric, 2))),
        'Sentinel-2'
      );
    end loop;
  end loop;

  update potreros p
  set ultimo_ndvi = s.ndvi,
      fecha_ultimo_ndvi = s.fecha,
      ndvi_min = s.mn,
      ndvi_max = s.mx
  from (
    select potrero_id,
           (array_agg(ndvi order by fecha desc))[1] as ndvi,
           max(fecha) as fecha,
           min(ndvi) as mn,
           max(ndvi) as mx
    from lecturas_ndvi
    group by potrero_id
  ) s
  where p.id = s.potrero_id;

  -- Aguadas. El estado sale del último análisis, no de un sensor.
  for rec in
    select *
    from (values
      (1, 'Tajamar del Norte', 'Tajamar', 'Óptimo', 7.2::numeric, 780::numeric, 8::numeric, 0.01::numeric),
      (2, 'Represa del Tajamar', 'Represa', 'Óptimo', 7.1, 910, 12, 0.01),
      (3, 'Pozo del Bajo', 'Pozo', 'Precaución', 7.0, 3400, 18, 0.02),
      (4, 'Tajamar del Monte', 'Tajamar', 'Óptimo', 7.3, 640, 6, 0.01),
      (5, 'Molino de la Manga', 'Molino', 'Óptimo', 7.0, 880, 9, 0.01),
      (6, 'Represa del Este', 'Represa', 'Precaución', 6.2, 980, 11, 0.01),
      (7, 'Pozo del Sur', 'Pozo', 'Peligro', 7.4, 6400, 22, 0.02),
      (8, 'Bebedero de Recría', 'Tanque', 'Óptimo', 7.2, 540, 4, 0.01),
      (9, 'Tanque de Engorde', 'Tanque', 'Óptimo', 7.1, 610, 5, 0.01),
      (10, 'Tajamar de Descanso', 'Tajamar', 'Óptimo', 7.0, 720, 7, 0.01)
    ) as v(rn, nombre, tipo, estado, ph, tds, nitratos, arsenico)
  loop
    insert into fuentes_de_agua (
      establecimiento_id, nombre, tipo, potrero_id, es_inteligente, ultimo_estado, activo
    ) values (
      est, rec.nombre, rec.tipo, pids[rec.rn], false, rec.estado, true
    ) returning id into fuente;

    update potreros set fuente_agua_id = fuente where id = pids[rec.rn];

    insert into analisis_de_agua (
      fuente_id, fecha_analisis, metodo, ph, solidos_totales, nitratos, arsenico, observaciones
    ) values
      (fuente, date '2025-04-22', 'Laboratorio de agua', 7.1, 700, 6, 0.01, 'Muestra de otoño.'),
      (fuente, date '2025-10-21', 'Laboratorio de agua', 7.0, 860, 8, 0.01, 'Muestra de primavera.'),
      (fuente, date '2026-04-16', 'Laboratorio de agua',
        case when rec.rn in (6, 7) then 6.4 else 7.2 end,
        case when rec.rn = 7 then 4100 when rec.rn = 3 then 2600 else 800 end,
        10, 0.01, 'Muestra de otoño.'),
      (fuente, date '2026-09-18', 'Laboratorio de agua', rec.ph, rec.tds, rec.nitratos, rec.arsenico, 'Última muestra cargada.');
  end loop;

  insert into inventario_items (
    establecimiento_id, nombre, categoria, stock_actual, unidad, precio_unitario, stock_minimo_alerta, activo
  ) values
    (est, 'Maíz partido', 'Alimento', 0, 'kg', 280, 2000, true),
    (est, 'Expeller de soja', 'Alimento', 0, 'kg', 420, 400, true),
    (est, 'Sal mineralizada', 'Alimento', 0, 'kg', 950, 80, true),
    (est, 'Núcleo vitamínico', 'Alimento', 0, 'kg', 2100, 25, true),
    (est, 'Ivermectina 1%', 'Sanidad', 0, 'ml', 45, 200, true),
    (est, 'Vacuna antiaftosa', 'Sanidad', 0, 'dosis', 850, 80, true),
    (est, 'Rollo de gatton panic', 'Forraje', 0, 'rollo', 18000, 8, true);

  select id into maiz from inventario_items where establecimiento_id = est and nombre = 'Maíz partido';
  select id into soja from inventario_items where establecimiento_id = est and nombre = 'Expeller de soja';
  select id into sal from inventario_items where establecimiento_id = est and nombre = 'Sal mineralizada';
  select id into nucleo from inventario_items where establecimiento_id = est and nombre = 'Núcleo vitamínico';
  select id into iver from inventario_items where establecimiento_id = est and nombre = 'Ivermectina 1%';
  select id into vacuna from inventario_items where establecimiento_id = est and nombre = 'Vacuna antiaftosa';
  select id into rollo from inventario_items where establecimiento_id = est and nombre = 'Rollo de gatton panic';

  insert into inventario_movimientos (item_id, lote_id, fecha, tipo_movimiento, cantidad, costo_total, observaciones) values
    (maiz, null, '2025-04-10', 'Compra', 20000, 5600000, 'Compra de otoño.'),
    (maiz, null, '2025-10-08', 'Compra', 20000, 5600000, 'Compra de primavera.'),
    (maiz, null, '2026-06-12', 'Compra', 15000, 4200000, 'Compra para el invierno.'),
    (soja, null, '2025-05-04', 'Compra', 2500, 1050000, 'Compra al acopio de Las Lomitas.'),
    (sal, null, '2025-04-15', 'Compra', 200, 190000, 'Sal mineralizada para los potreros.'),
    (nucleo, null, '2025-06-02', 'Compra', 40, 84000, 'Núcleo para la ración.'),
    (iver, null, '2025-05-20', 'Compra', 2500, 112500, 'Bidones para la campaña.'),
    (vacuna, null, '2025-04-28', 'Compra', 500, 425000, 'Antiaftosa.'),
    (rollo, null, '2025-07-18', 'Compra', 14, 252000, 'Rollos de gatton.');

  insert into inventario_movimientos (item_id, lote_id, fecha, tipo_movimiento, cantidad, costo_total, observaciones)
  select maiz, lote_id, fecha, 'Uso', cantidad, round(cantidad * 280, 2), 'Suplementación a campo.'
  from (values
    ('punta', timestamp '2026-08-20', 1800::numeric),
    ('reposicion', timestamp '2026-07-15', 900),
    ('servicio', timestamp '2026-06-18', 700),
    ('vientre_norte', timestamp '2026-08-01', 600),
    ('vientre_sur', timestamp '2026-08-01', 500),
    ('destete', timestamp '2026-08-12', 1100),
    ('cola_destete', timestamp '2026-08-12', 400),
    ('toros', timestamp '2026-07-01', 200),
    ('invernada', timestamp '2026-08-20', 12000),
    ('quebracho', timestamp '2026-08-28', 350)
  ) as u(clave, fecha, cantidad)
  join mapa using (clave);

  insert into inventario_movimientos (item_id, lote_id, fecha, tipo_movimiento, cantidad, costo_total, observaciones)
  select ids.item_id, mapa.lote_id, u.fecha, 'Uso', u.cantidad, u.costo, u.nota
  from (values
    ('cola', 'sal', timestamp '2026-07-02', 150::numeric, 142500::numeric, 'A la cola, que venía floja.'),
    ('punta', 'nucleo', timestamp '2026-08-20', 40, 84000, 'Se terminó el núcleo en la ración de punta.'),
    ('descarte', 'rollo', timestamp '2026-08-18', 11, 198000, 'Rollos mientras el monte no rebrotaba.'),
    ('vientre_norte', 'soja', timestamp '2026-08-05', 1640, 688800, 'Expeller a los vientres del norte.'),
    ('servicio', 'iver', timestamp '2026-09-28', 700, 31500, 'Dosificación tras la lectura fecal.'),
    ('destete', 'vacuna', timestamp '2026-04-02', 300, 255000, 'Antiaftosa del destete.')
  ) as u(clave, item, fecha, cantidad, costo, nota)
  join mapa using (clave)
  join (
    select 'sal' as item, sal as item_id
    union all select 'nucleo', nucleo
    union all select 'rollo', rollo
    union all select 'soja', soja
    union all select 'iver', iver
    union all select 'vacuna', vacuna
  ) ids using (item);

  update inventario_items i
  set stock_actual = coalesce((
    select sum(
      case
        when lower(m.tipo_movimiento) = 'compra' then m.cantidad
        when lower(m.tipo_movimiento) = 'uso' then -m.cantidad
        else 0
      end
    )
    from inventario_movimientos m
    where m.item_id = i.id
  ), 0)
  where i.establecimiento_id = est;

  insert into alimentos (establecimiento_id, nombre, precio_kg, stock_kg) values
    (est, 'Maíz partido', 280, (select stock_actual from inventario_items where id = maiz)),
    (est, 'Expeller de soja', 420, (select stock_actual from inventario_items where id = soja)),
    (est, 'Sal mineralizada', 950, (select stock_actual from inventario_items where id = sal));

  insert into dietas (establecimiento_id, nombre, descripcion) values
    (est, 'Engorde con maíz', 'Suplementación de la punta y la invernada.'),
    (est, 'Recría a campo', 'Pasto más un poco de maíz.'),
    (est, 'Vientres con sal', 'Sal mineralizada a discreción.');

  insert into consumos_de_dieta (lote_id, dieta_id, alimento_id, fecha_inicio, fecha_fin, kg_animal_dia, observaciones)
  select m.lote_id, d.id, a.id, date '2026-08-01', null::date, 2.5, 'Ración de la tarde.'
  from mapa m
  join dietas d on d.establecimiento_id = est and d.nombre = 'Engorde con maíz'
  join alimentos a on a.establecimiento_id = est and a.nombre = 'Maíz partido'
  where m.clave in ('punta', 'invernada')
  union all
  select m.lote_id, d.id, a.id, date '2026-06-01', null::date, 0.4, 'Maíz de apoyo.'
  from mapa m
  join dietas d on d.establecimiento_id = est and d.nombre = 'Recría a campo'
  join alimentos a on a.establecimiento_id = est and a.nombre = 'Maíz partido'
  where m.clave in ('reposicion', 'destete', 'quebracho')
  union all
  select m.lote_id, d.id, a.id, date '2025-11-01', null::date, 0.05, 'Sal en bateas.'
  from mapa m
  join dietas d on d.establecimiento_id = est and d.nombre = 'Vientres con sal'
  join alimentos a on a.establecimiento_id = est and a.nombre = 'Sal mineralizada'
  where m.clave in ('vientre_norte', 'vientre_sur', 'toros');
end $$;
`

if (!soloLectura) {
  await q(seed)
}

const snapshot = await q(`
select json_build_object(
  'establecimiento', (select nombre from establecimientos order by created_at nulls last limit 1),
  'conteos', json_build_object(
    'potreros', (select count(*) from potreros),
    'lotes', (select count(*) from lotes),
    'evaluaciones', (select count(*) from evaluaciones),
    'movimientos', (select count(*) from movimientos_de_lotes),
    'lluvia', (select count(*) from registros_lluvia),
    'ndvi', (select count(*) from lecturas_ndvi),
    'vision', (select count(*) from registros_vision),
    'sanitarios', (select count(*) from eventos_sanitarios),
    'reproductivos', (select count(*) from eventos_reproductivos),
    'situaciones', (select count(*) from situaciones_lote),
    'analisis_agua', (select count(*) from analisis_de_agua),
    'fuentes', (select count(*) from fuentes_de_agua),
    'inventario_mov', (select count(*) from inventario_movimientos),
    'consumos', (select count(*) from consumos_de_dieta)
  ),
  'lluvia_30', (
    select coalesce(sum(milimetros), 0)
    from registros_lluvia
    where fecha >= date '2026-10-01' - 30 and fecha <= date '2026-10-01'
  ),
  'objetivos', (select json_agg(distinct objetivo) from lotes),
  'tipos_sanitarios', (select json_agg(distinct tipo_evento) from eventos_sanitarios),
  'tipos_repro', (select json_agg(distinct tipo_evento) from eventos_reproductivos),
  'ambitos', (select json_agg(distinct ambito) from situaciones_lote),
  'nombres_con_demo', (
    select count(*) from (
      select identificacion as n from lotes
      union all select nombre from potreros
      union all select nombre from fuentes_de_agua
      union all select nombre from inventario_items
      union all select nombre from establecimientos
    ) x where n ilike '%demo%' or n ilike '%prueba%'
  ),
  'lotes_sin_potrero', (select count(*) from lotes where potrero_actual_id is null or activo is not true),
  'abiertos_desfasados', (
    select count(*)
    from lotes l
    join movimientos_de_lotes m on m.lote_id = l.id and m.fecha_salida is null
    where m.potrero_id is distinct from l.potrero_actual_id
  ),
  'lotes_sin_abierto', (
    select count(*) from lotes l
    where not exists (
      select 1 from movimientos_de_lotes m
      where m.lote_id = l.id and m.fecha_salida is null
    )
  ),
  'pesos_invalidos', (
    select count(*) from evaluaciones
    where peso_promedio_kg is null or peso_promedio_kg <= 0 or condicion_corporal < 1 or condicion_corporal > 9
  ),
  'stock_distinto_de_movimientos', (
    select count(*) from inventario_items i
    where i.stock_actual is distinct from coalesce((
      select sum(case
        when lower(m.tipo_movimiento) = 'compra' then m.cantidad
        when lower(m.tipo_movimiento) = 'uso' then -m.cantidad
        else 0 end)
      from inventario_movimientos m where m.item_id = i.id
    ), 0)
  ),
  'lotes', (select json_agg(json_build_object(
    'id', id, 'identificacion', identificacion, 'objetivo', objetivo,
    'cantidad_animales', cantidad_animales, 'potrero_actual_id', potrero_actual_id, 'activo', activo
  )) from lotes),
  'potreros', (select json_agg(json_build_object(
    'id', id, 'nombre', nombre, 'superficie_ha', superficie_ha, 'ultimo_ndvi', ultimo_ndvi, 'activo', activo
  )) from potreros),
  'evaluaciones', (select json_agg(json_build_object(
    'lote_id', lote_id, 'fecha_evaluacion', fecha_evaluacion,
    'peso_promedio_kg', peso_promedio_kg, 'condicion_corporal', condicion_corporal
  )) from evaluaciones),
  'movimientos', (select json_agg(json_build_object(
    'lote_id', lote_id, 'potrero_id', potrero_id, 'fecha_entrada', fecha_entrada, 'fecha_salida', fecha_salida
  )) from movimientos_de_lotes),
  'lluvia', (select json_agg(json_build_object('fecha', fecha, 'milimetros', milimetros)) from registros_lluvia),
  'lecturas', (select json_agg(json_build_object(
    'potrero_id', potrero_id, 'fecha', fecha, 'ndvi', ndvi
  )) from lecturas_ndvi),
  'fuentes', (select json_agg(json_build_object(
    'id', f.id, 'nombre', f.nombre, 'potrero_id', f.potrero_id,
    'ultimo_estado', f.ultimo_estado, 'activo', f.activo,
    'analisis_de_agua', (
      select json_agg(json_build_object(
        'fecha_analisis', a.fecha_analisis, 'ph', a.ph,
        'solidos_totales', a.solidos_totales, 'nitratos', a.nitratos, 'arsenico', a.arsenico
      ) order by a.fecha_analisis desc)
      from analisis_de_agua a where a.fuente_id = f.id
    )
  )) from fuentes_de_agua f),
  'vision', (select json_agg(json_build_object(
    'lote_id', lote_id, 'modo', modo, 'fecha', fecha, 'gravedad', gravedad,
    'presencia_parasitos', presencia_parasitos, 'condicion_corporal', condicion_corporal,
    'consistencia', consistencia, 'color', color, 'texto_confirmado', texto_confirmado
  )) from registros_vision),
  'situaciones', (select json_agg(json_build_object(
    'lote_id', lote_id, 'fecha', fecha, 'ambito', ambito, 'tipo', tipo,
    'detalle', detalle, 'pedir_revision', pedir_revision
  )) from situaciones_lote),
  'items', (select json_agg(json_build_object(
    'id', id, 'nombre', nombre, 'categoria', categoria, 'stock_actual', stock_actual,
    'unidad', unidad, 'precio_unitario', precio_unitario, 'stock_minimo_alerta', stock_minimo_alerta, 'activo', activo
  )) from inventario_items),
  'usos', (select json_agg(json_build_object(
    'item_id', item_id, 'lote_id', lote_id, 'fecha', fecha,
    'tipo_movimiento', tipo_movimiento, 'cantidad', cantidad, 'costo_total', costo_total
  )) from inventario_movimientos)
) as payload;
`)

const payload = snapshot[0].payload
const hoy = new Date('2026-10-01T12:00:00')

function decidir(precioKg) {
  return payload.lotes.map((lote) => {
    const d = decidirLote({
      lote,
      lotes: payload.lotes,
      potrero: payload.potreros.find((p) => p.id === lote.potrero_actual_id) || null,
      evaluaciones: payload.evaluaciones.filter((e) => e.lote_id === lote.id),
      movimientos: payload.movimientos,
      registrosLluvia: payload.lluvia,
      fuentesAgua: payload.fuentes,
      registrosVision: payload.vision.filter((r) => r.lote_id === lote.id),
      inventarioMovimientos: payload.usos,
      situaciones: payload.situaciones,
      lecturasNdvi: payload.lecturas,
      precioKg,
      hoy,
    })
    const gdpv = calcGdpv(payload.evaluaciones.filter((e) => e.lote_id === lote.id))
    return { lote: lote.identificacion, objetivo: lote.objetivo, gdpv, veredicto: d.veredicto, titulo: d.titulo, lineas: d.lineas }
  })
}

const sinPrecio = decidir(null)
const conPrecio = decidir(2800)
const alertas = evaluateOperationalAlerts({
  lotes: payload.lotes,
  potreros: payload.potreros,
  fuentesAgua: payload.fuentes,
  inventarioItems: payload.items,
  evaluaciones: payload.evaluaciones,
  registrosVision: payload.vision,
  movimientos: payload.movimientos,
  registrosLluvia: payload.lluvia,
  inventarioMovimientos: payload.usos,
  situaciones: payload.situaciones,
  lecturasNdvi: payload.lecturas,
  precioKg: null,
})

const porNombre = Object.fromEntries(conPrecio.map((r) => [r.lote, r]))

console.log(JSON.stringify({
  establecimiento: payload.establecimiento,
  conteos: payload.conteos,
  lluvia_30_mm: payload.lluvia_30,
  objetivos: payload.objetivos,
  tipos_sanitarios: payload.tipos_sanitarios,
  tipos_repro: payload.tipos_repro,
  ambitos: payload.ambitos,
  integridad: {
    nombres_con_demo_o_prueba: payload.nombres_con_demo,
    lotes_sin_potrero: payload.lotes_sin_potrero,
    abiertos_desfasados: payload.abiertos_desfasados,
    lotes_sin_abierto: payload.lotes_sin_abierto,
    pesos_invalidos: payload.pesos_invalidos,
    stock_distinto_de_movimientos: payload.stock_distinto_de_movimientos,
  },
  stock: payload.items.map((i) => ({
    nombre: i.nombre,
    stock: Number(i.stock_actual),
    minimo: Number(i.stock_minimo_alerta),
    unidad: i.unidad,
  })),
  sin_cotizacion: sinPrecio.map((r) => ({
    lote: r.lote,
    veredicto: r.veredicto,
    gdpv: r.gdpv == null ? null : Number(r.gdpv.toFixed(3)),
    atencion: r.lineas.filter((l) => l.estado === 'atencion').map((l) => l.titulo),
    faltan: r.lineas.filter((l) => l.estado === 'falta').map((l) => l.titulo),
  })),
  si_cotizacion_2800: conPrecio.map((r) => ({
    lote: r.lote,
    veredicto: r.veredicto,
    comida: r.lineas.find((l) => l.id === 'comida')?.lectura,
  })),
  alertas: alertas.map((a) => ({ gravedad: a.severity, categoria: a.category, titulo: a.title })),
  vigores: payload.potreros
    .map((p) => ({ nombre: p.nombre, ha: Number(Number(p.superficie_ha).toFixed(1)), ndvi: Number(Number(p.ultimo_ndvi).toFixed(2)) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  muestra_lineas: ['Novillos de punta', 'Novillos de cola', 'Novillitos de invernada', 'Vacas vientre del sur', 'Vaquillonas del quebracho'].map((nombre) => ({
    lote: nombre,
    lineas: porNombre[nombre].lineas.map((l) => ({ titulo: l.titulo, estado: l.estado, lectura: l.lectura })),
  })),
}, null, 2))
