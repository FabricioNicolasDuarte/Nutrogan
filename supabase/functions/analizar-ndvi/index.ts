/**
 * NDVI para Nutrogan — misma estrategia que SIGAG (agro-proxy F4.3):
 * 1) AgroMonitoring si hay AGRO_API_KEY (opcional)
 * 2) Fallback gratis: Sentinel-2 L2A vía Microsoft Planetary Computer (sin API key)
 *
 * Sentinel Hub (client credentials) ya no se usa.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const PC_STAC = 'https://planetarycomputer.microsoft.com/api/stac/v1/search'
const PC_DATA = 'https://planetarycomputer.microsoft.com/api/data/v1'

type NdviHit = {
  mean: number | null
  reason: string
  fuente?: string
  scenes?: number
  sceneDate?: string | null
  ndmi?: number | null
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Normaliza geometría potrero → Polygon GeoJSON + ring [lng,lat] + centroide */
function parsePotreroGeometry(raw: unknown): {
  geometry: { type: 'Polygon'; coordinates: number[][][] }
  ring: number[][]
  lat: number
  lng: number
} {
  let g: any = raw
  if (typeof g === 'string') g = JSON.parse(g)
  if (g?.type === 'Feature') g = g.geometry
  if (g?.type === 'FeatureCollection') g = g.features?.[0]?.geometry
  if (!g || g.type !== 'Polygon' || !Array.isArray(g.coordinates?.[0])) {
    throw new Error('Potrero sin polígono válido')
  }
  const ring: number[][] = g.coordinates[0].map((pt: number[]) => [Number(pt[0]), Number(pt[1])])
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]])
  }
  let sumLng = 0
  let sumLat = 0
  const n = ring.length - 1
  for (let i = 0; i < n; i++) {
    sumLng += ring[i][0]
    sumLat += ring[i][1]
  }
  return {
    geometry: { type: 'Polygon', coordinates: [ring] },
    ring,
    lng: sumLng / n,
    lat: sumLat / n,
  }
}

function bboxFromRing(ring: number[][]): [number, number, number, number] {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const [plng, plat] of ring) {
    if (plng < minLng) minLng = plng
    if (plng > maxLng) maxLng = plng
    if (plat < minLat) minLat = plat
    if (plat > maxLat) maxLat = plat
  }
  if (maxLng - minLng < 0.004) {
    const mid = (minLng + maxLng) / 2
    minLng = mid - 0.002
    maxLng = mid + 0.002
  }
  if (maxLat - minLat < 0.004) {
    const mid = (minLat + maxLat) / 2
    minLat = mid - 0.002
    maxLat = mid + 0.002
  }
  return [minLng, minLat, maxLng, maxLat]
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Sentinel-2 NDVI gratis vía Microsoft Planetary Computer (sin API key). Portado de SIGAG agro-proxy. */
async function fetchNdviPlanetaryComputer(
  lat: number,
  lng: number,
  geoRing: number[][],
  opts: { days?: number; limit?: number } = {},
): Promise<NdviHit> {
  const days = opts.days ?? 120
  const limit = opts.limit ?? 8
  const bbox = bboxFromRing(geoRing)
  const end = new Date()
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const searchRes = await fetch(PC_STAC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collections: ['sentinel-2-l2a'],
      bbox,
      datetime: `${start.toISOString().slice(0, 10)}/${end.toISOString().slice(0, 10)}`,
      query: { 'eo:cloud_cover': { lt: 40 } },
      limit,
      sortby: [{ field: 'eo:cloud_cover', direction: 'asc' }],
    }),
  })
  if (!searchRes.ok) {
    return { mean: null, reason: `pc_search_${searchRes.status}`, fuente: 'sentinel2-pc' }
  }
  const searchJson = await searchRes.json()
  const features = Array.isArray(searchJson?.features) ? searchJson.features : []
  if (!features.length) {
    return { mean: null, reason: 'pc_no_scenes', scenes: 0, fuente: 'sentinel2-pc' }
  }

  const featurePoly = {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [geoRing] },
  }

  for (const feat of features.slice(0, 5)) {
    const itemId = String(feat?.id || '')
    if (!itemId) continue
    const sceneDate = feat?.properties?.datetime || null

    const statsUrl =
      `${PC_DATA}/item/statistics?collection=sentinel-2-l2a` +
      `&item=${encodeURIComponent(itemId)}` +
      `&expression=${encodeURIComponent('(B08-B04)/(B08+B04)')}` +
      `&asset_as_band=true&max_size=64`

    try {
      const statsRes = await fetch(statsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(featurePoly),
      })
      if (statsRes.ok) {
        const statsJson = await statsRes.json()
        const stats = statsJson?.properties?.statistics?.['(B08-B04)/(B08+B04)']
        const mean = Number(stats?.mean ?? stats?.median)
        const valid = Number(stats?.valid_percent ?? 100)
        if (Number.isFinite(mean) && valid >= 20 && mean > -0.2 && mean < 1) {
          return {
            mean: parseFloat(mean.toFixed(3)),
            reason: 'ok',
            scenes: features.length,
            fuente: 'sentinel2-pc',
            sceneDate,
          }
        }
      }
    } catch {
      /* try point */
    }

    try {
      const pointUrl =
        `${PC_DATA}/item/point/${lng},${lat}?collection=sentinel-2-l2a` +
        `&item=${encodeURIComponent(itemId)}&assets=B04&assets=B08`
      const pointRes = await fetch(pointUrl)
      if (!pointRes.ok) continue
      const pointJson = await pointRes.json()
      const values = pointJson?.values
      if (!Array.isArray(values) || values.length < 2) continue
      const red = Number(values[0])
      const nir = Number(values[1])
      if (!Number.isFinite(red) || !Number.isFinite(nir) || red + nir === 0) continue
      const mean = (nir - red) / (nir + red)
      if (mean > -0.2 && mean < 1) {
        return {
          mean: parseFloat(mean.toFixed(3)),
          reason: 'ok_point',
          scenes: features.length,
          fuente: 'sentinel2-pc',
          sceneDate,
        }
      }
    } catch {
      /* next scene */
    }
  }

  return {
    mean: null,
    reason: 'pc_no_valid_ndvi',
    scenes: features.length,
    fuente: 'sentinel2-pc',
  }
}

