/**
 * KPIs de hacienda derivados solo de lotes activos (sin inventar %).
 */

export function cabezasTotales(lotes = []) {
  return lotes.reduce((acc, l) => acc + (Number(l.cantidad_animales) || 0), 0)
}

export function cabezasEnPasto(lotes = []) {
  return lotes
    .filter((l) => l.potrero_actual_id)
    .reduce((acc, l) => acc + (Number(l.cantidad_animales) || 0), 0)
}

/** % de cabezas con potrero asignado (0–100). */
export function pctEnPasto(lotes = []) {
  const total = cabezasTotales(lotes)
  if (!total) return 0
  return Math.round((cabezasEnPasto(lotes) / total) * 100)
}

export function lotesSinPotrero(lotes = []) {
  return lotes.filter((l) => !l.potrero_actual_id)
}

/** Valor estimado de hacienda: cabezas × peso ref × $/kg (null si falta dato). */
export function valuacionHaciendaEstimada(lotes = [], evaluaciones = [], precioKg) {
  const price = Number(precioKg)
  if (!Number.isFinite(price) || price <= 0) return null

  let kilos = 0
  let cabezasConPeso = 0
  for (const lote of lotes) {
    const n = Number(lote.cantidad_animales) || 0
    if (!n) continue
    const evs = (evaluaciones || [])
      .filter((e) => e.lote_id === lote.id && Number(e.peso_promedio_kg) > 0)
      .sort((a, b) => new Date(b.fecha_evaluacion) - new Date(a.fecha_evaluacion))
    const peso = evs[0]
      ? parseFloat(evs[0].peso_promedio_kg)
      : Number(lote.peso_ingreso_kg) > 0
        ? Number(lote.peso_ingreso_kg)
        : null
    if (peso === null || !Number.isFinite(peso)) continue
    kilos += n * peso
    cabezasConPeso += n
  }
  if (!cabezasConPeso) return null
  return { valor: kilos * price, kilos, cabezasConPeso }
}

export function valuacionInventario(items = []) {
  return items.reduce(
    (acc, item) =>
      acc + (Number(item.stock_actual) || 0) * (Number(item.precio_unitario) || 0),
    0,
  )
}
