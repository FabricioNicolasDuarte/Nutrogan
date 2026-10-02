import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const CRON_SECRET = Deno.env.get('ALERTAS_CRON_SECRET') || ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'Nutrogan Alertas <onboarding@resend.dev>'

function authorized(req: Request) {
  const bearer = req.headers.get('Authorization') || ''
  if (SERVICE && bearer === `Bearer ${SERVICE}`) return true
  const secret = req.headers.get('x-cron-secret') || ''
  return !!CRON_SECRET && secret === CRON_SECRET
}

async function rest(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${SERVICE}`,
      apikey: SERVICE,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) throw new Error(`No se pudo leer ${path.split('?')[0]}`)
  return res.json()
}

function gdpv(rows: { fecha_evaluacion: string; peso_promedio_kg: number | null }[]) {
  const pesos = rows
    .filter((r) => Number(r.peso_promedio_kg) > 0 && r.fecha_evaluacion)
    .sort((a, b) => String(a.fecha_evaluacion).localeCompare(String(b.fecha_evaluacion)))
  if (pesos.length < 2) return null
  const first = pesos[0]
  const last = pesos[pesos.length - 1]
  const days =
    (new Date(last.fecha_evaluacion).getTime() - new Date(first.fecha_evaluacion).getTime()) / 86400000
  if (!(days > 0.5)) return null
  const value = (Number(last.peso_promedio_kg) - Number(first.peso_promedio_kg)) / days
  if (!Number.isFinite(value) || Math.abs(value) >= 3) return null
  return value
}

function dia(value: unknown) {
  const s = String(value || '').slice(0, 10)
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return Date.UTC(y, m - 1, d)
}

function alertasDe(est: {
  lotes: Record<string, unknown>[]
  potreros: Record<string, unknown>[]
  items: Record<string, unknown>[]
  evaluaciones: Record<string, unknown>[]
  vision: Record<string, unknown>[]
  analisis: Record<string, unknown>[]
  fuentes: Record<string, unknown>[]
  movimientos: Record<string, unknown>[]
  lluvias: Record<string, unknown>[]
  situaciones: Record<string, unknown>[]
  mmEstimado: number | null
}) {
  const out: { category: string; title: string; message: string; severity: string }[] = []
  const carga: Record<string, number> = {}
  for (const lote of est.lotes) {
    if (lote.activo === false || !lote.potrero_actual_id) continue
    const id = String(lote.potrero_actual_id)
    carga[id] = (carga[id] || 0) + (Number(lote.cantidad_animales) || 0)
  }
  for (const p of est.potreros) {
    if (p.activo === false) continue
    const ndvi = Number(p.ultimo_ndvi)
    const cabezas = carga[String(p.id)] || 0
    if (Number.isFinite(ndvi) && ndvi < 0.3 && cabezas > 0) {
      out.push({
        category: 'forraje',
        severity: 'critical',
        title: `Pastura baja: ${p.nombre}`,
        message: `El verde del potrero está bajo y hay ${cabezas} cabezas.`,
      })
    }
  }
  for (const item of est.items) {
    if (item.activo === false) continue
    if (Number(item.stock_actual) <= 0) {
      out.push({
        category: 'stock',
        severity: 'critical',
        title: `Sin stock: ${item.nombre}`,
        message: 'No queda existencia para el próximo uso.',
      })
    }
  }
  const porFuente: Record<string, Record<string, unknown>> = {}
  for (const a of est.analisis) {
    const id = String(a.fuente_id || '')
    if (!id || porFuente[id]) continue
    porFuente[id] = a
  }
  for (const fuente of est.fuentes) {
    if (fuente.activo === false) continue
    const a = porFuente[String(fuente.id)]
    if (!a) continue
    const ph = Number(a.ph)
    const tds = Number(a.solidos_totales)
    if ((Number.isFinite(ph) && (ph < 5.5 || ph > 9)) || (Number.isFinite(tds) && tds > 5000)) {
      out.push({
        category: 'agua',
        severity: 'critical',
        title: `Agua en riesgo: ${fuente.nombre}`,
        message: 'El último análisis cargado supera el umbral de bebida. El laboratorio sigue mandando.',
      })
    }
  }
  for (const lote of est.lotes) {
    if (lote.activo === false) continue
    const evs = est.evaluaciones.filter((e) => e.lote_id === lote.id)
    const ganancia = gdpv(evs as { fecha_evaluacion: string; peso_promedio_kg: number | null }[])
    if (ganancia !== null && ganancia < 0) {
      out.push({
        category: 'sanidad',
        severity: 'critical',
        title: `El lote pierde kilos: ${lote.identificacion}`,
        message: `${ganancia.toFixed(3)} kg por día entre los dos pesos cargados.`,
      })
    }
    const conCc = [...evs]
      .filter((e) => Number.isFinite(Number(e.condicion_corporal)))
      .sort((a, b) => String(b.fecha_evaluacion).localeCompare(String(a.fecha_evaluacion)))
    if (conCc[0] && Number(conCc[0].condicion_corporal) <= 3.5) {
      out.push({
        category: 'sanidad',
        severity: 'warn',
        title: `Condición baja: ${lote.identificacion}`,
        message: `Última condición ${conCc[0].condicion_corporal}.`,
      })
    }
    const vision = est.vision
      .filter((r) => r.lote_id === lote.id)
      .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))
    const fecal = vision.find((r) => r.modo === 'fecal')
    if (fecal?.presencia_parasitos) {
      out.push({
        category: 'sanidad',
        severity: 'critical',
        title: `Signos de parásitos: ${lote.identificacion}`,
        message: `Lectura fecal ${fecal.consistencia || ''} ${fecal.color || ''}.`.trim(),
      })
    }
    const anomalia = vision.find((r) => r.modo === 'anomalia')
    if (anomalia?.gravedad === 'seria') {
      out.push({
        category: 'sanidad',
        severity: 'warn',
        title: `Anomalía seria: ${lote.identificacion}`,
        message: String(anomalia.texto_confirmado || 'La última foto marcó algo serio.'),
      })
    }

    const potrero = est.potreros.find((p) => p.id === lote.potrero_actual_id)
    const ndvi = Number(potrero?.ultimo_ndvi)
    const entrada = (est.movimientos || [])
      .filter(
        (m) => m.lote_id === lote.id && m.potrero_id === lote.potrero_actual_id && !m.fecha_salida,
      )
      .sort((a, b) => String(b.fecha_entrada).localeCompare(String(a.fecha_entrada)))[0]
    const hoyUtc = dia(new Date().toISOString())
    const dias =
      entrada && hoyUtc != null && dia(entrada.fecha_entrada) != null
        ? Math.round((hoyUtc - (dia(entrada.fecha_entrada) as number)) / 86400000)
        : null
    const desdeLluvia = hoyUtc != null ? hoyUtc - 30 * 86400000 : null
    let mm = 0
    let lluviasN = 0
    for (const row of est.lluvias || []) {
      const t = dia(row.fecha)
      const valor = Number(row.milimetros)
      if (t == null || desdeLluvia == null || !Number.isFinite(valor)) continue
      if (t >= desdeLluvia && hoyUtc != null && t <= hoyUtc) {
        mm += valor
        lluviasN += 1
      }
    }
    const pide = (est.situaciones || []).find((s) => {
      if (s.lote_id !== lote.id || !s.pedir_revision) return false
      const t = dia(s.fecha)
      if (t == null || hoyUtc == null) return false
      const edad = Math.round((hoyUtc - t) / 86400000)
      return edad >= 0 && edad <= 60
    })
    if (pide) {
      const categoria =
        pide.ambito === 'sanidad'
          ? 'sanidad'
          : pide.ambito === 'agua'
            ? 'agua'
            : pide.ambito === 'potrero'
              ? 'forraje'
              : pide.ambito === 'comida'
                ? 'stock'
                : 'general'
      out.push({
        category: categoria,
        severity: 'warn',
        title: `Situación a revisar: ${lote.identificacion}`,
        message: `${pide.tipo}${pide.detalle ? `: ${pide.detalle}` : ''}`,
      })
    }

    const usaGrilla = lluviasN === 0 && est.mmEstimado != null
    const mmUsado = lluviasN > 0 ? mm : est.mmEstimado
    if (
      dias != null &&
      dias >= 21 &&
      Number.isFinite(ndvi) &&
      ndvi < 0.4 &&
      mmUsado != null &&
      mmUsado < 20
    ) {
      out.push({
        category: 'forraje',
        severity: 'warn',
        title: `Conviene rotar: ${lote.identificacion}`,
        message: `Lleva ${dias} días en el potrero, el vigor es ${ndvi.toFixed(2)} y en 30 días ${
          usaGrilla ? 'la grilla estima' : 'llovieron'
        } ${Number(mmUsado).toFixed(0)} mm. ${
          usaGrilla ? 'No es el pluviómetro del campo. ' : ''
        }El satélite no dice kilos de pasto.`,
      })
    }
  }
  return out
}

async function enviar(to: string[], titulo: string, mensaje: string) {
  if (!RESEND_API_KEY || !to.length) return false
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to,
      subject: titulo,
      html: `<p>${mensaje.replace(/\n/g, '<br/>')}</p><p><a href="https://www.nutrogan.site">Abrir Nutrogan</a></p>`,
    }),
  })
  return res.ok
}

async function refrescarVigor(estId: string) {
  if (!SUPABASE_URL || !SERVICE) return
  await fetch(`${SUPABASE_URL}/functions/v1/analizar-ndvi`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE}`,
      apikey: SERVICE,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ establecimiento_id: estId, guardar_serie: true, max_potreros: 6 }),
  })
}

