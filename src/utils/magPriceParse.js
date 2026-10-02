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

  const deTabla = promedioDeCategoria(raw, cat)
  if (deTabla != null) {
    return { precio: deTabla, categoria: cat.label, matched: true }
  }

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

function textoCelda(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * En la planilla del MAG cada fila trae mínimo, máximo y promedio.
 * El promedio ponderado por cabezas es la referencia. Si la fila tiene un solo
 * precio, se usa ese.
 */
function promedioDeCategoria(html, cat) {
  const filas = []
  const re = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
  let fila
  while ((fila = re.exec(html))) {
    const celdas = []
    const td = /<td\b[^>]*>([\s\S]*?)<\/td>/gi
    let celda
    while ((celda = td.exec(fila[1]))) celdas.push(textoCelda(celda[1]))
    if (!celdas.length) continue
    if (!cat.patterns.some((p) => p.test(celdas[0]))) continue
    const precios = celdas.slice(1).map(extractPriceFromText).filter((n) => n != null)
    if (!precios.length) continue
    const promedio = precios.length >= 3 ? precios[2] : precios[0]
    const cabezasCrudas = parseInt(String(celdas[5] || '').replace(/\./g, '').replace(/,.*/, ''), 10)
    const cabezas = Number.isFinite(cabezasCrudas) && cabezasCrudas > 0 && cabezasCrudas < 1500 ? cabezasCrudas : 1
    filas.push({ promedio, cabezas })
  }
  if (!filas.length) return null
  if (filas.length === 1) return filas[0].promedio
  const cabezas = filas.reduce((s, f) => s + f.cabezas, 0)
  const valor = filas.reduce((s, f) => s + f.promedio * f.cabezas, 0) / cabezas
  return Math.round(valor)
}
