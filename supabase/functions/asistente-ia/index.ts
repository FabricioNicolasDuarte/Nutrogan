// supabase/functions/asistente-ia/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY')

// CAMBIO: Usamos los modelos que aparecieron en TU lista de logs
const PRIMARY_MODEL = 'gemini-2.0-flash'
const BACKUP_MODELS = [
  'gemini-2.0-flash-lite', // Muy rápido y eficiente
  'gemini-2.5-flash', // Nueva versión experimental disponible en tu cuenta
]

async function generateResponse(modelName: string, prompt: string) {
  // Limpiamos el prefijo si viene con él
  const cleanModelName = modelName.startsWith('models/') ? modelName.substring(7) : modelName

  // Usamos v1beta para compatibilidad con la serie 2.0
  const modelUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelName}:generateContent?key=${GOOGLE_API_KEY}`

  console.log(`🤖 Intentando con modelo: ${cleanModelName}`)

  try {
    const response = await fetch(modelUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Error HTTP ${response.status} con ${cleanModelName}:`, errorText)
      return {
        success: false,
        error: `Error ${response.status}`,
        status: response.status,
      }
    }

    const data = await response.json()
    return {
      success: true,
      response: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta',
    }
  } catch (err) {
    console.error('Error de red/fetch:', err)
    return { success: false, error: err.message, status: 500 }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { prompt, dataContext } = await req.json()

    // Recortar contexto si es muy grande para evitar errores de payload
    const contextStr = dataContext ? JSON.stringify(dataContext).substring(0, 40000) : ''
    const fullPrompt = `Sos el asistente de Nutrogan, app de gestión ganadera.
Reglas obligatorias:
- No diagnosticás enfermedades ni reemplazás al veterinario, al encargado o al laboratorio.
- No inventés GDPV, pesos, precios, NDVI ni stocks que no estén en el contexto.
- Si faltan datos, decilo explícitamente.
- Usá solo el contexto cargado para responder; unidades claras (kg, cabezas, ppm).

Contexto de datos del establecimiento: ${contextStr}

Pregunta del usuario: ${prompt}

Respuesta (español, concreta):`

    // 1. Intento con Modelo Primario (2.0 Flash)
    let result = await generateResponse(PRIMARY_MODEL, fullPrompt)

    // 2. Reintentos con Backups
    if (!result.success) {
      console.warn(`⚠️ Falló ${PRIMARY_MODEL}. Probando backups...`)
      for (const backup of BACKUP_MODELS) {
        // Probamos el siguiente si falló el anterior
        result = await generateResponse(backup, fullPrompt)
        if (result.success) break
      }
    }

    if (result.success) {
      return new Response(JSON.stringify({ response: result.response }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      throw new Error(`IA no disponible. Todos los modelos fallaron.`)
    }
  } catch (error) {
    console.error('Error fatal:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
