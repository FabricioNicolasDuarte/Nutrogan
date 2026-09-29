/**
 * Condición Corporal — escala INTA Argentina para bovinos (1–9).
 * Referencia habitual de campo (adaptación Nicholson / INTA).
 * Valores enteros o medios (p. ej. 5.5).
 */
export const CC_INTA_MIN = 1
export const CC_INTA_MAX = 9
export const CC_INTA_DEFAULT = 5
export const CC_INTA_LABEL = 'Escala INTA Argentina (1–9)'

/** Descripción corta por punto entero (1–9). */
export const CC_INTA_DESCRIPTIONS = {
  1: 'Emaciado — sin reservas; procesos óseos muy marcados',
  2: 'Muy flaco — poca cobertura muscular y grasa',
  3: 'Flaco — costillas visibles; poca grasa subcutánea',
  4: 'Moderadamente flaco — algo de cobertura; aún delgado',
  5: 'Moderado — balance músculo/grasa; referencia habitual',
  6: 'Buen estado — buena cobertura; ideal preparto/recria en muchos sistemas',
  7: 'Gordo — depósitos de grasa evidentes',
  8: 'Muy gordo — exceso de grasa; baja eficiencia',
  9: 'Obeso — grasa excesiva; riesgo sanitario/productivo',
}

export function clampCcInta(score) {
  const n = Number(score)
  if (!Number.isFinite(n)) return CC_INTA_DEFAULT
  const stepped = Math.round(n * 2) / 2
  return Math.min(CC_INTA_MAX, Math.max(CC_INTA_MIN, stepped))
}

export function describeCcInta(score) {
  const key = Math.round(clampCcInta(score))
  return CC_INTA_DESCRIPTIONS[key] || ''
}

export function formatCcInta(score) {
  const v = clampCcInta(score)
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}
