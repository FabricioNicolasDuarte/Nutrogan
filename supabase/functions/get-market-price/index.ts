import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAG_CATEGORIAS = [
  { id: 'novillo', label: 'Novillo', patterns: [/novillos?/i, /nov\./i] },
  { id: 'vaquillona', label: 'Vaquillona', patterns: [/vaquillonas?/i, /vaq\./i] },
  { id: 'vaca', label: 'Vaca', patterns: [/\bvacas?\b/i] },
  { id: 'ternero', label: 'Ternero', patterns: [/terneros?/i, /tern\./i] },
  { id: 'invernada', label: 'Invernada', patterns: [/invernada/i] },
]

const PRICE_MIN = 1500
const PRICE_MAX = 8000

function extractPriceFromText(text: string): number | null {
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

function parseMagPrice(html: string, categoriaIdOrLabel = 'novillo') {
  const raw = String(html || '')
  const cat =
    MAG_CATEGORIAS.find(
      (c) =>
        c.id === String(categoriaIdOrLabel).toLowerCase() ||
        c.label.toLowerCase() === String(categoriaIdOrLabel).toLowerCase(),
    ) || MAG_CATEGORIAS[0]

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

  const any = chunks.match(/\$?\s*\d{1,2}[.,]?\d{3}(?:[.,]\d{2})?/g) || []
  for (const piece of any) {
    const precio = extractPriceFromText(piece)
    if (precio != null) {
      return { precio, categoria: null, matched: false }
    }
  }

  return { precio: null, categoria: null, matched: false }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  let categoriaReq = 'novillo'
  try {
    const body = await req.json()
    if (body?.categoria) categoriaReq = String(body.categoria)
  } catch {
    /* sin body */
  }

  try {
    const URL_FUENTE = 'https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciendainfo'
    const response = await fetch(URL_FUENTE, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
    })

    if (response.ok) {
      const html = await response.text()
      const parsed = parseMagPrice(html, categoriaReq)

      if (parsed.precio != null) {
        const fuente = parsed.matched
          ? `MAG — ${parsed.categoria}`
          : 'MAG (categoría no confirmada)'
        return new Response(
          JSON.stringify({
            success: true,
            precio: parsed.precio,
            moneda: 'ARS',
            unidad: 'kg',
            fuente,
            categoria: parsed.categoria,
            categoria_solicitada: categoriaReq,
            match_categoria: parsed.matched,
            es_estimado: !parsed.matched,
            fecha: new Date().toISOString(),
            nota: parsed.matched
              ? `Cotización asociada a ${parsed.categoria}.`
              : 'No se halló fila de la categoría pedida; primer $ usable. Preferí modo manual con categoría.',
          }),
          {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }
    } else {
      console.warn(`MAG status: ${response.status}`)
    }
  } catch (error) {
    console.error('Error MAG:', (error as Error).message)
  }

  return new Response(
    JSON.stringify({
      success: true,
      precio: null,
      moneda: 'ARS',
      unidad: 'kg',
      fuente: 'Sin dato MAG — fijá precio manual',
      categoria: null,
      categoria_solicitada: categoriaReq,
      match_categoria: false,
      es_estimado: true,
      fecha: new Date().toISOString(),
    }),
    {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
})