/** Serie temporal: una escena → un punto NDVI (para gráficos). */
async function fetchNdviHistorialPc(
  lat: number,
  lng: number,
  geoRing: number[][],
  maxPuntos = 12,
): Promise<{ date: string; ndvi: number; ndmi: null }[]> {
  const bbox = bboxFromRing(geoRing)
  const end = new Date()
  const start = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
  const searchRes = await fetch(PC_STAC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collections: ['sentinel-2-l2a'],
      bbox,
      datetime: `${start.toISOString().slice(0, 10)}/${end.toISOString().slice(0, 10)}`,
      query: { 'eo:cloud_cover': { lt: 50 } },
      limit: 24,
      sortby: [{ field: 'datetime', direction: 'asc' }],
    }),
  })
  if (!searchRes.ok) return []
  const searchJson = await searchRes.json()
  const features = Array.isArray(searchJson?.features) ? searchJson.features : []
  const featurePoly = {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [geoRing] },
  }
  const out: { date: string; ndvi: number; ndmi: null }[] = []

  for (const feat of features) {
    const itemId = String(feat?.id || '')
    const date = feat?.properties?.datetime
    if (!itemId || !date) continue

    const statsUrl =
      `${PC_DATA}/item/statistics?collection=sentinel-2-l2a` +
      `&item=${encodeURIComponent(itemId)}` +
      `&expression=${encodeURIComponent('(B08-B04)/(B08+B04)')}` +
      `&asset_as_band=true&max_size=48`

    try {
      const statsRes = await fetch(statsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(featurePoly),
      })
      if (statsRes.ok) {
        const statsJson = await statsRes.json()
        const stats = statsJson?.properties?.statistics?.['(B08-B04)/(B08+B04)']
        const mean = Number(stats?.mean ?? stats?.median)
        const valid = Number(stats?.valid_percent ?? 100)
        if (Number.isFinite(mean) && valid >= 15 && mean > -0.2 && mean < 1) {
          out.push({ date, ndvi: parseFloat(mean.toFixed(3)), ndmi: null })
          if (out.length >= maxPuntos) return out.sort((a, b) => a.date.localeCompare(b.date))
          continue
        }
      }
    } catch {
      /* point fallback */
    }

    try {
      const pointUrl =
        `${PC_DATA}/item/point/${lng},${lat}?collection=sentinel-2-l2a` +
        `&item=${encodeURIComponent(itemId)}&assets=B04&assets=B08`
      const pointRes = await fetch(pointUrl)
      if (!pointRes.ok) continue
      const pointJson = await pointRes.json()
      const values = pointJson?.values
      if (!Array.isArray(values) || values.length < 2) continue
      const red = Number(values[0])
      const nir = Number(values[1])
      if (!Number.isFinite(red) || !Number.isFinite(nir) || red + nir === 0) continue
      const mean = (nir - red) / (nir + red)
      if (mean > -0.2 && mean < 1) {
        out.push({ date, ndvi: parseFloat(mean.toFixed(3)), ndmi: null })
        if (out.length >= maxPuntos) break
      }
    } catch {
      /* skip */
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date))
}

