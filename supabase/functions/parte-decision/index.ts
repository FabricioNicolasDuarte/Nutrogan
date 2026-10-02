import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const MODELOS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-flash']

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (!GOOGLE_API_KEY) return json({ error: 'El parte no está disponible' }, 500)

  try {
    const body = await req.json()
    const lineas = Array.isArray(body?.lineas) ? body.lineas : []
    if (!lineas.length) return json({ error: 'No hay renglones para redactar' }, 400)

    const texto = lineas
      .map((l: { titulo?: string; lectura?: string; hueco?: string }) => {
        const hueco = l.hueco ? ` Falta: ${l.hueco}` : ''
        return `${l.titulo || 'Dato'}: ${l.lectura || ''}${hueco}`
      })
      .join('\n')
    const prompt = `Redactá el parte de un lote ganadero en español, en cuatro oraciones como máximo.
Título ya calculado: ${String(body.titulo || '').slice(0, 300)}
Reglas: usá solo las cifras que aparecen en los renglones. No inventes pesos, kilos de pasto, precios ni un diagnóstico. Si un renglón dice que falta un dato, decilo y no lo completes.
Renglones:
${texto.slice(0, 4000)}`

    for (const model of MODELOS) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        },
      )
      if (!res.ok) continue
      const data = await res.json()
      const parte = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (parte) return json({ parte: String(parte).trim() })
    }
    return json({ error: 'No se pudo redactar el parte' }, 502)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error'
    return json({ error: message }, 500)
  }
})
