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

  return {
    registrosLluvia,
    clima,
    dietas,
    fetchRegistrosLluvia,
    fetchDietas,
    fetchClima,
  }
}