async function guardarSerie(
  supabaseAdmin: ReturnType<typeof createClient>,
  potreroId: string,
  puntos: { date: string; ndvi: number }[],
) {
  const filas = puntos
    .map((p) => ({
      potrero_id: potreroId,
      fecha: String(p.date).slice(0, 10),
      ndvi: p.ndvi,
      fuente: 'sentinel2-pc',
    }))
    .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.fecha))
  if (!filas.length) return null
  await supabaseAdmin.from('lecturas_ndvi').upsert(filas, { onConflict: 'potrero_id,fecha' })
  const ultima = [...filas].sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1)
  if (!ultima) return null
  await supabaseAdmin
    .from('potreros')
    .update({ ultimo_ndvi: ultima.ndvi, fecha_ultimo_ndvi: ultima.fecha })
    .eq('id', potreroId)
  return ultima
}

/** AgroMonitoring opcional (misma idea SIGAG). */
async function fetchNdviAgro(apiKey: string, geoRing: number[][]): Promise<NdviHit> {
  const payloadGeo = {
    name: `Nutrogan_Tmp_${Date.now()}`,
    geo_json: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [geoRing] },
    },
  }
  let tempPolygonId: string | null = null
  try {
    const resPoly = await fetch(
      `https://api.agromonitoring.com/agro/1.0/polygons?appid=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadGeo),
      },
    )
    const polyData = await resPoly.json().catch(() => ({}))
    if (!resPoly.ok || !polyData?.id) {
      return { mean: null, reason: 'agro_poly_fail', fuente: 'agro' }
    }
    tempPolygonId = String(polyData.id)
    await sleep(700)
    const hoyUnix = Math.floor(Date.now() / 1000) - 3600
    const pasadoUnix = hoyUnix - 90 * 24 * 60 * 60
    const resNdvi = await fetch(
      `https://api.agromonitoring.com/agro/1.0/ndvi/history?polyid=${tempPolygonId}&start=${pasadoUnix}&end=${hoyUnix}&appid=${apiKey}`,
    )
    const ndviData = await resNdvi.json().catch(() => null)
    if (!resNdvi.ok || !Array.isArray(ndviData) || ndviData.length === 0) {
      return { mean: null, reason: 'agro_ndvi_empty', fuente: 'agro', scenes: 0 }
    }
    const means = ndviData
      .map((e: any) => Number(e?.data?.mean ?? e?.mean))
      .filter((n: number) => Number.isFinite(n) && n > 0.01)
      .slice(-8)
      .sort((a: number, b: number) => a - b)
    if (!means.length) return { mean: null, reason: 'agro_filtered', fuente: 'agro' }
    const mid = Math.floor(means.length / 2)
    const chosen = means.length % 2 ? means[mid] : (means[mid - 1] + means[mid]) / 2
    return {
      mean: parseFloat(Number(chosen).toFixed(3)),
      reason: 'ok',
      scenes: ndviData.length,
      fuente: 'agro',
    }
  } finally {
    if (tempPolygonId) {
      await fetch(
        `https://api.agromonitoring.com/agro/1.0/polygons/${tempPolygonId}?appid=${apiKey}`,
        { method: 'DELETE' },
      ).catch(() => {})
    }
  }
}

