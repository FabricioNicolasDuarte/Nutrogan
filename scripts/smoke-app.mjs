/**
 * Smoke funcional Nutrogan — prueba dominios REST + edges contra Supabase live.
 *
 * Uso:
 *   npm run test:smoke
 *   NUTROGAN_SMOKE_EMAIL=... NUTROGAN_SMOKE_PASSWORD=... npm run test:smoke
 *
 * No escribe datos destructivos (solo lectura + edges de lectura/cálculo).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { calcGdpv } from '../src/utils/gdpv.js'
import { cabezasEnPasto, cabezasTotales, pctEnPasto } from '../src/utils/livestockKpis.js'

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

const results = []

function ok(name, pass, detail = '') {
  const line = `${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`
  console.log(line)
  results.push({ name, pass: !!pass, detail })
  return !!pass
}

async function rest(h, table, query = 'select=*') {
  const r = await fetch(`${url}/rest/v1/${table}?${query}`, { headers: h })
  const t = await r.text()
  let data
  try {
    data = JSON.parse(t)
  } catch {
    data = t
  }
  return { ok: r.ok, status: r.status, data, raw: t }
}

async function edge(h, name, body = {}) {
  const r = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify(body),
  })
  const t = await r.text()
  return { ok: r.ok, status: r.status, raw: t }
}

async function main() {
  let fails = 0
  const fail = (n, p, d) => {
    if (!ok(n, p, d)) fails++
  }

  if (!url || !key) {
    console.error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_KEY en .env')
    process.exit(1)
  }

  // --- AUTH ---
  const auth = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const a = await auth.json()
  fail('auth.login', !!a.access_token, a.error_description || a.msg || email)
  if (!a.access_token) {
    writeReport(fails)
    process.exit(1)
  }

  const userId = a.user?.id
  const h = {
    apikey: key,
    Authorization: `Bearer ${a.access_token}`,
    'Content-Type': 'application/json',
  }

  // --- PERFIL / ROL / ESTABLECIMIENTO ---
  const perfil = await rest(h, 'perfiles_usuarios', `select=*&id=eq.${userId}`)
  fail(
    'rest.perfiles_usuarios',
    perfil.ok && perfil.data?.[0]?.id === userId,
    `${perfil.status}`,
  )

  const memb = await rest(
    h,
    'miembros_establecimiento',
    `select=rol,establecimiento_id,establecimientos(id,nombre)&usuario_id=eq.${userId}`,
  )
  fail(
    'rest.miembros_establecimiento',
    memb.ok && Array.isArray(memb.data) && memb.data.length > 0,
    `${memb.status} n=${memb.data?.length ?? 0}`,
  )
  const rol = memb.data?.[0]?.rol
  fail('auth.rol_asignado', ['admin', 'tecnico', 'operario'].includes(rol), String(rol))

  const estId =
    perfil.data?.[0]?.establecimiento_activo_id ||
    memb.data?.[0]?.establecimiento_id ||
    memb.data?.[0]?.establecimientos?.id

  fail('auth.establecimiento', !!estId, String(estId || 'none'))

  // --- LOTES / EN PASTO ---
  const lotes = await rest(
    h,
    'lotes',
    'select=id,identificacion,cantidad_animales,potrero_actual_id,activo,establecimiento_id&activo=eq.true',
  )
  fail('rest.lotes', lotes.ok && Array.isArray(lotes.data), `${lotes.status}`)
  const total = cabezasTotales(lotes.data || [])
  const pasto = cabezasEnPasto(lotes.data || [])
  const pct = pctEnPasto(lotes.data || [])
  fail(
    'kpi.EN_PASTO',
    total > 0 && pasto === total,
    `${pasto}/${total} (${pct}%)`,
  )

  // --- POTREROS / GIS ---
  const potreros = await rest(
    h,
    'potreros',
    'select=id,nombre,geometria,ultimo_ndvi,fecha_ultimo_ndvi,activo&activo=eq.true',
  )
  fail('rest.potreros', potreros.ok && (potreros.data?.length || 0) > 0, `n=${potreros.data?.length}`)
  const withGeo = (potreros.data || []).find((p) => p.geometria)
  fail('gis.potrero_con_geometria', !!withGeo, withGeo?.nombre || 'none')

  // --- EVALUACIONES / GDPV ---
  const evals = await rest(
    h,
    'evaluaciones',
    'select=id,lote_id,peso_promedio_kg,fecha_evaluacion,condicion_corporal&order=fecha_evaluacion.desc&limit=50',
  )
  fail('rest.evaluaciones', evals.ok, `${evals.status} n=${evals.data?.length ?? 0}`)
  if (evals.ok && evals.data?.length) {
    const byLote = {}
    for (const e of evals.data) {
      if (!e.lote_id) continue
      ;(byLote[e.lote_id] ||= []).push(e)
    }
    const sample = Object.values(byLote).find((arr) => arr.length >= 2)
    if (sample) {
      const g = calcGdpv(sample)
      fail(
        'kpi.GDPV_sample',
        g === null || Number.isFinite(g),
        g === null ? 'N/A (honest)' : `${g.toFixed(3)} kg/d`,
      )
    } else {
      ok('kpi.GDPV_sample', true, 'skip — sin lote con ≥2 pesos')
    }
  }

  // --- INVENTARIO / DESPENSA ---
  const inv = await rest(
    h,
    'inventario_items',
    'select=id,nombre,stock_actual,precio_unitario&limit=20',
  )
  fail('rest.inventario_items', inv.ok, `${inv.status} n=${inv.data?.length ?? 0}`)

  // --- AGUA ---
  const agua = await rest(h, 'fuentes_de_agua', 'select=id,nombre,tipo,activo&limit=20')
  fail('rest.fuentes_de_agua', agua.ok, `${agua.status} n=${agua.data?.length ?? 0}`)

  // --- LLUVIAS ---
  const lluvia = await rest(
    h,
    'registros_lluvia',
    'select=id,fecha,milimetros&order=fecha.desc&limit=10',
  )
  fail('rest.registros_lluvia', lluvia.ok, `${lluvia.status} n=${lluvia.data?.length ?? 0}`)

  // --- NOTIFICACIONES ---
  const notif = await rest(
    h,
    'notificaciones_programadas',
    'select=id,titulo,estado&limit=10',
  )
  fail(
    'rest.notificaciones_programadas',
    notif.ok || notif.status === 404,
    `${notif.status}`,
  )

  // --- EVENTOS (lectura) ---
  const san = await rest(h, 'eventos_sanitarios', 'select=id&limit=5')
  fail('rest.eventos_sanitarios', san.ok || san.status === 404, `${san.status}`)
  const mov = await rest(h, 'movimientos_de_lotes', 'select=id&limit=5')
  fail('rest.movimientos_de_lotes', mov.ok || mov.status === 404, `${mov.status}`)
  const estab = await rest(h, 'establecimientos', `select=id,nombre&id=eq.${estId}`)
  fail(
    'rest.establecimientos',
    estab.ok && estab.data?.[0]?.id === estId,
    `${estab.status}`,
  )

  // --- EDGES ---
  let e = await edge(h, 'get-market-price', {})
  fail('edge.get-market-price', e.ok && /precio/i.test(e.raw), `${e.status} ${e.raw.slice(0, 100)}`)

  e = await edge(h, 'asistente-ia', {
    prompt: 'Respondé solo: OK.',
    dataContext: { smoke: true },
  })
  fail('edge.asistente-ia', e.ok && /OK/i.test(e.raw), `${e.status} ${e.raw.slice(0, 120)}`)

  if (withGeo && estId) {
    e = await edge(h, 'analizar-ndvi', {
      establecimiento_id: estId,
      potrero_ids: [withGeo.id],
    })
    fail(
      'edge.analizar-ndvi',
      e.ok &&
        (/exitoso|"ndvi"|sentinel2|planetary|Actualización/i.test(e.raw) || e.raw.includes('ndvi')) &&
        !/invalid_client|getSentinelToken/i.test(e.raw),
      `${e.status} ${e.raw.slice(0, 180)}`,
    )
  } else {
    fail('edge.analizar-ndvi', false, 'sin potrero/geo o establecimiento')
  }

  // send-alert sin destinatarios = no-op OK (no envía mail)
  e = await edge(h, 'send-alert', {
    titulo: 'Smoke',
    mensaje: 'test',
    prioridad: 'normal',
    categoria: 'general',
    destinatarios: [],
  })
  fail(
    'edge.send-alert.empty',
    e.ok && /Sin destinatarios|success/i.test(e.raw),
    `${e.status} ${e.raw.slice(0, 120)}`,
  )

  // invite-user: esperamos rechazo controlado sin payload completo (no crear usuarios)
  e = await edge(h, 'invite-user', {})
  fail(
    'edge.invite-user.reachable',
    e.status !== 404,
    `${e.status} ${e.raw.slice(0, 120)}`,
  )

  writeReport(fails)
  process.exit(fails ? 1 : 0)
}

function writeReport(fails) {
  const out = {
    ran_at: new Date().toISOString(),
    fails,
    results,
  }
  const dest = path.join(root, 'docs', 'SMOKE_APP_RESULT.json')
  fs.writeFileSync(dest, JSON.stringify(out, null, 2))
  console.log(`\nReport → docs/SMOKE_APP_RESULT.json (${results.length} checks, ${fails} fails)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
