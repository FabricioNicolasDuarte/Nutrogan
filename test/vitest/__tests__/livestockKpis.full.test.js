import { describe, expect, it } from 'vitest'
import {
  cabezasEnPasto,
  cabezasTotales,
  lotesSinPotrero,
  pctEnPasto,
  valuacionHaciendaEstimada,
  valuacionInventario,
} from 'src/utils/livestockKpis'
import { calcGdpv } from 'src/utils/gdpv'

describe('livestockKpis — hacienda', () => {
  const lotes = [
    { id: '1', cantidad_animales: 40, potrero_actual_id: 'p1', peso_ingreso_kg: 280 },
    { id: '2', cantidad_animales: 60, potrero_actual_id: 'p2' },
    { id: '3', cantidad_animales: 10, potrero_actual_id: null, peso_ingreso_kg: 300 },
  ]

  it('suma cabezas y en pasto', () => {
    expect(cabezasTotales(lotes)).toBe(110)
    expect(cabezasEnPasto(lotes)).toBe(100)
    expect(pctEnPasto(lotes)).toBe(91)
    expect(lotesSinPotrero(lotes)).toHaveLength(1)
  })

  it('pctEnPasto es 0 sin cabezas', () => {
    expect(pctEnPasto([])).toBe(0)
    expect(pctEnPasto([{ cantidad_animales: 0 }])).toBe(0)
  })

  it('valuacionHaciendaEstimada usa peso de evaluación o ingreso', () => {
    expect(valuacionHaciendaEstimada(lotes, [], null)).toBeNull()
    expect(valuacionHaciendaEstimada(lotes, [], 0)).toBeNull()

    const withEval = valuacionHaciendaEstimada(
      lotes,
      [{ lote_id: '2', peso_promedio_kg: 320, fecha_evaluacion: '2026-01-15' }],
      2000,
    )
    // lote1: 40*280, lote2: 60*320, lote3: 10*300
    expect(withEval.kilos).toBe(40 * 280 + 60 * 320 + 10 * 300)
    expect(withEval.valor).toBe(withEval.kilos * 2000)
    expect(withEval.cabezasConPeso).toBe(110)
  })

  it('valuacionInventario', () => {
    expect(valuacionInventario([{ stock_actual: 3, precio_unitario: 10 }])).toBe(30)
  })
})

describe('gdpv — honestidad', () => {
  it('rechaza saltos absurdos (>= 3 kg/día)', () => {
    expect(
      calcGdpv([
        { peso_promedio_kg: 200, fecha_evaluacion: '2026-01-01' },
        { peso_promedio_kg: 260, fecha_evaluacion: '2026-01-11' }, // +6 kg/día
      ]),
    ).toBeNull()
  })

  it('rechaza intervalo demasiado corto', () => {
    expect(
      calcGdpv([
        { peso_promedio_kg: 200, fecha_evaluacion: '2026-01-01T00:00:00Z' },
        { peso_promedio_kg: 201, fecha_evaluacion: '2026-01-01T02:00:00Z' },
      ]),
    ).toBeNull()
  })
})