async function resolveNdvi(lat: number, lng: number, ring: number[][]): Promise<NdviHit> {
  const agroKey = Deno.env.get('AGRO_API_KEY')
  let hit: NdviHit = { mean: null, reason: 'no_provider' }
  if (agroKey) {
    hit = await fetchNdviAgro(agroKey, ring)
  }
  if (hit.mean == null) {
    const pc = await fetchNdviPlanetaryComputer(lat, lng, ring)
    if (pc.mean != null) return pc
    return hit.reason === 'no_provider' ? pc : { ...hit, reason: `${hit.reason}|${pc.reason}` }
  }
  return hit
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const serviceKey =
      Deno.env.get('PRIVATE_SUPABASE_SERVICE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey ?? '')

    const body = await req.json()
    const { establecimiento_id, potrero_id, potrero_ids, guardar_serie, max_potreros } = body

    // CASO 1: historial (gráfico)
    if (potrero_id) {
      const { data: potrero, error } = await supabaseAdmin
        .from('potreros')
        .select('geometria, nombre')
        .eq('id', potrero_id)
        .single()
      if (error || !potrero?.geometria) throw new Error('Potrero sin geometría.')

      const { ring, lat, lng } = parsePotreroGeometry(potrero.geometria)
      const historial = await fetchNdviHistorialPc(lat, lng, ring, 12)
      await guardarSerie(supabaseAdmin, potrero_id, historial)

      return json({
        potrero: potrero.nombre,
        historial,
        fuente: 'sentinel2-pc',
        modo: 'planetary_computer',
      })
    }

    // CASO 2: bulk / un potrero (actualiza ultimo_ndvi)
    if (!establecimiento_id) throw new Error('Falta establecimiento_id')

    let query = supabaseAdmin
      .from('potreros')
      .select('id, nombre, geometria')
      .eq('establecimiento_id', establecimiento_id)
      .not('geometria', 'is', null)

    if (potrero_ids && potrero_ids.length > 0) {
      query = query.in('id', potrero_ids)
    }

    const { data: potreros } = await query
    if (!potreros || potreros.length === 0) throw new Error('No hay potreros con geometría.')
    const lotePotreros = guardar_serie
      ? potreros.slice(0, Number(max_potreros) > 0 ? Number(max_potreros) : 6)
      : potreros

    const resultados: {
      id: string
      estado: string
      ndvi?: number
      fecha?: string
      fuente?: string
      reason?: string
    }[] = []

    for (const p of lotePotreros) {
      try {
        const { ring, lat, lng } = parsePotreroGeometry(p.geometria)
        if (guardar_serie) {
          const serie = await fetchNdviHistorialPc(lat, lng, ring, 6)
          const ultima = await guardarSerie(supabaseAdmin, p.id, serie)
          resultados.push(
            ultima
              ? { id: p.id, estado: 'exitoso', ndvi: ultima.ndvi, fecha: ultima.fecha, fuente: 'sentinel2-pc' }
              : { id: p.id, estado: 'fallido', reason: 'sin_serie', fuente: 'sentinel2-pc' },
          )
          continue
        }
        const hit = await resolveNdvi(lat, lng, ring)
        const fecha = new Date().toISOString()

        if (hit.mean != null) {
          await supabaseAdmin
            .from('potreros')
            .update({
              ultimo_ndvi: hit.mean,
              fecha_ultimo_ndvi: fecha,
            })
            .eq('id', p.id)

          resultados.push({
            id: p.id,
            estado: 'exitoso',
            ndvi: hit.mean,
            fecha,
            fuente: hit.fuente,
          })
        } else {
          resultados.push({
            id: p.id,
            estado: 'fallido',
            reason: hit.reason,
            fuente: hit.fuente,
          })
        }
      } catch (e) {
        resultados.push({
          id: p.id,
          estado: 'fallido',
          reason: e instanceof Error ? e.message : 'error',
        })
      }
    }

    return json({
      message: 'Actualización completada (Planetary Computer / Agro opcional)',
      resultados,
      provider: 'sentinel2-pc',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error:', message)
    return json({ error: message }, 500)
  }
})