function centroPoligono(raw: unknown) {
  try {
    let geo: any = raw
    if (typeof geo === 'string') geo = JSON.parse(geo)
    if (geo?.type === 'Feature') geo = geo.geometry
    const ring = geo?.type === 'Polygon' ? geo.coordinates?.[0] : null
    if (!Array.isArray(ring) || ring.length < 3) return null
    let lng = 0
    let lat = 0
    const n = ring[0][0] === ring[ring.length - 1][0] ? ring.length - 1 : ring.length
    for (let i = 0; i < n; i++) {
      lng += Number(ring[i][0])
      lat += Number(ring[i][1])
    }
    if (!n) return null
    return { lat: lat / n, lng: lng / n }
  } catch {
    return null
  }
}

async function mmGrilla(lat: number, lng: number) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum&timezone=auto&past_days=30&forecast_days=1`,
  )
  if (!res.ok) return null
  const data = await res.json()
  const dias: string[] = data?.daily?.time || []
  const valores: number[] = data?.daily?.precipitation_sum || []
  const hoy = new Date().toISOString().slice(0, 10)
  let suma = 0
  let n = 0
  for (let i = 0; i < dias.length; i++) {
    if (dias[i] > hoy) continue
    const valor = Number(valores[i])
    if (!Number.isFinite(valor)) continue
    suma += valor
    n += 1
  }
  return n ? suma : null
}

async function redactarParte(texto: string) {
  const key = Deno.env.get('GOOGLE_API_KEY')
  if (!key || !texto.trim()) return null
  const prompt = `Redactá en español, en cuatro oraciones como máximo, el parte de este establecimiento ganadero.
