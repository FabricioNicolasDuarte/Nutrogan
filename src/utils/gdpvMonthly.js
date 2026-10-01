/**
 * Valor producido estimado por mes a partir de evaluaciones (GDPV × cabezas × $/kg).
 * Solo tramos con pesos reales; no inventa GDPV.
 */

import { evaluacionesConPeso } from './gdpv.js'

/**
 * @param {Array<{id:string, cantidad_animales?:number}>} lotes
 * @param {Array} evaluaciones
 * @param {number} precioKg
 * @param {number} [monthsBack=6]
 * @returns {Record<string, number>} key YYYY-MM → valor ARS
 */
export function valorProducidoPorMes(lotes = [], evaluaciones = [], precioKg, monthsBack = 6) {
  const price = Number(precioKg)
  const out = {}
  const today = new Date()
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    out[k] = 0
  }
  if (!(Number.isFinite(price) && price > 0)) return out

  for (const lote of lotes) {
    const cabezas = Number(lote.cantidad_animales) || 0
    if (cabezas <= 0) continue
    const evs = evaluacionesConPeso(evaluaciones.filter((e) => e.lote_id === lote.id))
    if (evs.length < 2) continue

    for (let i = 1; i < evs.length; i++) {
      const a = evs[i - 1]
      const b = evs[i]
      const p1 = parseFloat(a.peso_promedio_kg)
      const p2 = parseFloat(b.peso_promedio_kg)
      const t1 = new Date(a.fecha_evaluacion).getTime()
      const t2 = new Date(b.fecha_evaluacion).getTime()
      const days = (t2 - t1) / 86400000
      if (!(days > 0.5) || !Number.isFinite(p1) || !Number.isFinite(p2)) continue
      const gdpv = (p2 - p1) / days
      if (!Number.isFinite(gdpv) || Math.abs(gdpv) >= 3) continue

      // Asigna kilos del tramo a cada mes calendario que cubre
      let cursor = new Date(t1)
      const end = new Date(t2)
      while (cursor < end) {
        const y = cursor.getFullYear()
        const m = cursor.getMonth()
        const key = `${y}-${String(m + 1).padStart(2, '0')}`
        const monthEnd = new Date(y, m + 1, 1)
        const segEnd = monthEnd < end ? monthEnd : end
        const segDays = (segEnd.getTime() - cursor.getTime()) / 86400000
        if (segDays > 0 && key in out) {
          out[key] += gdpv * segDays * cabezas * price
        }
        cursor = segEnd
      }
    }
  }

  for (const k of Object.keys(out)) {
    out[k] = Math.max(0, Math.round(out[k]))
  }
  return out
}
