/**
 * Smoke de edge functions Nutrogan (requiere .env con VITE_SUPABASE_* y usuario demo).
 * Uso: node scripts/smoke-edges.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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

function ok(name, pass, detail = '') {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
  return pass
}

async function main() {
  let fails = 0
  const auth = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const a = await auth.json()
  if (!ok('auth', !!a.access_token, a.error_description || a.msg || '')) fails++
  if (!a.access_token) process.exit(1)

  const h = {
    apikey: key,
    Authorization: `Bearer ${a.access_token}`,
    'Content-Type': 'application/json',
  }

  let r = await fetch(`${url}/functions/v1/get-market-price`, { method: 'POST', headers: h, body: '{}' })
  let t = await r.text()
  if (!ok('get-market-price', r.ok && t.includes('precio'), `${r.status} ${t.slice(0, 120)}`)) fails++

  r = await fetch(`${url}/functions/v1/asistente-ia`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ prompt: 'Respondé solo: OK.', dataContext: { smoke: true } }),
  })
  t = await r.text()
  if (!ok('asistente-ia', r.ok && /OK/i.test(t), `${r.status} ${t.slice(0, 160)}`)) fails++

  const pots = await (
    await fetch(`${url}/rest/v1/potreros?select=id,nombre,geometria&activo=eq.true&limit=10`, {
      headers: h,
    })
  ).json()
  const withGeo = (pots || []).find((p) => p.geometria)
  if (!withGeo) {
    ok('analizar-ndvi', false, 'sin potrero con geometría')
    fails++
  } else {
    r = await fetch(`${url}/functions/v1/analizar-ndvi`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ potrero_id: withGeo.id }),
    })
    t = await r.text()
    // Credenciales Sentinel en secrets — si fallan, reportar como infra no código
    const pass = r.ok
    if (!ok('analizar-ndvi', pass, `${r.status} ${t.slice(0, 200)}`)) {
      if (/invalid_client|credentials|SENTINEL|AGRO/i.test(t)) {
        console.log(
          'NOTE  NDVI: actualizar secrets Sentinel Hub / Agromonitoring en Supabase Edge Functions.',
        )
      }
      fails++
    }
  }

  const lotes = await (
    await fetch(
      `${url}/rest/v1/lotes?select=identificacion,cantidad_animales,potrero_actual_id&activo=eq.true`,
      { headers: h },
    )
  ).json()
  const total = lotes.reduce((s, l) => s + (l.cantidad_animales || 0), 0)
  const pasto = lotes
    .filter((l) => l.potrero_actual_id)
    .reduce((s, l) => s + (l.cantidad_animales || 0), 0)
  ok('datos EN PASTO', total > 0 && pasto === total, `${pasto}/${total}`)

  process.exit(fails ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
