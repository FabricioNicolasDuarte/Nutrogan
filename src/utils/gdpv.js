/**
 * Ganancia Diaria de Peso Vivo (kg/día) a partir de evaluaciones con peso.
 * No inventa valores: sin ≥2 pesos válidos y días > 0 → null.
 */

export function evaluacionesConPeso(evaluaciones = []) {
  return [...evaluaciones]
    .filter((e) => {
      const p = parseFloat(e.peso_promedio_kg)
      return Number.isFinite(p) && p > 0 && e.fecha_evaluacion
    })
    .sort((a, b) => new Date(a.fecha_evaluacion) - new Date(b.fecha_evaluacion))
}

/**
 * @returns {number|null} kg/día o null si no hay base real
 */
export function calcGdpv(evaluaciones = [], opts = {}) {
  const minDays = opts.minDays ?? 0.5
  const maxAbs = opts.maxAbs ?? 3
  const evs = evaluacionesConPeso(evaluaciones)
  if (evs.length < 2) return null

  const first = evs[0]
  const last = evs[evs.length - 1]
  const p1 = parseFloat(first.peso_promedio_kg)
  const p2 = parseFloat(last.peso_promedio_kg)
  const days =
    (new Date(last.fecha_evaluacion).getTime() - new Date(first.fecha_evaluacion).getTime()) /
    86400000
  if (!(days > minDays)) return null

  const gdpv = (p2 - p1) / days
  if (!Number.isFinite(gdpv) || Math.abs(gdpv) >= maxAbs) return null
  return gdpv
}

export function formatGdpv(evaluaciones = [], digits = 3) {
  const v = calcGdpv(evaluaciones)
  if (v === null) return 'N/A'
  return v.toFixed(digits)
}
