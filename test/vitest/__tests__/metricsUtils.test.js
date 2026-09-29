import { describe, expect, it } from 'vitest'
import { calcGdpv, formatGdpv } from 'src/utils/gdpv'
import { pctEnPasto, valuacionInventario } from 'src/utils/livestockKpis'

describe('gdpv', () => {
  it('returns null without two weighed evaluations', () => {
    expect(calcGdpv([])).toBeNull()
    expect(calcGdpv([{ peso_promedio_kg: 300, fecha_evaluacion: '2026-01-01' }])).toBeNull()
    expect(formatGdpv([{ peso_promedio_kg: null, fecha_evaluacion: '2026-01-01' }])).toBe('N/A')
  })

  it('computes kg/day from first to last weighed eval', () => {
    const v = calcGdpv([
      { peso_promedio_kg: 300, fecha_evaluacion: '2026-01-01' },
      { peso_promedio_kg: null, fecha_evaluacion: '2026-01-10' },
      { peso_promedio_kg: 330, fecha_evaluacion: '2026-01-31' },
    ])
    expect(v).toBeCloseTo(1, 5)
    expect(formatGdpv([
      { peso_promedio_kg: 300, fecha_evaluacion: '2026-01-01' },
      { peso_promedio_kg: 330, fecha_evaluacion: '2026-01-31' },
    ])).toBe('1.000')
  })
})

describe('livestockKpis', () => {
  it('pctEnPasto uses heads not lot count', () => {
    expect(
      pctEnPasto([
        { cantidad_animales: 10, potrero_actual_id: 'a' },
        { cantidad_animales: 90, potrero_actual_id: null },
      ]),
    ).toBe(10)
  })

  it('valuacionInventario is stock * unit price', () => {
    expect(
      valuacionInventario([
        { stock_actual: 2, precio_unitario: 100 },
        { stock_actual: 1, precio_unitario: 50 },
      ]),
    ).toBe(250)
  })
})
