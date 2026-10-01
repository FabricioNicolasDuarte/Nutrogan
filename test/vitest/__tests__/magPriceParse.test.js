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

  it('sin match de categoría → primer precio, matched false', () => {
    const html = `<p>Referencia plaza $ 2.200</p>`
    const r = parseMagPrice(html, 'ternero')
    expect(r.matched).toBe(false)
    expect(r.precio).toBe(2200)
  })
})
