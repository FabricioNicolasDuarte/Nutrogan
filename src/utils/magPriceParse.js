/**
 * Extracción honesta de precio MAG por categoría.
 * No inventa: si no hay match usable → null.
 */

export const MAG_CATEGORIAS = [
  { id: 'novillo', label: 'Novillo', patterns: [/novillos?/i, /nov\./i] },
  { id: 'vaquillona', label: 'Vaquillona', patterns: [/vaquillonas?/i, /vaq\./i] },
  { id: 'vaca', label: 'Vaca', patterns: [/\bvacas?\b/i] },
  { id: 'ternero', label: 'Ternero', patterns: [/terneros?/i, /tern\./i] },
  { id: 'invernada', label: 'Invernada', patterns: [/invernada/i] },
]

const PRICE_MIN = 1500
const PRICE_MAX = 8000

/**
 * @param {string} text
 * @returns {number|null}
 */
export function extractPriceFromText(text) {
  if (!text) return null
  const cleaned = String(text)
    .replace(/\$/g, ' ')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .trim()
  const m = cleaned.match(/(\d{3,5}(?:\.\d+)?)/)
  if (!m) return null
  const valor = parseFloat(m[1])
  if (!Number.isFinite(valor) || valor < PRICE_MIN || valor > PRICE_MAX) return null
  return valor
}

/**
 * Busca precio asociado a una categoría en HTML/texto plano MAG.
 * @param {string} html
 * @param {string} [categoriaIdOrLabel] ej. 'novillo' | 'Novillo'
 * @returns {{ precio: number|null, categoria: string|null, matched: boolean }}
 */
export function parseMagPrice(html, categoriaIdOrLabel = 'novillo') {
  const raw = String(html || '')
  const cat =
    MAG_CATEGORIAS.find(
      (c) =>
        c.id === String(categoriaIdOrLabel).toLowerCase() ||
        c.label.toLowerCase() === String(categoriaIdOrLabel).toLowerCase(),
    ) || MAG_CATEGORIAS[0]

  // Texto plano: tags → espacio (mantener proximidad categoría↔precio)
  const chunks = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')

  for (const pattern of cat.patterns) {
    const re = new RegExp(
      `(${pattern.source}).{0,100}?(\\$?\\s*\\d{1,2}[.,]?\\d{3}(?:[.,]\\d{2})?)`,
      'i',
    )
    const m = chunks.match(re)
    if (m) {
      const precio = extractPriceFromText(m[2] || m[0])
      if (precio != null) {
        return { precio, categoria: cat.label, matched: true }
      }
    }
  }

  // Fallback: primer precio razonable del documento (marcado matched:false)
  const any = chunks.match(/\$?\s*\d{1,2}[.,]?\d{3}(?:[.,]\d{2})?/g) || []
  for (const piece of any) {
    const precio = extractPriceFromText(piece)
    if (precio != null) {
      return { precio, categoria: null, matched: false }
    }
  }

  return { precio: null, categoria: null, matched: false }
}
