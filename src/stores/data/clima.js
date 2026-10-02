import { ref } from 'vue'

export function createClimaModule({ supabase, authStore, bag }) {
  const registrosLluvia = ref([])
  const clima = ref({ current: null, historial: [], forecast: [] })
  const dietas = ref([])

  async function fetchRegistrosLluvia() {
    const estId = authStore.profile?.establecimiento_id
    if (!estId) return
    const { data, error } = await supabase
      .from('registros_lluvia')
      .select('*')
      .eq('establecimiento_id', estId)
      .order('fecha', { ascending: false })
    if (!error) registrosLluvia.value = data
  }

  async function fetchDietas() {
    const estId = authStore.profile?.establecimiento_id
    if (!estId) return
    const { data, error } = await supabase
      .from('dietas')
      .select('*, dietas_items(*, alimentos(nombre, precio_kg))')
      .eq('establecimiento_id', estId)
    if (!error) dietas.value = data
  }

  async function fetchClima() {
    if (bag.potreros.value.length === 0) await bag.fetchPotreros()
    const potreroConUbicacion = bag.potreros.value.find((p) => p.geometria)
    let lat = -26.17,
      lng = -58.17
    if (potreroConUbicacion) {
      try {
        let geo = potreroConUbicacion.geometria
        if (typeof geo === 'string') geo = JSON.parse(geo)
        if (geo.type === 'Feature') geo = geo.geometry
        if (geo.type === 'Polygon') {
          lat = geo.coordinates[0][0][1]
          lng = geo.coordinates[0][0][0]
        }
      } catch (e) {
        console.error(e)
      }
    }
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum,weathercode,temperature_2m_max,temperature_2m_min&current=temperature_2m,weathercode,windspeed_10m&timezone=auto&past_days=30&forecast_days=6`
      const response = await fetch(url)
      const d = await response.json()
      const daily = d.daily
      const historial = []
      const forecast = []
      for (let i = 0; i < daily.time.length; i++) {
        const dia = {
          fecha: daily.time[i],
          milimetros: daily.precipitation_sum[i],
          weathercode: daily.weathercode[i],
          temp_max: daily.temperature_2m_max[i],
          temp_min: daily.temperature_2m_min[i],
        }
        if (new Date(dia.fecha) <= new Date(new Date().setHours(0, 0, 0, 0))) historial.push(dia)
        else if (forecast.length < 5) forecast.push(dia)
      }
      clima.value = { current: d.current, historial: historial.reverse(), forecast: forecast }
    } catch {
      clima.value = { current: null, historial: [], forecast: [] }
    }
  }

  const lluviaEstimada = ref({})

  function centroDe(geometria) {
    try {
      let geo = geometria
      if (typeof geo === 'string') geo = JSON.parse(geo)
      if (geo?.type === 'Feature') geo = geo.geometry
      const ring = geo?.type === 'Polygon' ? geo.coordinates?.[0] : null
      if (!Array.isArray(ring) || ring.length < 3) return null
      let lng = 0
      let lat = 0
      const n = ring.length - (ring[0][0] === ring[ring.length - 1][0] ? 1 : 0)
      for (let i = 0; i < n; i++) {
        lng += Number(ring[i][0])
        lat += Number(ring[i][1])
      }
      if (!n) return null
      return { lat: lat / n, lng: lng / n }
    } catch {
      return null
    }
  }

  async function mm30(lat, lng) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=precipitation_sum&timezone=auto&past_days=30&forecast_days=1`
    const response = await fetch(url)
    if (!response.ok) return null
    const data = await response.json()
    const dias = data?.daily?.time || []
    const mm = data?.daily?.precipitation_sum || []
    const hoy = new Date().toISOString().slice(0, 10)
    let suma = 0
    let n = 0
    for (let i = 0; i < dias.length; i++) {
      if (dias[i] > hoy) continue
      const valor = Number(mm[i])
      if (!Number.isFinite(valor)) continue
      suma += valor
      n += 1
    }
    return n ? suma : null
  }

  async function fetchLluviaEstimada() {
    if (bag.potreros.value.length === 0) await bag.fetchPotreros()
    const cache = new Map()
    const next = {}
    for (const potrero of bag.potreros.value) {
      const centro = centroDe(potrero.geometria)
      if (!centro) continue
      const clave = `${centro.lat.toFixed(2)},${centro.lng.toFixed(2)}`
      if (!cache.has(clave)) cache.set(clave, mm30(centro.lat, centro.lng))
      const total = await cache.get(clave)
      if (total != null) next[potrero.id] = total
    }
    lluviaEstimada.value = next
  }

  return {
    registrosLluvia,
    clima,
    dietas,
    lluviaEstimada,
    fetchRegistrosLluvia,
    fetchDietas,
    fetchClima,
    fetchLluviaEstimada,
  }
}
