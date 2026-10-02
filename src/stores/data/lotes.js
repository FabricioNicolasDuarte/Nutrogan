import { ref } from 'vue'
import { formatGdpv } from 'src/utils/gdpv'

export function createLotesModule({ supabase, authStore, crud }) {
  const lotes = ref([])
  const potreros = ref([])
  const movimientos = ref([])
  const loteActual = ref(null)
  const evaluaciones = ref([])
  const eventosSanitarios = ref([])
  const eventosReproductivos = ref([])
  const consumos = ref([])
  const registrosVision = ref([])
  const situaciones = ref([])
  const lecturasNdvi = ref([])

  const getPotreroById = (id) => potreros.value.find((p) => p.id === id)

  async function fetchLotes() {
    const establecimientoId = authStore.profile?.establecimiento_id
    if (!establecimientoId) return
    const { data, error } = await supabase
      .from('lotes')
      .select('*, potreros(nombre)')
      .eq('establecimiento_id', establecimientoId)
      .eq('activo', true)
      .order('identificacion', { ascending: true })
    if (error) throw error
    lotes.value = data
  }

  async function fetchPotreros() {
    const establecimientoId = authStore.profile?.establecimiento_id
    if (!establecimientoId) return
    const { data, error } = await supabase
      .from('potreros')
      .select('*')
      .eq('establecimiento_id', establecimientoId)
      .eq('activo', true)
    if (error) throw error
    potreros.value = data
  }

  async function fetchMovimientos() {
    const loteIds = lotes.value.map((l) => l.id)
    if (loteIds.length === 0) {
      movimientos.value = []
      return
    }
    const { data, error } = await supabase
      .from('movimientos_de_lotes')
      .select('*, potreros:potrero_id(nombre)')
      .in('lote_id', loteIds)
      .order('fecha_entrada', { ascending: false })
    if (error) console.error('Error fetching movimientos:', error)
    else movimientos.value = data
  }

  async function fetchLoteDetalle(loteId) {
    if (!loteId) return
    const { data } = await supabase
      .from('lotes')
      .select('*, potreros(nombre)')
      .eq('id', loteId)
      .single()
    loteActual.value = data
    await Promise.all([
      fetchEvaluaciones(loteId),
      fetchEventosSanitarios(loteId),
      fetchEventosReproductivos(loteId),
      fetchConsumos(loteId),
      fetchRegistrosVision(loteId),
      fetchSituaciones(loteId),
    ])
  }

  async function fetchSituaciones(loteId) {
    const { data } = await supabase
      .from('situaciones_lote')
      .select('*')
      .eq('lote_id', loteId)
      .order('fecha', { ascending: false })
    const rest = situaciones.value.filter((r) => r.lote_id !== loteId)
    situaciones.value = [...(data || []), ...rest]
  }

  async function fetchAllSituaciones() {
    if (lotes.value.length === 0) await fetchLotes()
    const ids = lotes.value.map((l) => l.id)
    if (ids.length === 0) {
      situaciones.value = []
      return
    }
    const { data } = await supabase
      .from('situaciones_lote')
      .select('*')
      .in('lote_id', ids)
      .order('fecha', { ascending: false })
    situaciones.value = data || []
  }

  async function fetchLecturasNdvi() {
    if (potreros.value.length === 0) await fetchPotreros()
    const ids = potreros.value.map((p) => p.id)
    if (!ids.length) {
      lecturasNdvi.value = []
      return
    }
    const { data } = await supabase
      .from('lecturas_ndvi')
      .select('potrero_id, fecha, ndvi, fuente')
      .in('potrero_id', ids)
      .order('fecha', { ascending: true })
    lecturasNdvi.value = data || []
  }

  async function fetchRegistrosVision(loteId) {
    const { data } = await supabase
      .from('registros_vision')
      .select('*')
      .eq('lote_id', loteId)
      .order('fecha', { ascending: false })
    const rest = registrosVision.value.filter((r) => r.lote_id !== loteId)
    registrosVision.value = [...(data || []), ...rest]
  }

  async function fetchAllRegistrosVision() {
    if (lotes.value.length === 0) await fetchLotes()
    const ids = lotes.value.map((l) => l.id)
    if (ids.length === 0) {
      registrosVision.value = []
      return
    }
    const { data } = await supabase
      .from('registros_vision')
      .select('*')
      .in('lote_id', ids)
      .order('fecha', { ascending: false })
    registrosVision.value = data || []
  }

  async function fetchEvaluaciones(loteId) {
    const { data } = await supabase
      .from('evaluaciones')
      .select('*')
      .eq('lote_id', loteId)
      .order('fecha_evaluacion', { ascending: false })
    evaluaciones.value = data || []
  }

  async function fetchEventosSanitarios(loteId) {
    const { data } = await supabase
      .from('eventos_sanitarios')
      .select('*')
      .eq('lote_id', loteId)
      .order('fecha', { ascending: false })
    eventosSanitarios.value = data || []
  }

  async function fetchEventosReproductivos(loteId) {
    const { data } = await supabase
      .from('eventos_reproductivos')
      .select('*')
      .eq('lote_id', loteId)
      .order('fecha', { ascending: false })
    eventosReproductivos.value = data || []
  }

  async function fetchConsumos(loteId) {
    const { data } = await supabase
      .from('consumos_de_dieta')
      .select('*, dietas(nombre), alimentos(nombre)')
      .eq('lote_id', loteId)
      .order('fecha_inicio', { ascending: false })
    consumos.value = data || []
  }

  async function fetchAllEvaluaciones() {
    if (lotes.value.length === 0) await fetchLotes()
    const ids = lotes.value.map((l) => l.id)
    if (ids.length === 0) return
    const { data } = await supabase
      .from('evaluaciones')
      .select('*')
      .in('lote_id', ids)
      .order('fecha_evaluacion', { ascending: false })
    evaluaciones.value = data || []
  }

  async function fetchAllEventosSanitarios() {
    if (lotes.value.length === 0) await fetchLotes()
    const ids = lotes.value.map((l) => l.id)
    if (ids.length === 0) return
    const { data } = await supabase
      .from('eventos_sanitarios')
      .select('*')
      .in('lote_id', ids)
      .order('fecha', { ascending: false })
    eventosSanitarios.value = data || []
  }

  async function fetchAllEventosReproductivos() {
    if (lotes.value.length === 0) await fetchLotes()
    const ids = lotes.value.map((l) => l.id)
    if (ids.length === 0) return
    const { data } = await supabase
      .from('eventos_reproductivos')
      .select('*')
      .in('lote_id', ids)
      .order('fecha', { ascending: false })
    eventosReproductivos.value = data || []
  }

  async function fetchAllConsumos() {
    if (lotes.value.length === 0) await fetchLotes()
    const ids = lotes.value.map((l) => l.id)
    if (ids.length === 0) return
    const { data } = await supabase
      .from('consumos_de_dieta')
      .select('*, dietas(nombre), alimentos(nombre)')
      .in('lote_id', ids)
      .order('fecha_inicio', { ascending: false })
    consumos.value = data || []
  }

  async function moverLote(
    loteId,
    potreroDestinoId,
    fechaEntrada = new Date().toISOString().split('T')[0],
  ) {
    const { data: movAbiertos } = await supabase
      .from('movimientos_de_lotes')
      .select('id')
      .eq('lote_id', loteId)
      .is('fecha_salida', null)
    if (movAbiertos && movAbiertos.length > 0) {
      await supabase
        .from('movimientos_de_lotes')
        .update({ fecha_salida: fechaEntrada })
        .in(
          'id',
          movAbiertos.map((m) => m.id),
        )
    }
    const newMovimiento = {
      lote_id: loteId,
      potrero_id: potreroDestinoId,
      fecha_entrada: fechaEntrada,
      observaciones: 'Movimiento desde Dashboard',
    }
    const { data: movData, error: movError } = await supabase
      .from('movimientos_de_lotes')
      .insert(newMovimiento)
      .select('*, potreros:potrero_id(nombre)')
    if (movError) throw movError
    await crud.updateRegistro('lotes', loteId, { potrero_actual_id: potreroDestinoId })
    movimientos.value.unshift(movData[0])
    const loteEnStore = lotes.value.find((l) => l.id === loteId)
    if (loteEnStore) loteEnStore.potrero_actual_id = potreroDestinoId
  }

  async function moverLoteACorral(loteId) {
    const { data: movAbierto } = await supabase
      .from('movimientos_de_lotes')
      .select('id')
      .eq('lote_id', loteId)
      .is('fecha_salida', null)
    const fechaSalida = new Date().toISOString().split('T')[0]
    if (movAbierto && movAbierto.length > 0) {
      await supabase
        .from('movimientos_de_lotes')
        .update({ fecha_salida: fechaSalida })
        .in(
          'id',
          movAbierto.map((m) => m.id),
        )
    }
    await crud.updateRegistro('lotes', loteId, { potrero_actual_id: null })
    const loteEnStore = lotes.value.find((l) => l.id === loteId)
    if (loteEnStore) loteEnStore.potrero_actual_id = null
  }

  function getGDPV(evaluacionesDelLote) {
    return formatGdpv(evaluacionesDelLote)
  }

  function listenToPotreroChanges() {
    const estId = authStore.profile?.establecimiento_id
    if (!estId) return
    supabase
      .channel(`public:potreros:${estId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'potreros',
          filter: `establecimiento_id=eq.${estId}`,
        },
        (payload) => {
          const idx = potreros.value.findIndex((p) => p.id === payload.new.id)
          if (idx !== -1) potreros.value[idx] = payload.new
        },
      )
      .subscribe()
  }

  return {
    lotes,
    potreros,
    movimientos,
    loteActual,
    evaluaciones,
    eventosSanitarios,
    eventosReproductivos,
    consumos,
    registrosVision,
    situaciones,
    lecturasNdvi,
    getPotreroById,
    fetchLotes,
    fetchPotreros,
    fetchMovimientos,
    fetchLoteDetalle,
    fetchEvaluaciones,
    fetchEventosSanitarios,
    fetchEventosReproductivos,
    fetchConsumos,
    fetchRegistrosVision,
    fetchAllRegistrosVision,
    fetchSituaciones,
    fetchAllSituaciones,
    fetchLecturasNdvi,
    fetchAllEvaluaciones,
    fetchAllEventosSanitarios,
    fetchAllEventosReproductivos,
    fetchAllConsumos,
    moverLote,
    moverLoteACorral,
    getGDPV,
    listenToPotreroChanges,
  }
}
