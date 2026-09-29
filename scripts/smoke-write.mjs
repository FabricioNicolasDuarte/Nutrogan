/**
 * Smoke de escritura end-to-end Nutrogan.
 * Crea, mueve, actualiza, borra y envía alertas — luego limpia todo lo marcado SMOKE-E2E.
 *
 * Uso: npm run test:smoke:write
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
const TAG = `SMOKE-E2E-${Date.now()}`
const results = []
const cleanup = {
  loteId: null,
  loteOriginalPotrero: null,
  evalIds: [],
  eventoIds: [],
  lluviaIds: [],
  invItemIds: [],
  analisisIds: [],
  notifIds: [],
  movIds: [],
  movedLoteId: null,
  movedFrom: null,
  movedTo: null,
}

function log(name, pass, detail = '') {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
  results.push({ name, pass: !!pass, detail })
  return !!pass
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

async function edge(token, name, body) {
  const r = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  const t = await r.text()
  let data
  try {
    data = JSON.parse(t)
  } catch {
    data = t
  }
  return { ok: r.ok, status: r.status, data, raw: t }
}

async function cleanupAll(token) {
  console.log('\n--- CLEANUP ---')
  const h = headers(token)

  for (const id of cleanup.evalIds) {
    await fetch(`${url}/rest/v1/evaluaciones?id=eq.${id}`, { method: 'DELETE', headers: h })
  }
  for (const id of cleanup.eventoIds) {
    await fetch(`${url}/rest/v1/eventos_sanitarios?id=eq.${id}`, { method: 'DELETE', headers: h })
  }
  for (const id of cleanup.lluviaIds) {
    await fetch(`${url}/rest/v1/registros_lluvia?id=eq.${id}`, { method: 'DELETE', headers: h })
  }
  for (const id of cleanup.analisisIds) {
    await fetch(`${url}/rest/v1/analisis_de_agua?id=eq.${id}`, { method: 'DELETE', headers: h })
  }
  for (const id of cleanup.notifIds) {
    await fetch(`${url}/rest/v1/notificaciones_programadas?id=eq.${id}`, {
      method: 'DELETE',
      headers: h,
    })
  }
  for (const id of cleanup.movIds) {
    await fetch(`${url}/rest/v1/movimientos_de_lotes?id=eq.${id}`, {
      method: 'DELETE',
      headers: h,
    })
  }
  for (const id of cleanup.invItemIds) {
    await fetch(`${url}/rest/v1/inventario_items?id=eq.${id}`, {
      method: 'PATCH',
      headers: h,
      body: JSON.stringify({ activo: false, nombre: `${TAG}-deleted` }),
    })
  }

  // Restaurar lote real movido
  if (cleanup.movedLoteId && cleanup.movedFrom) {
    await fetch(`${url}/rest/v1/lotes?id=eq.${cleanup.movedLoteId}`, {
      method: 'PATCH',
      headers: h,
      body: JSON.stringify({ potrero_actual_id: cleanup.movedFrom }),
    })
    console.log(`REST  lote real restaurado → potrero ${cleanup.movedFrom}`)
  }

  // Soft-delete lote smoke
  if (cleanup.loteId) {
    await fetch(`${url}/rest/v1/lotes?id=eq.${cleanup.loteId}`, {
      method: 'PATCH',
      headers: h,
      body: JSON.stringify({ activo: false, identificacion: `${TAG}-OFF` }),
    })
    // hard delete if allowed
    await fetch(`${url}/rest/v1/lotes?id=eq.${cleanup.loteId}`, {
      method: 'DELETE',
      headers: h,
    })
  }

  // Barrido residual por tag en identificacion/observaciones
  await fetch(
    `${url}/rest/v1/registros_lluvia?observaciones=like.*${encodeURIComponent(TAG)}*`,
    { method: 'DELETE', headers: h },
  )
}

async function main() {
  let fails = 0
  const check = (n, p, d) => {
    if (!log(n, p, d)) fails++
  }

  if (!url || !key) {
    console.error('Faltan VITE_SUPABASE_* en .env')
    process.exit(1)
  }

  console.log(`TAG ${TAG}\n`)

  // AUTH
  const auth = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const a = await auth.json()
  check('auth.login', !!a.access_token, a.error_description || email)
  if (!a.access_token) {
    writeReport(fails)
    process.exit(1)
  }
  const token = a.access_token
  const userId = a.user.id

  try {
    const perfil = await rest(token, 'GET', 'perfiles_usuarios', {
      query: `select=*&id=eq.${userId}`,
    })
    const memb = await rest(token, 'GET', 'miembros_establecimiento', {
      query: `select=rol,establecimiento_id&usuario_id=eq.${userId}`,
    })
    const estId =
      perfil.data?.[0]?.establecimiento_activo_id || memb.data?.[0]?.establecimiento_id
    check('ctx.establecimiento', !!estId, estId)

    const potreros = await rest(token, 'GET', 'potreros', {
      query: `select=id,nombre,geometria,activo&establecimiento_id=eq.${estId}&activo=eq.true`,
    })
    const pots = potreros.data || []
    check('ctx.potreros', pots.length >= 2, `n=${pots.length}`)
    const potA = pots[0]
    const potB = pots.find((p) => p.id !== potA.id) || pots[0]
    const potGeo = pots.find((p) => p.geometria) || potA

    const lotes = await rest(token, 'GET', 'lotes', {
      query: `select=id,identificacion,potrero_actual_id,cantidad_animales&establecimiento_id=eq.${estId}&activo=eq.true&limit=20`,
    })
    const loteReal = (lotes.data || []).find((l) => l.potrero_actual_id)
    check('ctx.lote_real', !!loteReal, loteReal?.identificacion)

    // ========== CREATE LOTE SMOKE ==========
    const loteId = randomUUID()
    const created = await rest(token, 'POST', 'lotes', {
      body: {
        id: loteId,
        establecimiento_id: estId,
        identificacion: TAG,
        cantidad_animales: 3,
        potrero_actual_id: potA.id,
        activo: true,
        peso_ingreso_kg: 250,
        objetivo: 'Engorde',
      },
    })
    cleanup.loteId = created.ok ? loteId : null
    check('write.lote.create', created.ok && created.data?.[0]?.id === loteId, `${created.status} ${created.raw?.slice?.(0, 120) || ''}`)

    // ========== MOVE LOTE SMOKE A → B ==========
    const today = new Date().toISOString().slice(0, 10)
    if (created.ok) {
      const abiertos = await rest(token, 'GET', 'movimientos_de_lotes', {
        query: `select=id&lote_id=eq.${loteId}&fecha_salida=is.null`,
      })
      for (const m of abiertos.data || []) {
        await rest(token, 'PATCH', 'movimientos_de_lotes', {
          query: `id=eq.${m.id}`,
          body: { fecha_salida: today },
        })
      }
      const mov = await rest(token, 'POST', 'movimientos_de_lotes', {
        body: {
          id: randomUUID(),
          lote_id: loteId,
          potrero_id: potB.id,
          fecha_entrada: today,
          observaciones: `${TAG} move A→B`,
        },
      })
      if (mov.data?.[0]?.id) cleanup.movIds.push(mov.data[0].id)
      const updLote = await rest(token, 'PATCH', 'lotes', {
        query: `id=eq.${loteId}`,
        body: { potrero_actual_id: potB.id },
      })
      check(
        'write.lote.move_A_to_B',
        mov.ok && updLote.ok && updLote.data?.[0]?.potrero_actual_id === potB.id,
        `${potA.nombre} → ${potB.nombre}`,
      )

      const mov2 = await rest(token, 'POST', 'movimientos_de_lotes', {
        body: {
          id: randomUUID(),
          lote_id: loteId,
          potrero_id: potA.id,
          fecha_entrada: today,
          observaciones: `${TAG} move B→A`,
        },
      })
      if (mov2.data?.[0]?.id) cleanup.movIds.push(mov2.data[0].id)
      if (mov.data?.[0]?.id) {
        await rest(token, 'PATCH', 'movimientos_de_lotes', {
          query: `id=eq.${mov.data[0].id}`,
          body: { fecha_salida: today },
        })
      }
      const back = await rest(token, 'PATCH', 'lotes', {
        query: `id=eq.${loteId}`,
        body: { potrero_actual_id: potA.id },
      })
      check('write.lote.move_back', back.ok && back.data?.[0]?.potrero_actual_id === potA.id)
    } else {
      check('write.lote.move_A_to_B', false, 'skip — create falló')
      check('write.lote.move_back', false, 'skip')
    }

    // ========== MOVE LOTE REAL (y restaurar) ==========
    if (loteReal && potB && loteReal.potrero_actual_id !== potB.id) {
      cleanup.movedLoteId = loteReal.id
      cleanup.movedFrom = loteReal.potrero_actual_id
      cleanup.movedTo = potB.id
      const movR = await rest(token, 'POST', 'movimientos_de_lotes', {
        body: {
          id: randomUUID(),
          lote_id: loteReal.id,
          potrero_id: potB.id,
          fecha_entrada: today,
          observaciones: `${TAG} move real temp`,
        },
      })
      if (movR.data?.[0]?.id) cleanup.movIds.push(movR.data[0].id)
      // cerrar previos abiertos del lote real
      const ab = await rest(token, 'GET', 'movimientos_de_lotes', {
        query: `select=id&lote_id=eq.${loteReal.id}&fecha_salida=is.null`,
      })
      for (const m of ab.data || []) {
        if (m.id !== movR.data?.[0]?.id) {
          await rest(token, 'PATCH', 'movimientos_de_lotes', {
            query: `id=eq.${m.id}`,
            body: { fecha_salida: today },
          })
        }
      }
      const patchR = await rest(token, 'PATCH', 'lotes', {
        query: `id=eq.${loteReal.id}`,
        body: { potrero_actual_id: potB.id },
      })
      const verify = await rest(token, 'GET', 'lotes', {
        query: `select=potrero_actual_id&id=eq.${loteReal.id}`,
      })
      check(
        'write.lote_real.move_temp',
        patchR.ok && verify.data?.[0]?.potrero_actual_id === potB.id,
        `${loteReal.identificacion} → ${potB.nombre}`,
      )
      // restaurar inmediato
      await rest(token, 'PATCH', 'lotes', {
        query: `id=eq.${loteReal.id}`,
        body: { potrero_actual_id: cleanup.movedFrom },
      })
      if (movR.data?.[0]?.id) {
        await rest(token, 'PATCH', 'movimientos_de_lotes', {
          query: `id=eq.${movR.data[0].id}`,
          body: { fecha_salida: today },
        })
      }
      const restV = await rest(token, 'GET', 'lotes', {
        query: `select=potrero_actual_id&id=eq.${loteReal.id}`,
      })
      check(
        'write.lote_real.restore',
        restV.data?.[0]?.potrero_actual_id === cleanup.movedFrom,
        cleanup.movedFrom,
      )
      cleanup.movedLoteId = null
    } else {
      check('write.lote_real.move_temp', true, 'skip — mismo potrero o sin lote')
      check('write.lote_real.restore', true, 'skip')
    }

    // ========== EVALUACION (sobre lote smoke o lote real) ==========
    const evalTarget = created.ok ? loteId : loteReal?.id
    const evalId = randomUUID()
    let ev = { ok: false, status: 0, raw: 'skip' }
    if (evalTarget) {
      ev = await rest(token, 'POST', 'evaluaciones', {
        body: {
          id: evalId,
          lote_id: evalTarget,
          fecha_evaluacion: today,
          peso_promedio_kg: 255,
          condicion_corporal: 5,
          observaciones: TAG,
        },
      })
      if (ev.ok) cleanup.evalIds.push(evalId)
    }
    check('write.evaluacion.create', ev.ok, `${ev.status} ${String(ev.raw).slice(0, 100)}`)
    if (ev.ok) {
      const evGet = await rest(token, 'GET', 'evaluaciones', { query: `id=eq.${evalId}` })
      check('write.evaluacion.readback', evGet.data?.[0]?.peso_promedio_kg == 255)
    } else {
      check('write.evaluacion.readback', false, 'skip — create falló')
    }

    // ========== EVENTO SANITARIO ==========
    const evSanId = randomUUID()
    let san = { ok: false, status: 0 }
    if (evalTarget) {
      san = await rest(token, 'POST', 'eventos_sanitarios', {
        body: {
          id: evSanId,
          lote_id: evalTarget,
          fecha: today,
          tipo_evento: 'Vacunación',
          descripcion: TAG,
        },
      })
      if (san.ok) cleanup.eventoIds.push(evSanId)
    }
    check('write.evento_sanitario.create', san.ok, `${san.status}`)

    // ========== LLUVIA ==========
    const lluviaId = randomUUID()
    const lluvia = await rest(token, 'POST', 'registros_lluvia', {
      body: {
        id: lluviaId,
        establecimiento_id: estId,
        fecha: today,
        milimetros: 1,
        observaciones: TAG,
      },
    })
    if (lluvia.ok) cleanup.lluviaIds.push(lluviaId)
    check('write.lluvia.create', lluvia.ok, `${lluvia.status} ${String(lluvia.raw).slice(0, 80)}`)

    // ========== INVENTARIO ==========
    const invId = randomUUID()
    const inv = await rest(token, 'POST', 'inventario_items', {
      body: {
        id: invId,
        establecimiento_id: estId,
        nombre: TAG,
        categoria: 'smoke',
        stock_actual: 10,
        unidad: 'u',
        precio_unitario: 100,
        stock_minimo_alerta: 2,
        activo: true,
      },
    })
    if (inv.ok) cleanup.invItemIds.push(invId)
    check('write.inventario.create', inv.ok, `${inv.status}`)
    const invUp = await rest(token, 'PATCH', 'inventario_items', {
      query: `id=eq.${invId}`,
      body: { stock_actual: 7 },
    })
    check('write.inventario.update_stock', invUp.ok && invUp.data?.[0]?.stock_actual == 7)

    // ========== AGUA ANALISIS ==========
    const fuentes = await rest(token, 'GET', 'fuentes_de_agua', {
      query: `select=id,nombre,ultimo_estado&establecimiento_id=eq.${estId}&activo=eq.true&limit=5`,
    })
    const fuente = fuentes.data?.[0]
    if (fuente) {
      const anId = randomUUID()
      const an = await rest(token, 'POST', 'analisis_de_agua', {
        body: {
          id: anId,
          fuente_id: fuente.id,
          fecha_analisis: today,
          metodo: 'SMOKE',
          ph: 7.1,
          solidos_totales: 900,
          nitratos: 10,
          observaciones: TAG,
        },
      })
      if (an.ok) cleanup.analisisIds.push(anId)
      check('write.agua.analisis', an.ok, `${an.status}`)
      const estado = await rest(token, 'PATCH', 'fuentes_de_agua', {
        query: `id=eq.${fuente.id}`,
        body: { ultimo_estado: 'Óptimo' },
      })
      check('write.agua.update_estado', estado.ok)
    } else {
      check('write.agua.analisis', false, 'sin fuentes')
      check('write.agua.update_estado', true, 'skip')
    }

    // ========== NDVI ==========
    const ndvi = await edge(token, 'analizar-ndvi', {
      establecimiento_id: estId,
      potrero_ids: [potGeo.id],
    })
    check(
      'edge.ndvi',
      ndvi.ok && /exitoso|ndvi|Actualización|sentinel/i.test(ndvi.raw) && !/invalid_client/i.test(ndvi.raw),
      `${ndvi.status} ${ndvi.raw.slice(0, 160)}`,
    )
    const potAfter = await rest(token, 'GET', 'potreros', {
      query: `select=ultimo_ndvi,fecha_ultimo_ndvi&id=eq.${potGeo.id}`,
    })
    check(
      'edge.ndvi.persisted',
      Number(potAfter.data?.[0]?.ultimo_ndvi) > 0 || potAfter.data?.[0]?.fecha_ultimo_ndvi,
      `ndvi=${potAfter.data?.[0]?.ultimo_ndvi}`,
    )

    // ========== MARKET + IA ==========
    const mkt = await edge(token, 'get-market-price', {})
    check('edge.market', mkt.ok && mkt.data?.precio, String(mkt.data?.precio))
    const ia = await edge(token, 'asistente-ia', {
      prompt: 'Respondé solo: OK.',
      dataContext: { smoke: true },
    })
    check('edge.asistente', ia.ok && /OK/i.test(ia.raw), ia.raw.slice(0, 80))

    // ========== SEND ALERT (mail real) ==========
    const alertTitle = `${TAG} alerta prueba`
    const alertBody = `Prueba automática Nutrogan ${TAG}. Si ves este mail, send-alert + Resend OK.`
    const alert = await edge(token, 'send-alert', {
      titulo: alertTitle,
      mensaje: alertBody,
      categoria: 'general',
      prioridad: 'normal',
      destinatarios: [{ email, nombre: 'Smoke E2E' }],
      metadata: {
        app_url: 'https://www.nutrogan.site',
        footer_text: 'Smoke write test',
        logo_url:
          'https://cglogstrtjvbpsoaghib.supabase.co/storage/v1/object/public/assets/nutrogan-logo.png',
      },
    })
    const alertOk =
      alert.ok &&
      (alert.data?.success === true || /success/i.test(alert.raw)) &&
      !/Falta API Key|error/i.test(JSON.stringify(alert.data?.error || ''))
    check(
      'edge.send-alert.mail',
      alertOk,
      `${alert.status} ${alert.raw.slice(0, 200)}`,
    )
    if (alertOk) {
      console.log(
        `NOTE  Revisá bandeja de ${email} — asunto: "${alertTitle}" (puede tardar 1–2 min; también spam).`,
      )
      if (alert.data?.data?.id) {
        console.log(`NOTE  Resend id: ${alert.data.data.id}`)
      }
    }

    // Historial en DB (como hace la UI)
    const notifId = randomUUID()
    const notif = await rest(token, 'POST', 'notificaciones_programadas', {
      body: {
        id: notifId,
        establecimiento_id: estId,
        created_by: userId,
        titulo: alertTitle,
        mensaje: alertBody,
        categoria: 'general',
        prioridad: 'normal',
        estado: alertOk ? 'enviado' : 'fallido',
        destinatarios_snapshot: JSON.stringify([{ email, nombre: 'Smoke E2E' }]),
      },
    })
    if (notif.ok) cleanup.notifIds.push(notifId)
    check('write.notificacion.historial', notif.ok, `${notif.status}`)

    // ========== DELETE paths ==========
    if (ev.ok) {
      const delEv = await rest(token, 'DELETE', 'evaluaciones', { query: `id=eq.${evalId}` })
      cleanup.evalIds = cleanup.evalIds.filter((id) => id !== evalId)
      check('write.evaluacion.delete', delEv.ok || delEv.status === 204, `${delEv.status}`)
    } else {
      check('write.evaluacion.delete', true, 'skip')
    }

    if (san.ok) {
      const delSan = await rest(token, 'DELETE', 'eventos_sanitarios', {
        query: `id=eq.${evSanId}`,
      })
      cleanup.eventoIds = cleanup.eventoIds.filter((id) => id !== evSanId)
      check('write.evento_sanitario.delete', delSan.ok || delSan.status === 204, `${delSan.status}`)
    } else {
      check('write.evento_sanitario.delete', true, 'skip')
    }

    const softInv = await rest(token, 'PATCH', 'inventario_items', {
      query: `id=eq.${invId}`,
      body: { activo: false },
    })
    check('write.inventario.deactivate', softInv.ok && softInv.data?.[0]?.activo === false)

    if (created.ok) {
      const softLote = await rest(token, 'PATCH', 'lotes', {
        query: `id=eq.${loteId}`,
        body: { activo: false },
      })
      check('write.lote.deactivate', softLote.ok && softLote.data?.[0]?.activo === false)

      const hardLote = await rest(token, 'DELETE', 'lotes', { query: `id=eq.${loteId}` })
      check(
        'write.lote.hard_delete',
        hardLote.ok || hardLote.status === 204 || hardLote.status === 200,
        `${hardLote.status}`,
      )
      if (hardLote.ok || hardLote.status === 204) cleanup.loteId = null

      const gone = await rest(token, 'GET', 'lotes', {
        query: `select=id,activo&id=eq.${loteId}`,
      })
      check(
        'write.lote.gone_or_inactive',
        !gone.data?.length || gone.data[0].activo === false,
        JSON.stringify(gone.data),
      )
    } else {
      check('write.lote.deactivate', true, 'skip — create falló')
      check('write.lote.hard_delete', true, 'skip')
      check('write.lote.gone_or_inactive', true, 'skip')
    }
  } finally {
    await cleanupAll(token)
  }

  writeReport(fails)
  process.exit(fails ? 1 : 0)
}

function writeReport(fails) {
  const out = {
    ran_at: new Date().toISOString(),
    tag: TAG,
    fails,
    results,
  }
  fs.writeFileSync(path.join(root, 'docs', 'SMOKE_WRITE_RESULT.json'), JSON.stringify(out, null, 2))
  console.log(`\nReport → docs/SMOKE_WRITE_RESULT.json (${results.length} checks, ${fails} fails)`)
  if (fails === 0) {
    console.log('ALL WRITE CHECKS PASSED — revisá el mail de alerta en tu bandeja.')
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
