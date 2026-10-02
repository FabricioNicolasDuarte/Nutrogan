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

  const deTabla = promedioDeCategoria(raw, cat)
  if (deTabla != null) {
    return { precio: deTabla, categoria: cat.label, matched: true }
  }

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

function textoCelda(html: string) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function promedioDeCategoria(
  html: string,
  cat: { patterns: RegExp[]; label: string },
): number | null {
  const filas: { promedio: number; cabezas: number }[] = []
  const re = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
  let fila: RegExpExecArray | null
  while ((fila = re.exec(html))) {
    const celdas: string[] = []
    const td = /<td\b[^>]*>([\s\S]*?)<\/td>/gi
    let celda: RegExpExecArray | null
    while ((celda = td.exec(fila[1]))) celdas.push(textoCelda(celda[1]))
    if (!celdas.length) continue
    if (!cat.patterns.some((p) => p.test(celdas[0]))) continue
    const precios = celdas.slice(1).map(extractPriceFromText).filter((n): n is number => n != null)
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

function fechaMercado(diasAtras: number) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const [anio, mes, dia] = partes.split('-').map(Number)
  const marca = Date.UTC(anio, mes - 1, dia) - diasAtras * 86400000
  const fecha = new Date(marca)
  const dd = String(fecha.getUTCDate()).padStart(2, '0')
  const mm = String(fecha.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${fecha.getUTCFullYear()}`
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
    for (let dias = 0; dias < 7; dias++) {
      const fecha = fechaMercado(dias)
      const url =
        'https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000002?txtFECHAINI=' +
        encodeURIComponent(fecha) +
        '&txtFECHAFIN=' +
        encodeURIComponent(fecha)
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9',
        },
      })
      if (!response.ok) {
        console.warn(`MAG status: ${response.status}`)
        continue
      }
      const html = await response.text()
      const parsed = parseMagPrice(html, categoriaReq)
      if (parsed.precio == null || !parsed.matched) continue
      return new Response(
        JSON.stringify({
          success: true,
          precio: parsed.precio,
          moneda: 'ARS',
          unidad: 'kg',
          fuente: `Mercado Agroganadero — ${parsed.categoria}, ${fecha}`,
          categoria: parsed.categoria,
          categoria_solicitada: categoriaReq,
          match_categoria: true,
          es_estimado: false,
          fecha: new Date(Date.UTC(
            Number(fecha.slice(6)),
            Number(fecha.slice(3, 5)) - 1,
            Number(fecha.slice(0, 2)),
            15, 0, 0,
          )).toISOString(),
          nota: `Promedio ponderado por cabezas del remate del ${fecha}.`,
        }),
        {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
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
