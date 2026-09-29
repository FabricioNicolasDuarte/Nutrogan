import { ref } from 'vue'

export function createEstablecimientoModule({ supabase, authStore }) {
  const establecimientoActual = ref(null)

  const marketPrice = ref({
    value: null,
    currency: 'ARS',
    unit: 'kg',
    mode: 'manual',
    lastUpdated: null,
    source: 'Sin definir',
    esEstimado: false,
    categoria: null,
  })

  async function fetchEstablecimiento() {
    if (!authStore.profile?.establecimiento_id) return
    try {
      const { data, error } = await supabase
        .from('establecimientos')
        .select('id, nombre, ciudad, provincia, emergencia_config')
        .eq('id', authStore.profile.establecimiento_id)
        .single()
      if (error) throw error
      establecimientoActual.value = data
    } catch (error) {
      console.error('Error fetching establecimiento:', error)
    }
  }

  function setManualPrice(price, meta = {}) {
    const n = parseFloat(price)
    const categoria = meta.categoria ? String(meta.categoria).trim() : ''
    marketPrice.value = {
      ...marketPrice.value,
      value: Number.isFinite(n) ? n : null,
      mode: 'manual',
      lastUpdated: new Date().toISOString(),
      source: categoria ? `Manual — ${categoria}` : 'Manual (usuario)',
      esEstimado: false,
      categoria: categoria || null,
    }
  }

  async function fetchMarketPriceAuto() {
    try {
      const { data, error } = await supabase.functions.invoke('get-market-price')
      if (error) throw error

      if (data && data.success && data.precio != null && Number(data.precio) > 0) {
        marketPrice.value = {
          ...marketPrice.value,
          value: parseFloat(data.precio),
          mode: 'auto',
          lastUpdated: data.fecha,
          source: data.fuente || 'Mercado',
          esEstimado: !!data.es_estimado,
        }
      } else {
        // Sin inventar número: dejar valor previo / pedir manual
        marketPrice.value = {
          ...marketPrice.value,
          mode: marketPrice.value.value ? marketPrice.value.mode : 'manual',
          source: data?.fuente || 'Sin dato MAG — fijá precio manual',
          esEstimado: true,
          lastUpdated: data?.fecha || new Date().toISOString(),
        }
      }
    } catch (e) {
      console.error('Error obteniendo precio de mercado:', e)
    }
  }

  async function updateConfigEmergencia(config) {
    const estId = authStore.profile.establecimiento_id
    const { error } = await supabase
      .from('establecimientos')
      .update({ emergencia_config: config })
      .eq('id', estId)
    if (error) throw error
    if (establecimientoActual.value) establecimientoActual.value.emergencia_config = config
  }

  return {
    establecimientoActual,
    marketPrice,
    fetchEstablecimiento,
    setManualPrice,
    fetchMarketPriceAuto,
    updateConfigEmergencia,
  }
}
