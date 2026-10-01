import { describe, it, expect } from 'vitest'
import { valorProducidoPorMes } from 'src/utils/gdpvMonthly'

describe('valorProducidoPorMes', () => {
  it('reparte valor por meses con GDPV real', () => {
    const lotes = [{ id: 'L1', cantidad_animales: 100 }]
    const today = new Date()
    const d0 = new Date(today.getFullYear(), today.getMonth() - 2, 1)
    const d1 = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const d2 = new Date(today.getFullYear(), today.getMonth(), 1)
    const iso = (d) => d.toISOString().slice(0, 10)
    const evaluaciones = [
      { lote_id: 'L1', fecha_evaluacion: iso(d0), peso_promedio_kg: 300 },
      { lote_id: 'L1', fecha_evaluacion: iso(d1), peso_promedio_kg: 320 },
      { lote_id: 'L1', fecha_evaluacion: iso(d2), peso_promedio_kg: 340 },
    ]
    const out = valorProducidoPorMes(lotes, evaluaciones, 2000, 6)
    const keys = Object.keys(out)
    expect(keys.length).toBe(6)
    const sum = keys.reduce((a, k) => a + out[k], 0)
    expect(sum).toBeGreaterThan(0)
  })

  it('sin precio → ceros', () => {
    const out = valorProducidoPorMes([{ id: 'L1', cantidad_animales: 10 }], [], null, 3)
    expect(Object.values(out).every((v) => v === 0)).toBe(true)
  })
})
