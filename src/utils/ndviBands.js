/**
 * Bandas NDVI de campo (vigor relativo, no kg MS).
 * Una sola escala en toda la app — Reportes / Satélite / Potreros / Alertas.
 */

export const NDVI_BANDS_DISCLAIMER =
  'NDVI refleja vigor relativo de pastura, no kilogramos de forraje. Las bandas son heurística de campo.'

/**
 * @param {number|null|undefined} ndvi
 * @param {{ short?: boolean }} [opts]
 * @returns {string}
 */
export function estadoForrajeNdvi(ndvi, opts = {}) {
  if (typeof ndvi !== 'number' || !Number.isFinite(ndvi)) {
    return opts.short ? 'N/D' : 'Sin datos'
  }
  if (ndvi >= 0.7) return 'EXCELENTE'
  if (ndvi >= 0.5) return 'BUENO'
  if (ndvi >= 0.4) return 'REGULAR'
  if (ndvi >= 0.2) return 'BAJO'
  return 'CRÍTICO'
}

/**
 * @param {number|null|undefined} ndvi
 * @returns {string} etiqueta título (primera mayúscula)
 */
export function estadoForrajeNdviTitle(ndvi) {
  const s = estadoForrajeNdvi(ndvi)
  if (s === 'Sin datos' || s === 'N/D') return s
  return s.charAt(0) + s.slice(1).toLowerCase()
}
