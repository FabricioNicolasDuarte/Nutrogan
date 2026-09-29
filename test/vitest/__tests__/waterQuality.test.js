import { describe, expect, it } from 'vitest'
import { calcularCalidadAgua } from 'src/utils/waterQuality'

describe('calcularCalidadAgua (ganado)', () => {
  it('óptimo en rango normal', () => {
    const r = calcularCalidadAgua({ ph: 7.2, solidos_totales: 900, nitratos: 10, arsenico: 0 })
    expect(r.estado).toBe('Óptimo')
    expect(r.peligros).toHaveLength(0)
  })

  it('precaución por TDS y nitratos intermedios', () => {
    expect(calcularCalidadAgua({ ph: 7, solidos_totales: 3500 }).estado).toBe('Precaución')
    expect(calcularCalidadAgua({ ph: 7, nitratos: 60 }).estado).toBe('Precaución')
  })

  it('peligro por extremos', () => {
    expect(calcularCalidadAgua({ ph: 5.0 }).estado).toBe('Peligro')
    expect(calcularCalidadAgua({ ph: 7, solidos_totales: 6000 }).estado).toBe('Peligro')
    expect(calcularCalidadAgua({ ph: 7, nitratos: 120 }).estado).toBe('Peligro')
    expect(calcularCalidadAgua({ ph: 7, arsenico: 0.3 }).estado).toBe('Peligro')
  })
})
