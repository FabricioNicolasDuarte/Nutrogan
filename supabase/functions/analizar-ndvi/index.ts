import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// --- CONFIGURACIÓN SENTINEL ---

const SENTINEL_API_URL = 'https://services.sentinel-hub.com/api/v1/statistics'

// Evalscript universal (NDVI + NDMI)
const evalscript_stats = `
//VERSION=3
function setup() {
  return {
    input: ["B04", "B08", "B11", "dataMask"],
    output: [
      { id: "ndvi_band", bands: 1, sampleType: "FLOAT32" },
      { id: "ndmi_band", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1, sampleType: "UINT8" }
    ]
  };
}

function evaluatePixel(sample) {
  if (sample.dataMask == 0) {
     return { ndvi_band: [NaN], ndmi_band: [NaN], dataMask: [0] };
  }

  // NDVI = (NIR - RED) / (NIR + RED)
  let ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);

  // NDMI (Humedad) = (NIR - SWIR) / (NIR + SWIR)
  let ndmi = (sample.B08 - sample.B11) / (sample.B08 + sample.B11);

  return {
    ndvi_band: [ndvi],
    ndmi_band: [ndmi],
    dataMask: [1]
  };
}
`

// --- HELPERS ---

async function getSentinelToken(): Promise<string> {
  const clientId = Deno.env.get('SENTINEL_CLIENT_ID')
  const clientSecret = Deno.env.get('SENTINEL_CLIENT_SECRET')
  if (!clientId || !clientSecret) throw new Error('Faltan credenciales de Sentinel.')

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  })
  const response = await fetch(
    'https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    },
  )
  if (!response.ok) throw new Error('Error auth Sentinel: ' + (await response.text()))
  const data = await response.json()
  return data.access_token
}

// Lógica para obtener el DATO ACTUAL (Update Rápido / Bulk)
async function getLatestStats(geometry: any, token: string) {
  const dateTo = new Date().toISOString()
  const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Últimos 30 días

  const requestBody = {
    input: {
      bounds: { geometry: geometry },
      data: [{ type: 'sentinel-2-l2a', dataFilter: { maxCloudCoverage: 20 } }],
    },
    aggregation: {
      evalscript: evalscript_stats,
      timeRange: { from: dateFrom, to: dateTo },
      aggregationInterval: { of: 'P30D' }, // Un solo intervalo grande para promediar
    },
  }

  const response = await fetch(SENTINEL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) return null
  const json = await response.json()

  // Extraer el promedio del primer intervalo válido
  const outputs = json.data?.[0]?.outputs
  if (!outputs) return null

  const ndviMean = outputs.ndvi_band?.bands?.B0?.stats?.mean
  const ndmiMean = outputs.ndmi_band?.bands?.B0?.stats?.mean // Opcional si quieres guardar humedad también

  return { ndvi: ndviMean, ndmi: ndmiMean }
}

// Lógica para obtener HISTORIAL (Gráficos)
async function getHistoricalStats(geometry: any, token: string) {
  const dateTo = new Date().toISOString()
  const dateFrom = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString() // 6 meses

  const requestBody = {
    input: {
      bounds: { geometry: geometry },
      data: [{ type: 'sentinel-2-l2a', dataFilter: { maxCloudCoverage: 60 } }],
    },
    aggregation: {
      evalscript: evalscript_stats,
      timeRange: { from: dateFrom, to: dateTo },
      aggregationInterval: { of: 'P5D' }, // Puntos cada 5 días
    },
  }

  const response = await fetch(SENTINEL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) throw new Error(await response.text())
  return await response.json()
}

// --- FUNCIÓN PRINCIPAL ---

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('PRIVATE_SUPABASE_SERVICE_KEY') ?? '',
    )

    const { establecimiento_id, potrero_id, potrero_ids } = await req.json()
    const token = await getSentinelToken()

    // CASO 1: HISTORIAL PROFUNDO (Un solo potrero, solicitado explícitamente por ID singular)
    if (potrero_id) {
      const { data: potrero } = await supabaseAdmin
        .from('potreros')
        .select('geometria, nombre')
        .eq('id', potrero_id)
        .single()

      if (!potrero?.geometria) throw new Error('Potrero sin geometría.')

      const statsData = await getHistoricalStats(potrero.geometria, token)
      const rawData = statsData.data || []

      // Procesar serie temporal
      const historial = rawData
        .map((interval: any) => {
          const ndviStats = interval.outputs?.ndvi_band?.bands?.B0?.stats
          const ndmiStats = interval.outputs?.ndmi_band?.bands?.B0?.stats
          if ((ndviStats?.sampleCount || 0) < 10) return null // Filtrar nubes/vacíos

          return {
            date: interval.interval.from,
            ndvi: ndviStats?.mean ?? null,
            ndmi: ndmiStats?.mean ?? null,
          }
        })
        .filter((d: any) => d !== null && d.ndvi !== null)

      return new Response(
        JSON.stringify({
          potrero: potrero.nombre,
          historial: historial,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    // CASO 2: ACTUALIZACIÓN RÁPIDA (Bulk o botón refresh simple)
    // Se ejecuta si viene `potrero_ids` (array) o solo `establecimiento_id`
    else {
      if (!establecimiento_id) throw new Error('Falta establecimiento_id')

      let query = supabaseAdmin
        .from('potreros')
        .select('id, nombre, geometria')
        .eq('establecimiento_id', establecimiento_id)
        .neq('geometria', null)

      if (potrero_ids && potrero_ids.length > 0) {
        query = query.in('id', potrero_ids)
      }

      const { data: potreros } = await query
      if (!potreros || potreros.length === 0) throw new Error('No hay potreros con geometría.')

      const resultados = []

      for (const p of potreros) {
        const stats = await getLatestStats(p.geometria, token)

        if (stats && stats.ndvi !== undefined) {
          // Actualizar DB
          await supabaseAdmin
            .from('potreros')
            .update({
              ultimo_ndvi: stats.ndvi,
              fecha_ultimo_ndvi: new Date().toISOString(),
              // ultimo_ndmi: stats.ndmi // Descomentar si añadiste la columna
            })
            .eq('id', p.id)

          resultados.push({ id: p.id, estado: 'exitoso', ndvi: stats.ndvi })
        } else {
          resultados.push({ id: p.id, estado: 'fallido' })
        }
      }

      return new Response(
        JSON.stringify({
          message: 'Actualización completada',
          resultados,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
