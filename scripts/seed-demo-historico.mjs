/**
 * Poblado masivo histórico para demo pública Nutrogan.
 * Inserta ~12 meses de evaluaciones, movimientos, lluvias, agua, sanidad,
 * inventario (uso/compra), notificaciones y actualiza NDVI en potreros.
 *
 * Uso:
 *   npm run seed:demo
 *   npm run seed:demo -- --purge   # borra datos DEMO-HIST previos y vuelve a cargar
 *
 * Auth: VITE_SUPABASE_* + NUTROGAN_SMOKE_EMAIL / NUTROGAN_SMOKE_PASSWORD
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..'
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(root, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1)]
    }),
)

const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_KEY
const email = process.env.NUTROGAN_SMOKE_EMAIL || 'fabricioduarteoficial@gmail.com'
const password = process.env.NUTROGAN_SMOKE_PASSWORD || '19713-CJCI-nutrogan'
const TAG = 'DEMO-HIST'
const PURGE = process.argv.includes('--purge')
const MONTHS = 12

const stats = {
  lotes: 0,
  evaluaciones: 0,
  movimientos: 0,
  lluvias: 0,
  analisis: 0,
  sanitarios: 0,
  invItems: 0,
  invMovs: 0,
  notifs: 0,
  potrerosNdvi: 0,
  alimentos: 0,
  consumos: 0,
  errors: [],
}

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function monthsAgo(n) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  d.setDate(5)
  return d
}

function headers(token, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...extra,
  }
}

async function rest(token, method, table, { query = '', body, prefer } = {}) {
  const h = headers(token)
  if (prefer) h.Prefer = prefer
  const r = await fetch(`${url}/rest/v1/${table}${query ? `?${query}` : ''}`, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const t = await r.text()
  let data
  try {
    data = t ? JSON.parse(t) : null
  } catch {
    data = t
  }
  return { ok: r.ok, status: r.status, data, raw: t }
}

async function rpc(token, name, body) {
  const r = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  const t = await r.text()
  let data
  try {
    data = t ? JSON.parse(t) : null
  } catch {
    data = t
  }
  return { ok: r.ok, status: r.status, data, raw: t }
}

async function purgeDemo(token, estId) {
  console.log('\n--- PURGE DEMO-HIST ---')
  const h = headers(token)

  // Lotes DEMO
  const lotes = await rest(token, 'GET', 'lotes', {
    query: `select=id&establecimiento_id=eq.${estId}&identificacion=like.${encodeURIComponent(TAG)}*`,
  })
  for (const l of lotes.data || []) {
    await fetch(`${url}/rest/v1/evaluaciones?lote_id=eq.${l.id}`, { method: 'DELETE', headers: h })
    await fetch(`${url}/rest/v1/eventos_sanitarios?lote_id=eq.${l.id}`, {
      method: 'DELETE',
      headers: h,
    })
    await fetch(`${url}/rest/v1/consumos_de_dieta?lote_id=eq.${l.id}`, {
      method: 'DELETE',
      headers: h,
    })
    await fetch(`${url}/rest/v1/movimientos_de_lotes?lote_id=eq.${l.id}`, {
      method: 'DELETE',
      headers: h,
    })
    await fetch(`${url}/rest/v1/lotes?id=eq.${l.id}`, { method: 'DELETE', headers: h })
  }

  await fetch(
    `${url}/rest/v1/registros_lluvia?establecimiento_id=eq.${estId}&observaciones=like.*${encodeURIComponent(TAG)}*`,
    { method: 'DELETE', headers: h },
  )
  await fetch(
    `${url}/rest/v1/notificaciones_programadas?establecimiento_id=eq.${estId}&titulo=like.*${encodeURIComponent(TAG)}*`,
    { method: 'DELETE', headers: h },
  )

  const items = await rest(token, 'GET', 'inventario_items', {
    query: `select=id&establecimiento_id=eq.${estId}&nombre=like.${encodeURIComponent(TAG)}*`,
  })
  for (const it of items.data || []) {
    await fetch(`${url}/rest/v1/inventario_movimientos?item_id=eq.${it.id}`, {
      method: 'DELETE',
      headers: h,
    })
    await fetch(`${url}/rest/v1/inventario_items?id=eq.${it.id}`, { method: 'DELETE', headers: h })
  }

  const alims = await rest(token, 'GET', 'alimentos', {
    query: `select=id&establecimiento_id=eq.${estId}&nombre=like.${encodeURIComponent(TAG)}*`,
  })
  for (const a of alims.data || []) {
    await fetch(`${url}/rest/v1/consumos_de_dieta?alimento_id=eq.${a.id}`, {
      method: 'DELETE',
      headers: h,
    })
    await fetch(`${url}/rest/v1/alimentos?id=eq.${a.id}`, { method: 'DELETE', headers: h })
  }

  // Análisis de agua con observación DEMO
  const fuentes = await rest(token, 'GET', 'fuentes_de_agua', {
    query: `select=id&establecimiento_id=eq.${estId}`,
  })
  for (const f of fuentes.data || []) {
    await fetch(
      `${url}/rest/v1/analisis_de_agua?fuente_id=eq.${f.id}&observaciones=like.*${encodeURIComponent(TAG)}*`,
      { method: 'DELETE', headers: h },
    )
  }

  console.log('Purge listo.')
}

async function main() {
  if (!url || !key) {
    console.error('Faltan VITE_SUPABASE_* en .env')
    process.exit(1)
  }

  console.log(`Seed demo histórico · tag=${TAG} · meses=${MONTHS} · purge=${PURGE}\n`)

  const auth = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const a = await auth.json()
  if (!a.access_token) {
    console.error('Auth falló', a.error_description || a)
    process.exit(1)
  }
  const token = a.access_token
  const userId = a.user.id

  const perfil = await rest(token, 'GET', 'perfiles_usuarios', {
    query: `select=*&id=eq.${userId}`,
  })
  const memb = await rest(token, 'GET', 'miembros_establecimiento', {
    query: `select=rol,establecimiento_id&usuario_id=eq.${userId}`,
  })
  const estId =
    perfil.data?.[0]?.establecimiento_activo_id || memb.data?.[0]?.establecimiento_id
  if (!estId) {
    console.error('Sin establecimiento activo')
    process.exit(1)
  }
  console.log('Establecimiento', estId)

  if (PURGE) await purgeDemo(token, estId)

  const potrerosR = await rest(token, 'GET', 'potreros', {
    query: `select=id,nombre,superficie_ha,activo&establecimiento_id=eq.${estId}&activo=eq.true`,
  })
  const potreros = potrerosR.data || []
  if (potreros.length < 1) {
    console.error('Se necesitan potreros activos')
    process.exit(1)
  }

  const fuentesR = await rest(token, 'GET', 'fuentes_de_agua', {
    query: `select=id,nombre&establecimiento_id=eq.${estId}&activo=eq.true`,
  })
  const fuentes = fuentesR.data || []

  // --- Lotes demo (6) ---
  const lotesSpec = [
    { id: `${TAG}-NOV`, cab: 120, peso0: 280, gdpv: 0.75, obj: 'Engorde', cc0: 5 },
    { id: `${TAG}-VAQ`, cab: 85, peso0: 240, gdpv: 0.65, obj: 'Recría', cc0: 5.5 },
    { id: `${TAG}-VAC`, cab: 60, peso0: 380, gdpv: 0.15, obj: 'Cría', cc0: 6 },
    { id: `${TAG}-TER`, cab: 95, peso0: 180, gdpv: 0.85, obj: 'Recría', cc0: 4.5 },
    { id: `${TAG}-INV`, cab: 140, peso0: 310, gdpv: 0.7, obj: 'Engorde', cc0: 5 },
    { id: `${TAG}-MIX`, cab: 45, peso0: 260, gdpv: 0.55, obj: 'Engorde', cc0: 4 },
  ]

  const lotes = []
  for (let i = 0; i < lotesSpec.length; i++) {
    const spec = lotesSpec[i]
    const pot = potreros[i % potreros.length]
    const loteId = randomUUID()
    const ingreso = monthsAgo(MONTHS)
    const created = await rest(token, 'POST', 'lotes', {
      body: {
        id: loteId,
        establecimiento_id: estId,
        identificacion: spec.id,
        cantidad_animales: spec.cab,
        potrero_actual_id: pot.id,
        activo: true,
        peso_ingreso_kg: spec.peso0,
        objetivo: spec.obj,
      },
    })
    if (!created.ok) {
      stats.errors.push(`lote ${spec.id}: ${created.status} ${String(created.raw).slice(0, 120)}`)
      continue
    }
    stats.lotes++
    lotes.push({ ...spec, uuid: loteId, potId: pot.id })

    // Movimiento inicial
    await rest(token, 'POST', 'movimientos_de_lotes', {
      body: {
        id: randomUUID(),
        lote_id: loteId,
        potrero_id: pot.id,
        fecha_entrada: isoDate(ingreso),
        observaciones: `${TAG} ingreso`,
      },
    })
    stats.movimientos++

    // Rotaciones cada ~45 días
    let curPot = pot.id
    for (let m = MONTHS - 2; m >= 0; m -= 2) {
      const other = potreros[(i + m + 1) % potreros.length]
      if (other.id === curPot) continue
      const fecha = monthsAgo(m)
      // cerrar abierto
      const abiertos = await rest(token, 'GET', 'movimientos_de_lotes', {
        query: `select=id&lote_id=eq.${loteId}&fecha_salida=is.null`,
      })
      for (const mov of abiertos.data || []) {
        await rest(token, 'PATCH', 'movimientos_de_lotes', {
          query: `id=eq.${mov.id}`,
          body: { fecha_salida: isoDate(fecha) },
        })
      }
      await rest(token, 'POST', 'movimientos_de_lotes', {
        body: {
          id: randomUUID(),
          lote_id: loteId,
          potrero_id: other.id,
          fecha_entrada: isoDate(fecha),
          observaciones: `${TAG} rotación`,
        },
      })
      await rest(token, 'PATCH', 'lotes', {
        query: `id=eq.${loteId}`,
        body: { potrero_actual_id: other.id },
      })
      curPot = other.id
      stats.movimientos++
    }
  }

  // --- Evaluaciones quincenales 12 meses ---
  for (const lote of lotes) {
    for (let day = 0; day <= MONTHS * 30; day += 14) {
      const fecha = addDays(monthsAgo(MONTHS), day)
      if (fecha > new Date()) break
      const dias = day
      const peso = Math.round((lote.peso0 + lote.gdpv * dias) * 10) / 10
      const cc = Math.min(8, Math.max(3, lote.cc0 + Math.sin(day / 40) * 0.8))
      const ev = await rest(token, 'POST', 'evaluaciones', {
        body: {
          id: randomUUID(),
          lote_id: lote.uuid,
          fecha_evaluacion: isoDate(fecha),
          peso_promedio_kg: peso,
          condicion_corporal: Math.round(cc * 2) / 2,
          observaciones: `${TAG} pesaje campo`,
        },
      })
      if (ev.ok) stats.evaluaciones++
      else stats.errors.push(`eval ${lote.id}: ${ev.status}`)
    }

    // Sanitarios cada ~60 días
    const tipos = ['Vacunación', 'Desparasitación', 'Baño garrapaticida', 'Revisión clínica']
    for (let m = MONTHS - 1; m >= 0; m -= 2) {
      const fecha = monthsAgo(m)
      const san = await rest(token, 'POST', 'eventos_sanitarios', {
        body: {
          id: randomUUID(),
          lote_id: lote.uuid,
          fecha: isoDate(fecha),
          tipo_evento: tipos[m % tipos.length],
          descripcion: `${TAG} plan sanitario`,
        },
      })
      if (san.ok) stats.sanitarios++
    }
  }

  // --- Lluvias (semanal, con estacionalidad NEA) ---
  for (let w = 0; w < MONTHS * 4; w++) {
    const fecha = addDays(monthsAgo(MONTHS), w * 7)
    if (fecha > new Date()) break
    const month = fecha.getMonth()
    // más lluvia verano
    const base = month >= 10 || month <= 3 ? 28 : 8
    const mm = Math.max(0, Math.round(base + (Math.random() * 40 - 10)))
    if (mm === 0 && Math.random() > 0.3) continue
    const r = await rest(token, 'POST', 'registros_lluvia', {
      body: {
        id: randomUUID(),
        establecimiento_id: estId,
        fecha: isoDate(fecha),
        milimetros: mm,
        observaciones: `${TAG} pluviómetro`,
      },
    })
    if (r.ok) stats.lluvias++
  }

  // --- Agua: análisis trimestrales ---
  for (const f of fuentes) {
    for (let m = MONTHS - 1; m >= 0; m -= 3) {
      const fecha = monthsAgo(m)
      const ph = +(6.8 + Math.random() * 1.2).toFixed(1)
      const tds = Math.round(700 + Math.random() * 1800)
      const an = await rest(token, 'POST', 'analisis_de_agua', {
        body: {
          id: randomUUID(),
          fuente_id: f.id,
          fecha_analisis: isoDate(fecha),
          metodo: 'Laboratorio campo',
          ph,
          solidos_totales: tds,
          conductividad_electrica: Math.round(tds * 0.85),
          dureza: Math.round(180 + Math.random() * 120),
          nitratos: Math.round(5 + Math.random() * 40),
          arsenico: 0,
          observaciones: `${TAG} control bebida`,
        },
      })
      if (an.ok) stats.analisis++
      const estado =
        tds > 5000 || ph < 5.5 || ph > 9 ? 'Peligro' : tds > 3000 ? 'Precaución' : 'Óptimo'
      await rest(token, 'PATCH', 'fuentes_de_agua', {
        query: `id=eq.${f.id}`,
        body: { ultimo_estado: estado },
      })
    }
  }

  // --- Inventario items + movimientos históricos ---
  const invSpecs = [
    { nombre: `${TAG} Maíz molido`, cat: 'alimento', stock: 12000, u: 'kg', precio: 180, min: 2000 },
    {
      nombre: `${TAG} Expeller soja`,
      cat: 'alimento',
      stock: 4500,
      u: 'kg',
      precio: 320,
      min: 800,
    },
    { nombre: `${TAG} Sal mineral`, cat: 'mineral', stock: 800, u: 'kg', precio: 950, min: 150 },
    {
      nombre: `${TAG} Ivermectina`,
      cat: 'sanidad',
      stock: 40,
      u: 'u',
      precio: 12500,
      min: 8,
    },
    {
      nombre: `${TAG} Vacuna aftosa`,
      cat: 'sanidad',
      stock: 25,
      u: 'u',
      precio: 18000,
      min: 5,
    },
    { nombre: `${TAG} Rollos alfalfa`, cat: 'forraje', stock: 180, u: 'u', precio: 22000, min: 30 },
  ]

  const invIds = []
  for (const spec of invSpecs) {
    const id = randomUUID()
    const inv = await rest(token, 'POST', 'inventario_items', {
      body: {
        id,
        establecimiento_id: estId,
        nombre: spec.nombre,
        categoria: spec.cat,
        stock_actual: spec.stock,
        unidad: spec.u,
        precio_unitario: spec.precio,
        stock_minimo_alerta: spec.min,
        activo: true,
      },
    })
    if (!inv.ok) {
      stats.errors.push(`inv ${spec.nombre}: ${inv.status}`)
      continue
    }
    stats.invItems++
    invIds.push({ id, ...spec })

    // Stock inicial como Compra
    await rest(token, 'POST', 'inventario_movimientos', {
      body: {
        item_id: id,
        lote_id: null,
        fecha: monthsAgo(MONTHS).toISOString(),
        tipo_movimiento: 'Compra',
        cantidad: spec.stock,
        costo_total: spec.stock * spec.precio,
        observaciones: `${TAG} stock inicial`,
      },
    })
    stats.invMovs++

    // Usos mensuales (negativos) + compras cada 3 meses
    for (let m = MONTHS - 1; m >= 0; m--) {
      const fecha = monthsAgo(m)
      const usoCant = Math.round(spec.stock * (0.04 + Math.random() * 0.06))
      const costo = usoCant * spec.precio
      const loteRef = lotes[m % Math.max(lotes.length, 1)]?.uuid || null
      const uso = await rest(token, 'POST', 'inventario_movimientos', {
        body: {
          item_id: id,
          lote_id: loteRef,
          fecha: addDays(fecha, 10).toISOString(),
          tipo_movimiento: 'Uso',
          cantidad: -usoCant,
          costo_total: costo,
          observaciones: `${TAG} consumo mes`,
        },
      })
      if (uso.ok) stats.invMovs++

      if (m % 3 === 0) {
        const compraCant = Math.round(usoCant * 2.2)
        const compra = await rest(token, 'POST', 'inventario_movimientos', {
          body: {
            item_id: id,
            lote_id: null,
            fecha: addDays(fecha, 2).toISOString(),
            tipo_movimiento: 'Compra',
            cantidad: compraCant,
            costo_total: compraCant * spec.precio,
            observaciones: `${TAG} reposición`,
          },
        })
        if (compra.ok) stats.invMovs++
      }
    }
  }

  // --- Alimentos + consumos ---
  if (lotes.length) {
    const alimId = randomUUID()
    const al = await rest(token, 'POST', 'alimentos', {
      body: {
        id: alimId,
        establecimiento_id: estId,
        nombre: `${TAG} Ración engorde`,
        precio_kg: 220,
        stock_kg: 8000,
      },
    })
    if (al.ok) {
      stats.alimentos++
      for (const lote of lotes.slice(0, 4)) {
        const c = await rest(token, 'POST', 'consumos_de_dieta', {
          body: {
            id: randomUUID(),
            lote_id: lote.uuid,
            dieta_id: null,
            alimento_id: alimId,
            fecha_inicio: isoDate(monthsAgo(4)),
            fecha_fin: null,
            kg_animal_dia: 8.5,
          },
        })
        if (c.ok) stats.consumos++
      }
    }
  }

  // --- NDVI en potreros (valores realistas de campo) ---
  for (let i = 0; i < potreros.length; i++) {
    const ndvi = +(0.28 + (i % 5) * 0.1 + Math.random() * 0.08).toFixed(3)
    const patch = await rest(token, 'PATCH', 'potreros', {
      query: `id=eq.${potreros[i].id}`,
      body: {
        ultimo_ndvi: ndvi,
        fecha_ultimo_ndvi: new Date().toISOString(),
      },
    })
    if (patch.ok) stats.potrerosNdvi++
  }

  // --- Notificaciones históricas (enviados) ---
  const alertMsgs = [
    { t: 'CC baja en lote', cat: 'sanidad', p: 'urgente' },
    { t: 'Pastura NDVI crítico con carga', cat: 'forraje', p: 'urgente' },
    { t: 'Stock mineral bajo mínimo', cat: 'insumos', p: 'normal' },
    { t: 'Agua TDS en precaución', cat: 'agua', p: 'normal' },
    { t: 'GDPV negativo detectado', cat: 'produccion', p: 'urgente' },
    { t: 'Recordatorio vacunación', cat: 'sanidad', p: 'normal' },
    { t: 'Rotación de potrero sugerida', cat: 'forraje', p: 'normal' },
    { t: 'Reposición maíz programada', cat: 'insumos', p: 'normal' },
  ]
  for (let i = 0; i < alertMsgs.length; i++) {
    const msg = alertMsgs[i]
    const fecha = monthsAgo(Math.min(MONTHS - 1, i))
    const n = await rest(token, 'POST', 'notificaciones_programadas', {
      body: {
        id: randomUUID(),
        establecimiento_id: estId,
        created_by: userId,
        titulo: `${TAG}: ${msg.t}`,
        mensaje: `Aviso operativo demo (${TAG}). Revisar dashboard y reportes.`,
        categoria: msg.cat,
        prioridad: msg.p,
        estado: 'enviado',
        fecha_programada: fecha.toISOString(),
        destinatarios_snapshot: [{ email, nombre: 'Demo' }],
      },
    })
    if (n.ok) stats.notifs++
  }

  console.log('\n=== RESUMEN SEED DEMO ===')
  console.log(JSON.stringify(stats, null, 2))
  if (stats.errors.length) {
    console.log('\nPrimeros errores:')
    stats.errors.slice(0, 12).forEach((e) => console.log(' -', e))
  }
  console.log(
    '\nListo. Abrí /reportes, /alertas, Dashboard, Despensa, Lluvias, Satélite — deberían verse series históricas.',
  )
  const ok =
    stats.lotes >= 4 &&
    stats.evaluaciones >= 50 &&
    stats.invMovs >= 20 &&
    stats.lluvias >= 10
  process.exit(ok ? 0 : 2)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
