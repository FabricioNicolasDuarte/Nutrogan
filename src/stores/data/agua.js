import { ref } from 'vue'
import { calcularCalidadAgua } from '../../utils/waterQuality'

export function createAguaModule({ supabase, authStore, crud }) {
  const fuentesAgua = ref([])

  async function fetchFuentesAgua() {
    const estId = authStore.profile?.establecimiento_id
    if (!estId) return
    const { data, error } = await supabase
      .from('fuentes_de_agua')
      .select('*, potreros:potrero_id(nombre), analisis_de_agua(*)')
      .eq('establecimiento_id', estId)
      .eq('activo', true)
      .order('updated_at', { ascending: false })
    if (!error) {
      data.forEach((f) => {
        if (f.analisis_de_agua)
          f.analisis_de_agua.sort(
            (a, b) => new Date(b.fecha_analisis) - new Date(a.fecha_analisis),
          )
      })
      fuentesAgua.value = data
    }
  }

  async function agregarAnalisisDeAgua(data) {
    const nuevoAnalisis = await crud.createRegistro('analisis_de_agua', data)
    const { estado, peligros } = calcularCalidadAgua(data)

    await crud.updateRegistro('fuentes_de_agua', data.fuente_id, {
      ultimo_estado: estado,
    })

    const fuente = fuentesAgua.value.find((f) => f.id === data.fuente_id)
    if (fuente) {
      if (!fuente.analisis_de_agua) fuente.analisis_de_agua = []
      fuente.analisis_de_agua.unshift(nuevoAnalisis)
      fuente.ultimo_estado = estado
    }
    return { estado, peligros }
  }

  async function createFuenteAgua(data) {
    return crud.createRegistro('fuentes_de_agua', data)
  }
  async function updateFuenteAgua(id, data) {
    return crud.updateRegistro('fuentes_de_agua', id, data)
  }
  async function deleteFuenteAgua(id) {
    return crud.deactivateRegistro('fuentes_de_agua', id)
  }

  return {
    fuentesAgua,
    fetchFuentesAgua,
    calcularCalidadAgua,
    agregarAnalisisDeAgua,
    createFuenteAgua,
    updateFuenteAgua,
    deleteFuenteAgua,
  }
}
