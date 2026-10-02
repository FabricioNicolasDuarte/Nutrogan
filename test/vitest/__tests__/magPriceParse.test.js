import { describe, it, expect } from 'vitest'
import { parseMagPrice, extractPriceFromText } from 'src/utils/magPriceParse'

describe('magPriceParse', () => {
  it('extrae precio de texto AR', () => {
    expect(extractPriceFromText('$ 2.450,00')).toBe(2450)
    expect(extractPriceFromText('99')).toBe(null)
  })

  it('asocia Novillo cuando hay fila con categoría', () => {
    const html = `
      <table><tr><td>Novillo</td><td>$ 2.680,00</td></tr>
      <tr><td>Vaca</td><td>$ 1.900,00</td></tr></table>
    `
    const r = parseMagPrice(html, 'novillo')
    expect(r.matched).toBe(true)
    expect(r.categoria).toBe('Novillo')
    expect(r.precio).toBe(2680)
  })

  it('toma Vaca si se pide vaca', () => {
    const html = `
      <div>Vaca gorda | $ 1.850,50</div>
      <div>Novillo | $ 2.500,00</div>
    `
    const r = parseMagPrice(html, 'vaca')
    expect(r.matched).toBe(true)
    expect(r.categoria).toBe('Vaca')
    expect(r.precio).toBe(1850.5)
  })

  it('promedia los novillos del MAG por cabezas y no usa el mínimo', () => {
    const html = `
      <table>
        <tr><td>NOVILLOS Mest.EyB 431/460</td><td>3600,000</td><td>4700,000</td><td>4049,396</td><td>4150,000</td><td>29</td></tr>
        <tr><td>NOVILLOS Mest.EyB 461/490</td><td>3600,000</td><td>4500,000</td><td>4130,283</td><td>4200,000</td><td>94</td></tr>
        <tr><td>NOVILLITOS EyB M. 300/390</td><td>3800,000</td><td>5100,000</td><td>4597,919</td><td>4500,000</td><td>164</td></tr>
      </table>
    `
    const r = parseMagPrice(html, 'novillo')
    expect(r.matched).toBe(true)
    expect(r.categoria).toBe('Novillo')
    expect(r.precio).toBe(4111)
  })

  it('sin match de categoría → primer precio, matched false', () => {
    const html = `<p>Referencia plaza $ 2.200</p>`
    const r = parseMagPrice(html, 'ternero')
    expect(r.matched).toBe(false)
    expect(r.precio).toBe(2200)
  })
})
