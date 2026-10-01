import { describe, it, expect } from 'vitest'
import { estadoForrajeNdvi, estadoForrajeNdviTitle } from 'src/utils/ndviBands'

describe('ndviBands', () => {
  it('escala unificada', () => {
    expect(estadoForrajeNdvi(0.75)).toBe('EXCELENTE')
    expect(estadoForrajeNdvi(0.55)).toBe('BUENO')
    expect(estadoForrajeNdvi(0.42)).toBe('REGULAR')
    expect(estadoForrajeNdvi(0.25)).toBe('BAJO')
    expect(estadoForrajeNdvi(0.1)).toBe('CRÍTICO')
  })

  it('title case para reportes', () => {
    expect(estadoForrajeNdviTitle(0.65)).toBe('Bueno')
    expect(estadoForrajeNdviTitle(null)).toBe('Sin datos')
  })
})
