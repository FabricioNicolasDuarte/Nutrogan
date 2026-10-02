import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const PRIMARY_MODEL = 'gemini-2.0-flash'
const BACKUP_MODELS = ['gemini-2.0-flash-lite', 'gemini-2.5-flash']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const PROMPTS: Record<string, string> = {
  condicion: `Sos un asesor ganadero. Mirá el bovino de la foto y estimá la condición corporal en la escala INTA de Argentina, de 1 a 9. Se permiten medios puntos, por ejemplo 4.5.
No reemplazás al veterinario ni al encargado. Si no se distingue un bovino, no inventes el número.
Respondé solo JSON: {"condicion_corporal": 5, "nota": "una frase de lo que se ve"}
Si no se puede estimar: {"condicion_corporal": null, "nota": "No se distingue un animal para estimar la condición."}`,
  anomalia: `Sos un asesor ganadero. Mirá la foto y describí si hay una anomalía visible: lesión en el animal, problema de pasto o de una instalación.
No des un diagnóstico de enfermedad ni reemplaces al veterinario. "seria" solo si se ve una lesión, un animal caído o un riesgo evidente. Si no hay nada llamativo, usá "baja".
Respondé solo JSON: {"descripcion": "qué se ve", "gravedad": "baja", "nota": "una frase"}`,
  fecal: `Sos un asesor ganadero. Mirá la muestra de heces bovinas y describí consistencia, color y si hay signos visibles de parásitos.
No afirmes parásitos si no se ven signos claros. Esto no reemplaza un análisis de laboratorio.
Consistencia: Normal, Blanda, Dura o Diarrea. Color: Marrón, Verde, Pálido o Sanguinolento.
Respondé solo JSON: {"consistencia": "Normal", "color": "Marrón", "presencia_parasitos": false, "nota": "una frase"}`,
}

async function generate(modelName: string, prompt: string, imageBase64: string) {
  const clean = modelName.startsWith('models/') ? modelName.slice(7) : modelName
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${clean}:generateContent?key=${GOOGLE_API_KEY}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
          ],
        },
      ],
    }),
  })
  if (!response.ok) {
    return { success: false as const, status: response.status }
  }
  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return { success: true as const, text }
}

async function loteVisible(loteId: string, authHeader: string) {
  const base = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!base || !anon || !authHeader) return false
  const res = await fetch(`${base}/rest/v1/lotes?id=eq.${loteId}&select=id`, {
    headers: { Authorization: authHeader, apikey: anon },
  })
  if (!res.ok) return false
  const rows = await res.json()
  return Array.isArray(rows) && rows.length > 0
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!GOOGLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'La visión no está configurada en el servidor.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const modo = String(body?.modo || '')
    const loteId = String(body?.lote_id || '')
    const image = String(body?.image_base64 || '').replace(/^data:image\/\w+;base64,/, '')
    if (!PROMPTS[modo] || !UUID_RE.test(loteId)) {
      return new Response(JSON.stringify({ error: 'Pedí un lote y un tipo de lectura válidos.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!image || image.length > 6_000_000) {
      return new Response(JSON.stringify({ error: 'La foto es demasiado grande o está vacía.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization') || ''
    const visible = await loteVisible(loteId, authHeader)
    if (!visible) {
      return new Response(JSON.stringify({ error: 'No podés leer este lote.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let result = await generate(PRIMARY_MODEL, PROMPTS[modo], image)
    if (!result.success) {
      for (const backup of BACKUP_MODELS) {
        result = await generate(backup, PROMPTS[modo], image)
        if (result.success) break
      }
    }
    if (!result.success) {
      return new Response(JSON.stringify({ error: 'No se pudo leer la foto. Probá de nuevo con más luz.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ modo, texto: result.text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Error al analizar la foto.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
