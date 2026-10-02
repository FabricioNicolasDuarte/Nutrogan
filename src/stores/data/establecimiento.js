import { ref } from 'vue'

export function createEstablecimientoModule({ supabase, authStore }) {
  const establecimientoActual = ref(null)

  const marketPrice = ref({
    value: null,
    currency: 'ARS',
    unit: 'kg',
    mode: 'auto',
    lastUpdated: null,
    source: 'Mercado Agroganadero',
    esEstimado: false,
    categoria: null,
    categoriaPreferida: 'novillo',
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

  async function fetchMarketPriceAuto(opts = {}) {
    const categoria =
      opts.categoria || marketPrice.value.categoriaPreferida || marketPrice.value.categoria || 'novillo'
    try {
      const { data, error } = await supabase.functions.invoke('get-market-price', {
        body: { categoria },
      })
      if (error) throw error

      if (data && data.success && data.precio != null && Number(data.precio) > 0) {
        marketPrice.value = {
          ...marketPrice.value,
          value: parseFloat(data.precio),
          mode: 'auto',
          lastUpdated: data.fecha,
          source: data.fuente || 'Mercado',
          esEstimado: !!data.es_estimado,
          categoria: data.categoria || (data.match_categoria ? categoria : null),
          categoriaPreferida: categoria,
        }
      } else if (!(Number(marketPrice.value.value) > 0)) {
        marketPrice.value = {
          ...marketPrice.value,
          mode: 'auto',
          value: null,
          source: 'Sin dato del Mercado Agroganadero',
          esEstimado: true,
          lastUpdated: data?.fecha || new Date().toISOString(),
          categoriaPreferida: categoria,
        }
      }
    } catch (e) {
      console.error('Error obteniendo precio de mercado:', e)
      if (!(Number(marketPrice.value.value) > 0)) {
        marketPrice.value = {
          ...marketPrice.value,
          mode: 'auto',
          source: 'Sin dato del Mercado Agroganadero',
          esEstimado: true,
        }
      }
    }
  }

  async function ensureMarketPrice() {
    const actual = marketPrice.value
    if (actual.mode === 'manual' && Number(actual.value) > 0) return
    await fetchMarketPriceAuto()
  }

  function setCategoriaPreferida(categoria) {
    marketPrice.value = {
      ...marketPrice.value,
      categoriaPreferida: categoria || 'novillo',
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
    ensureMarketPrice,
    setCategoriaPreferida,
    updateConfigEmergencia,
  }
}
