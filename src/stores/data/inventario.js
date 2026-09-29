import { ref } from 'vue'

export function createInventarioModule({ supabase, authStore, crud }) {
  const inventarioItems = ref([])
  const inventarioMovimientos = ref([])

  async function fetchInventarioItems() {
    const estId = authStore.profile?.establecimiento_id
    if (!estId) return
    const { data, error } = await supabase
      .from('inventario_items')
      .select('*')
      .eq('establecimiento_id', estId)
      .eq('activo', true)
      .order('nombre', { ascending: true })
    if (!error) inventarioItems.value = data
  }

  async function fetchInventarioMovimientos() {
    const estId = authStore.profile?.establecimiento_id
    if (!estId) return

    // Filtrar por establecimiento vía join (la tabla de movimientos no siempre tiene est_id)
    const { data, error } = await supabase
      .from('inventario_movimientos')
      .select(
        '*, inventario_items!inner(nombre, unidad, precio_unitario, establecimiento_id), lotes(identificacion)',
      )
      .eq('inventario_items.establecimiento_id', estId)
      .order('fecha', { ascending: false })
      .limit(200)

    if (error) {
      // Fallback: filtrar en cliente por ítems del establecimiento
      console.warn('[inventario_movimientos] join filter falló, fallback local:', error.message)
      const itemIds = new Set(
        (inventarioItems.value || [])
          .filter((i) => i.establecimiento_id === estId || !i.establecimiento_id)
          .map((i) => i.id),
      )
      const { data: raw } = await supabase
        .from('inventario_movimientos')
        .select('*, inventario_items(nombre, unidad, precio_unitario), lotes(identificacion)')
        .order('fecha', { ascending: false })
        .limit(200)
      inventarioMovimientos.value = (raw || []).filter(
        (m) => itemIds.has(m.item_id) || itemIds.has(m.inventario_item_id),
      )
      return
    }

    inventarioMovimientos.value = data || []
  }

  async function registrarMovimientoInventario(rpcData) {
    // 1. Identificar el item en memoria
    const itemIndex = inventarioItems.value.findIndex((i) => i.id === rpcData.p_item_id)

    // Variable para rollback si falla
    let previousStock = 0

    if (itemIndex !== -1) {
      // PARSE FLOATS para evitar concatenación de strings ("20" + "5" = "205")
      previousStock = parseFloat(inventarioItems.value[itemIndex].stock_actual || 0)

      // Cantidad enviada por el formulario (ya viene negativa para Uso, positiva para Compra)
      const cantidadChange = parseFloat(rpcData.p_cantidad)

      if (!isNaN(previousStock) && !isNaN(cantidadChange)) {
        // Cálculo matemático seguro
        const nuevaCantidad = previousStock + cantidadChange

        // Actualización Optimista
        inventarioItems.value[itemIndex].stock_actual = nuevaCantidad
      }
    }

    try {
      // 2. Ejecutar RPC en Base de Datos
      const { error } = await supabase.rpc('registrar_movimiento_inventario', rpcData)
      if (error) throw error

      // 3. ACTUALIZACIÓN AUTORITATIVA (Consultar dato real)
      // Esto corrige cualquier desfase si la DB hizo algo distinto
      const { data: itemFresco, error: fetchError } = await supabase
        .from('inventario_items')
        .select('stock_actual')
        .eq('id', rpcData.p_item_id)
        .single()

      if (!fetchError && itemFresco) {
        if (itemIndex !== -1) {
          inventarioItems.value[itemIndex].stock_actual = parseFloat(itemFresco.stock_actual)
        }
        return itemFresco.stock_actual
      }

      // Si falló el fetch, devolvemos el cálculo optimista
      const updatedItem = inventarioItems.value.find((i) => i.id === rpcData.p_item_id)
      return updatedItem ? updatedItem.stock_actual : previousStock
    } catch (err) {
      // Rollback visual
      console.error('Error en movimiento de inventario:', err)
      if (itemIndex !== -1) {
        inventarioItems.value[itemIndex].stock_actual = previousStock
      }
      throw err
    } finally {
      fetchInventarioMovimientos()
    }
  }

  async function createInventarioItem(data) {
    return crud.createRegistro('inventario_items', data)
  }
  async function updateInventarioItem(id, data) {
    return crud.updateRegistro('inventario_items', id, data)
  }
  async function deleteInventarioItem(id) {
    return crud.deactivateRegistro('inventario_items', id)
  }

  return {
    inventarioItems,
    inventarioMovimientos,
    fetchInventarioItems,
    fetchInventarioMovimientos,
    registrarMovimientoInventario,
    createInventarioItem,
    updateInventarioItem,
    deleteInventarioItem,
  }
}
