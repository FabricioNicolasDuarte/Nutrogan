/**
 * Motor de alertas operativas Nutrogan.
 * Solo usa datos cargados — no inventa. Umbrales de campo (heurística).
 */

import { calcGdpv } from './gdpv.js'
import { calcularCalidadAgua } from './waterQuality.js'

export const ALERT_THRESHOLDS = {
  ndviCritico: 0.3,
  gdpvNegativo: 0,
  ccBajo: 3.5,
  stock: true, // usa stock_minimo_alerta del ítem
}

/**
 * @returns {Array<{
 *   id: string,
 *   severity: 'critical'|'warn'|'info',
 *   category: 'agua'|'forraje'|'sanidad'|'stock'|'general',
 *   title: string,
 *   message: string,
 *   entityType?: string,
 *   entityId?: string,
 * }>}
 */
export function evaluateOperationalAlerts({
  lotes = [],
  potreros = [],
  fuentesAgua = [],
  inventarioItems = [],
  evaluaciones = [],
} = {}) {
  const alerts = []
  const now = Date.now()

  // --- Agua ---
  for (const f of fuentesAgua.filter((x) => x.activo !== false)) {
    if (f.ultimo_estado === 'Peligro') {
      alerts.push({
        id: `agua-peligro-${f.id}`,
        severity: 'critical',
        category: 'agua',
        title: `Agua en peligro: ${f.nombre}`,
        message: `Estado ${f.ultimo_estado}. Revisar análisis o laboratorio antes de uso intensivo.`,
        entityType: 'fuente_agua',
        entityId: f.id,
      })
    } else if (f.ultimo_estado === 'Precaución') {
      alerts.push({
        id: `agua-alerta-${f.id}`,
        severity: 'warn',
        category: 'agua',
        title: `Agua en alerta: ${f.nombre}`,
        message: 'Parámetros subóptimos. Confirmar con nuevo análisis si el rodeo bebe ahí.',
        entityType: 'fuente_agua',
        entityId: f.id,
      })
    }

    const last = f.analisis_de_agua?.[0]
    if (last) {
      const { estado, peligros } = calcularCalidadAgua(last)
      if (estado === 'Peligro' && f.ultimo_estado !== 'Peligro') {
        alerts.push({
          id: `agua-calc-${f.id}`,
          severity: 'critical',
          category: 'agua',
          title: `Análisis crítico: ${f.nombre}`,
          message: peligros.join('; ') || 'Umbrales de bebida animal excedidos.',
          entityType: 'fuente_agua',
          entityId: f.id,
        })
      }
    }
  }

  // --- Forraje / NDVI en potreros con carga ---
  const cargaPorPotrero = {}
  for (const l of lotes.filter((x) => x.activo !== false && x.potrero_actual_id)) {
    const n = Number(l.cantidad_animales) || 0
    cargaPorPotrero[l.potrero_actual_id] =
      (cargaPorPotrero[l.potrero_actual_id] || 0) + n
  }

  for (const p of potreros.filter((x) => x.activo !== false)) {
    const ndvi = Number(p.ultimo_ndvi)
    const cabezas = cargaPorPotrero[p.id] || 0
    if (Number.isFinite(ndvi) && ndvi < ALERT_THRESHOLDS.ndviCritico && cabezas > 0) {
      alerts.push({
        id: `ndvi-${p.id}`,
        severity: 'critical',
        category: 'forraje',
        title: `Pastura baja (NDVI): ${p.nombre}`,
        message: `NDVI ${ndvi.toFixed(2)} con ${cabezas} cabezas. Revisar carga o rotación.`,
        entityType: 'potrero',
        entityId: p.id,
      })
    } else if (Number.isFinite(ndvi) && ndvi < 0.4 && cabezas > 0) {
      alerts.push({
        id: `ndvi-warn-${p.id}`,
        severity: 'warn',
        category: 'forraje',
        title: `Vigor regular: ${p.nombre}`,
        message: `NDVI ${ndvi.toFixed(2)} con ${cabezas} cabezas. Monitorear descanso.`,
        entityType: 'potrero',
        entityId: p.id,
      })
    }
  }

  // --- Stock inventario ---
  for (const item of inventarioItems.filter((x) => x.activo !== false)) {
    const stock = Number(item.stock_actual)
    const min = Number(item.stock_minimo_alerta)
    if (!Number.isFinite(stock)) continue
    if (stock <= 0) {
      alerts.push({
        id: `stock-0-${item.id}`,
        severity: 'critical',
        category: 'stock',
        title: `Sin stock: ${item.nombre}`,
        message: 'Stock en 0. Reponer antes del próximo uso en campo.',
        entityType: 'inventario',
        entityId: item.id,
      })
    } else if (Number.isFinite(min) && min > 0 && stock <= min) {
      alerts.push({
        id: `stock-min-${item.id}`,
        severity: 'warn',
        category: 'stock',
        title: `Stock bajo: ${item.nombre}`,
        message: `${stock} ${item.unidad || 'u'} (mínimo ${min}).`,
        entityType: 'inventario',
        entityId: item.id,
      })
    }
  }

  // --- CC / GDPV por lote (últimas evaluaciones) ---
  const byLote = {}
  for (const e of evaluaciones || []) {
    if (!e.lote_id) continue
    ;(byLote[e.lote_id] ||= []).push(e)
  }

  for (const lote of lotes.filter((x) => x.activo !== false)) {
    const evs = byLote[lote.id] || []
    const gdpv = calcGdpv(evs)
    if (gdpv !== null && gdpv < ALERT_THRESHOLDS.gdpvNegativo) {
      alerts.push({
        id: `gdpv-${lote.id}`,
        severity: 'critical',
        category: 'sanidad',
        title: `GDPV negativo: ${lote.identificacion}`,
        message: `${gdpv.toFixed(3)} kg/día entre pesadas. Revisar nutrición/sanidad.`,
        entityType: 'lote',
        entityId: lote.id,
      })
    }

    const withCc = [...evs]
      .filter((e) => Number.isFinite(Number(e.condicion_corporal)))
      .sort((a, b) => new Date(b.fecha_evaluacion) - new Date(a.fecha_evaluacion))
    if (withCc[0]) {
      const cc = Number(withCc[0].condicion_corporal)
      if (cc <= ALERT_THRESHOLDS.ccBajo) {
        alerts.push({
          id: `cc-${lote.id}`,
          severity: 'warn',
          category: 'sanidad',
          title: `CC baja: ${lote.identificacion}`,
          message: `Última CC INTA ${cc}. Evaluar manejo con el encargado/veterinario.`,
          entityType: 'lote',
          entityId: lote.id,
        })
      }
    }
  }

  // Dedup by id, sort critical first
  const seen = new Set()
  const unique = []
  for (const a of alerts) {
    if (seen.has(a.id)) continue
    seen.add(a.id)
    unique.push({ ...a, evaluatedAt: now })
  }
  unique.sort((a, b) => {
    const rank = { critical: 0, warn: 1, info: 2 }
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9)
  })
  return unique
}

/** Resumen para modo campo (solo críticos + pastura con carga). */
export function fieldPastureWarnings(potreros = [], lotes = []) {
  return evaluateOperationalAlerts({ potreros, lotes, fuentesAgua: [], inventarioItems: [], evaluaciones: [] }).filter(
    (a) => a.category === 'forraje',
  )
}
