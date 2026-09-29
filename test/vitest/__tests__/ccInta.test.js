import { describe, expect, it } from 'vitest'
import {
  CC_INTA_DEFAULT,
  CC_INTA_LABEL,
  clampCcInta,
  describeCcInta,
  formatCcInta,
} from 'src/utils/ccInta'

describe('ccInta (escala INTA 1–9)', () => {
  it('expone etiqueta de escala', () => {
    expect(CC_INTA_LABEL).toMatch(/INTA/)
  })

  it('clampa fuera de rango y redondea a medios', () => {
    expect(clampCcInta(0)).toBe(1)
    expect(clampCcInta(99)).toBe(9)
    expect(clampCcInta(5.2)).toBe(5)
    expect(clampCcInta(5.3)).toBe(5.5)
    expect(clampCcInta(5.75)).toBe(6)
  })

  it('usa default si el valor no es numérico', () => {
    expect(clampCcInta(null)).toBe(CC_INTA_DEFAULT)
    expect(clampCcInta('x')).toBe(CC_INTA_DEFAULT)
  })

  it('describe y formatea', () => {
    expect(describeCcInta(5)).toMatch(/Moderado/)
    expect(formatCcInta(5)).toBe('5')
    expect(formatCcInta(5.5)).toBe('5.5')
  })
})