Reglas: usá solo las cifras que ya están escritas abajo. No inventes pesos, kilos de pasto, precios ni diagnósticos. Si un dato no está, no lo completes.
Texto:
${texto.slice(0, 4000)}`
  for (const model of ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-flash']) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    )
    if (!res.ok) continue
    const data = await res.json()
    const parte = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (parte) return String(parte).trim()
  }
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (!authorized(req)) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const hoy = new Date().toISOString().slice(0, 10)
  const establecimientos = await rest('establecimientos?select=id,nombre')
  let enviados = 0

  for (const est of establecimientos) {
    const ya = await rest(
      `notificaciones_programadas?select=id&establecimiento_id=eq.${est.id}&titulo=eq.Resumen%20diario&fecha_programada=gte.${hoy}T00:00:00`,
    )
    if (Array.isArray(ya) && ya.length) continue

    try {
      await refrescarVigor(est.id)
    } catch {
      /* el correo sigue con el último vigor guardado */
    }

    const [lotes, potreros, items, fuentes, perfiles] = await Promise.all([
      rest(`lotes?select=id,identificacion,activo,potrero_actual_id,cantidad_animales&establecimiento_id=eq.${est.id}`),
      rest(`potreros?select=id,nombre,activo,ultimo_ndvi,superficie_ha,geometria&establecimiento_id=eq.${est.id}`),
      rest(`inventario_items?select=id,nombre,activo,stock_actual&establecimiento_id=eq.${est.id}`),
      rest(`fuentes_de_agua?select=id,nombre,activo&establecimiento_id=eq.${est.id}`),
      rest(
        `perfiles_usuarios?select=email,nombre_completo,config_notificaciones&establecimiento_id=eq.${est.id}`,
      ),
    ])
    const loteIds = (lotes || []).map((l: { id: string }) => l.id).join(',')
    const fuenteIds = (fuentes || []).map((f: { id: string }) => f.id).join(',')
    const evaluaciones = loteIds
      ? await rest(
          `evaluaciones?select=lote_id,fecha_evaluacion,peso_promedio_kg,condicion_corporal&lote_id=in.(${loteIds})`,
        )
      : []
    const vision = loteIds
      ? await rest(
          `registros_vision?select=lote_id,modo,fecha,presencia_parasitos,consistencia,color,gravedad,texto_confirmado&lote_id=in.(${loteIds})&order=fecha.desc`,
        )
      : []
    const analisis = fuenteIds
      ? await rest(
          `analisis_de_agua?select=fuente_id,fecha_analisis,ph,solidos_totales&fuente_id=in.(${fuenteIds})&order=fecha_analisis.desc`,
        )
      : []

    const movimientos = loteIds
      ? await rest(
          `movimientos_de_lotes?select=lote_id,potrero_id,fecha_entrada,fecha_salida&lote_id=in.(${loteIds})`,
        )
      : []
    const lluvias = await rest(
      `registros_lluvia?select=fecha,milimetros&establecimiento_id=eq.${est.id}`,
    )
    const desde = Date.now() - 30 * 86400000
    const huboLluvia = (lluvias || []).some((row: { fecha?: string; milimetros?: number }) => {
      const t = new Date(String(row.fecha || '').slice(0, 10)).getTime()
      return Number.isFinite(t) && t >= desde && Number.isFinite(Number(row.milimetros))
    })
    let mmEstimado: number | null = null
    if (!huboLluvia) {
      const conGeo = (potreros || []).find((p: { geometria?: unknown }) => p.geometria)
      const centro = centroPoligono(conGeo?.geometria)
      if (centro) {
        try {
          mmEstimado = await mmGrilla(centro.lat, centro.lng)
        } catch {
          mmEstimado = null
        }
      }
    }
    const situaciones = loteIds
      ? await rest(
          `situaciones_lote?select=lote_id,fecha,tipo,detalle,ambito,pedir_revision&lote_id=in.(${loteIds})&pedir_revision=eq.true`,
        )
      : []

    const alerts = alertasDe({
      lotes,
      potreros,
      items,
      evaluaciones,
      vision,
      analisis,
      fuentes,
      movimientos,
      lluvias,
      situaciones,
      mmEstimado,
    })
    if (!alerts.length) continue

    const categorias = new Set(alerts.map((a) => a.category))
    const destinatarios = (perfiles || []).filter((p: { email?: string; config_notificaciones?: Record<string, boolean> }) => {
      if (!p.email) return false
      const cfg = p.config_notificaciones || {}
      return [...categorias].some((c) => cfg[c])
    })
    const emails = destinatarios.map((p: { email: string }) => p.email)
    const mensaje = alerts.map((a) => `• ${a.title}\n${a.message}`).join('\n\n')
    const parte = await redactarParte(mensaje)
    const cuerpo = parte ? `${parte}\n\n${mensaje}` : mensaje
    const titulo = `Nutrogan: ${alerts.length} aviso${alerts.length === 1 ? '' : 's'} del día`
    const ok = await enviar(emails, titulo, cuerpo)

    await fetch(`${SUPABASE_URL}/rest/v1/notificaciones_programadas`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE}`,
        apikey: SERVICE,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        establecimiento_id: est.id,
        titulo: 'Resumen diario',
        mensaje,
        categoria: 'general',
        prioridad: alerts.some((a) => a.severity === 'critical') ? 'urgente' : 'normal',
        fecha_programada: new Date().toISOString(),
        estado: ok ? 'enviado' : emails.length ? 'fallido' : 'sin destinatarios',
        destinatarios_snapshot: destinatarios.map((p: { email: string; nombre_completo?: string }) => ({
          email: p.email,
          nombre: p.nombre_completo || '',
        })),
      }),
    })
    if (ok) enviados += 1
  }

  return new Response(JSON.stringify({ ok: true, establecimientos: establecimientos.length, enviados }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
