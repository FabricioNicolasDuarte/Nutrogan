/**
 * Generic CRUD against Supabase + local list sync.
 * Reads list/detail refs from ctx.bag at call time (modules register into bag after creation).
 */
export function createCrudModule({ supabase, authStore, bag }) {
  function getLocalListByTableName(tableName) {
    switch (tableName) {
      case 'lotes':
        return bag.lotes
      case 'potreros':
        return bag.potreros
      case 'fuentes_de_agua':
        return bag.fuentesAgua
      case 'inventario_items':
        return bag.inventarioItems
      case 'registros_lluvia':
        return bag.registrosLluvia
      case 'dietas':
        return bag.dietas
      default:
        return null
    }
  }

  async function createRegistro(tabla, registro) {
    const tablasSinEstablecimiento = [
      'evaluaciones',
      'eventos_sanitarios',
      'eventos_reproductivos',
      'consumos_de_dieta',
      'analisis_de_agua',
      'movimientos_de_lotes',
    ]
    if (!registro.establecimiento_id && !tablasSinEstablecimiento.includes(tabla)) {
      registro.establecimiento_id = authStore.profile?.establecimiento_id
    }
    const { data, error } = await supabase.from(tabla).insert(registro).select()
    if (error) throw error
    const nuevoRegistro = data[0]
    const listaLocal = getLocalListByTableName(tabla)
    if (listaLocal) listaLocal.value.unshift(nuevoRegistro)

    if (
      tabla === 'evaluaciones' &&
      bag.loteActual?.value &&
      registro.lote_id === bag.loteActual.value.id
    )
      bag.evaluaciones.value.unshift(nuevoRegistro)
    if (
      tabla === 'eventos_sanitarios' &&
      bag.loteActual?.value &&
      registro.lote_id === bag.loteActual.value.id
    )
      bag.eventosSanitarios.value.unshift(nuevoRegistro)
    if (
      tabla === 'eventos_reproductivos' &&
      bag.loteActual?.value &&
      registro.lote_id === bag.loteActual.value.id
    )
      bag.eventosReproductivos.value.unshift(nuevoRegistro)
    if (
      tabla === 'consumos_de_dieta' &&
      bag.loteActual?.value &&
      registro.lote_id === bag.loteActual.value.id
    )
      bag.consumos.value.unshift(nuevoRegistro)
    return nuevoRegistro
  }

  async function updateRegistro(tabla, id, dataObject) {
    const { data, error } = await supabase.from(tabla).update(dataObject).eq('id', id).select()
    if (error) throw error
    const registroActualizado = data[0]
    const listaLocal = getLocalListByTableName(tabla)
    if (listaLocal) {
      const index = listaLocal.value.findIndex((item) => item.id === id)
      if (index !== -1) Object.assign(listaLocal.value[index], registroActualizado)
    }
    if (tabla === 'lotes' && bag.loteActual?.value && bag.loteActual.value.id === id)
      Object.assign(bag.loteActual.value, registroActualizado)
    return registroActualizado
  }

  async function deactivateRegistro(tabla, id) {
    const { data, error } = await supabase
      .from(tabla)
      .update({ activo: false })
      .eq('id', id)
      .select()
    if (error) throw error
    const listaLocal = getLocalListByTableName(tabla)
    if (listaLocal) listaLocal.value = listaLocal.value.filter((item) => item.id !== id)
    return data
  }

  return {
    getLocalListByTableName,
    createRegistro,
    updateRegistro,
    deactivateRegistro,
  }
}
