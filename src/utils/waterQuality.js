/**
 * Calidad de agua de bebida para ganado (heurística de campo).
 * Referencias orientativas NRC/extensión + práctica NEA.
 * Unidades: nitratos como NO₃ mg/L (ppm); TDS ppm; As ppm.
 * No sustituye laboratorio ni criterio veterinario.
 */

export const WATER_QUALITY_DISCLAIMER =
  'Umbrales orientativos de campo (NRC/extensión). No sustituyen laboratorio ni criterio veterinario.'

export function calcularCalidadAgua(datos = {}) {
  const peligros = []
  const ph = parseFloat(datos.ph)
  const tds = parseFloat(datos.solidos_totales)
  const nitratos = parseFloat(datos.nitratos || 0)
  const arsenico = parseFloat(datos.arsenico || 0)

  let nivel = 'Óptimo'

  if (Number.isFinite(ph)) {
    if (ph < 5.5 || ph > 9.0) {
      peligros.push(`pH ${ph} fuera de rango seguro (5.5–9.0)`)
      nivel = 'Peligro'
    } else if (ph < 6.5 || ph > 8.5) {
      peligros.push(`pH ${ph} subóptimo (ideal 6.5–8.5)`)
      if (nivel !== 'Peligro') nivel = 'Precaución'
    }
  }

  if (Number.isFinite(tds)) {
    if (tds > 5000) {
      peligros.push(`TDS ${tds} ppm — riesgo alto para bebida animal`)
      nivel = 'Peligro'
    } else if (tds > 3000) {
      peligros.push(`TDS ${tds} ppm — precaución (umbrales ganaderos)`)
      if (nivel !== 'Peligro') nivel = 'Precaución'
    }
  }

  if (Number.isFinite(nitratos)) {
    if (nitratos > 100) {
      peligros.push(`Nitratos ${nitratos} ppm — peligro (NO₃)`)
      nivel = 'Peligro'
    } else if (nitratos > 45) {
      peligros.push(`Nitratos ${nitratos} ppm — precaución`)
      if (nivel !== 'Peligro') nivel = 'Precaución'
    }
  }

  if (Number.isFinite(arsenico) && arsenico > 0) {
    if (arsenico > 0.2) {
      peligros.push(`Arsénico ${arsenico} ppm — peligro`)
      nivel = 'Peligro'
    } else if (arsenico > 0.05) {
      peligros.push(`Arsénico ${arsenico} ppm — precaución`)
      if (nivel !== 'Peligro') nivel = 'Precaución'
    }
  }

  return { estado: nivel, peligros }
}
