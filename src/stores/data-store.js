import { defineStore } from 'pinia'
import { supabase } from 'boot/supabase'
import { ref } from 'vue'
import { useAuthStore } from './auth-store'

export const useDataStore = defineStore(
  'data',
  () => {
    // --- ESTADO ---
    const authStore = useAuthStore()

    // Recursos Principales
    const lotes = ref([])
    const potreros = ref([])
    const fuentesAgua = ref([])
    const registrosLluvia = ref([])
    const dietas = ref([])
    const movimientos = ref([])
    const clima = ref({ current: null, historial: [], forecast: [] })
    const inventarioItems = ref([])
    const inventarioMovimientos = ref([])

    // Equipo
    const miembrosEquipo = ref([])

    // Notificaciones y Configuración
    const notifications = ref([])
    const establecimientoActual = ref(null)

    // Detalle (Lote)
    const loteActual = ref(null)
    const evaluaciones = ref([])
    const eventosSanitarios = ref([])
    const eventosReproductivos = ref([])
    const consumos = ref([])

    // --- PRECIO DE MERCADO ---
    const marketPrice = ref({
      value: 2200,
      currency: 'ARS',
      unit: 'kg',
      mode: 'manual',
      lastUpdated: new Date().toISOString(),
      source: 'Referencia Manual',
    })

    // --- GETTERS ---
    const getPotreroById = (id) => potreros.value.find((p) => p.id === id)

    // --- ACCIONES DE CARGA ---

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

    async function fetchAll() {
      if (!authStore.profile) return

      listenToPotreroChanges()

      await fetchEstablecimiento()
      await fetchPotreros()
      await fetchLotes()

      if (marketPrice.value.mode === 'auto') {
        fetchMarketPriceAuto()
      }

      await Promise.all([
        fetchInventarioItems(),
        fetchFuentesAgua(),
        fetchDietas(),
        fetchMovimientos(),
        fetchMiembrosEquipo(),
        fetchNotifications(),
        fetchInventarioMovimientos(),
      ])
    }

    // --- ACCIONES DE PRECIO ---
    function setManualPrice(price) {
      marketPrice.value = {
        ...marketPrice.value,
        value: parseFloat(price),
        mode: 'manual',
        lastUpdated: new Date().toISOString(),
        source: 'Usuario',
      }
    }

    async function fetchMarketPriceAuto() {
      try {
        const { data, error } = await supabase.functions.invoke('get-market-price')
        if (error) throw error

        if (data && data.success) {
          marketPrice.value = {
            ...marketPrice.value,
            value: parseFloat(data.precio),
            mode: 'auto',
            lastUpdated: data.fecha,
            source: data.fuente,
          }
        }
      } catch (e) {
        console.error('Error obteniendo precio de mercado:', e)
      }
    }

    // --- FETCHS DE RECURSOS ---

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
      const { data, error } = await supabase
        .from('inventario_movimientos')
        .select('*, inventario_items(nombre, unidad, precio_unitario), lotes(identificacion)')
        .order('fecha', { ascending: false })
        .limit(200)

      if (!error) inventarioMovimientos.value = data
    }

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

    // --- GESTIÓN DE EQUIPO ---

    async function fetchMiembrosEquipo() {
      const estId = authStore.profile?.establecimiento_id
      if (!estId) return

      // CORRECCIÓN: Agregamos 'config_notificaciones' al select
      const { data, error } = await supabase
        .from('miembros_establecimiento')
        .select(
          `id, rol, usuario_id, perfiles_usuarios:usuario_id (nombre_completo, email, telefono, direccion, avatar_url, config_notificaciones)`,
        )
        .eq('establecimiento_id', estId)

      if (error) {
        console.error('Error fetching miembros:', error)
        return
      }

      miembrosEquipo.value = data.map((m) => ({
        id: m.id,
        rol: m.rol,
        usuario_id: m.usuario_id,
        nombre_completo: m.perfiles_usuarios?.nombre_completo || 'Usuario sin nombre',
        email: m.perfiles_usuarios?.email || 'Sin email',
        telefono: m.perfiles_usuarios?.telefono,
        direccion: m.perfiles_usuarios?.direccion,
        avatar_url: m.perfiles_usuarios?.avatar_url,
        // CORRECCIÓN: Mapeamos la configuración o un objeto vacío por defecto
        config_notificaciones: m.perfiles_usuarios?.config_notificaciones || {},
      }))
    }

    async function invitarMiembro(email, rol) {
      const estId = authStore.profile?.establecimiento_id
      if (!estId) throw new Error('No hay establecimiento activo para invitar')

      const { data, error } = await supabase
        .from('invitaciones_equipo')
        .insert({
          email: email,
          rol: rol,
          establecimiento_id: estId,
        })
        .select()

      if (error) {
        if (error.code === '23505') {
          await supabase
            .from('invitaciones_equipo')
            .update({ rol: rol, establecimiento_id: estId })
            .eq('email', email)
          return { success: true, message: 'Invitación actualizada' }
        }
        throw error
      }
      return data
    }

    async function updateMiembroRol(membresiaId, nuevoRol) {
      const { error } = await supabase
        .from('miembros_establecimiento')
        .update({ rol: nuevoRol })
        .eq('id', membresiaId)
      if (error) throw error
      await fetchMiembrosEquipo()
    }

    async function removeMiembro(usuarioId) {
      const { error } = await supabase.rpc('eliminar_usuario_total', {
        p_usuario_id: usuarioId,
      })
      if (error) {
        console.error('Error eliminando usuario:', error)
        throw error
      }
      await fetchMiembrosEquipo()
    }

    async function updatePerfilMiembro(usuarioId, datos) {
      const { error } = await supabase.from('perfiles_usuarios').update(datos).eq('id', usuarioId)
      if (error) throw error
      await fetchMiembrosEquipo()
    }

    // --- Notificaciones ---

    async function fetchNotifications() {
      const estId = authStore.profile?.establecimiento_id
      if (!estId) return
      const { data, error } = await supabase
        .from('notificaciones_programadas')
        .select('*')
        .eq('establecimiento_id', estId)
        .order('created_at', { ascending: false })
      if (!error) notifications.value = data
    }

    async function createNotification(notifData) {
      notifData.establecimiento_id = authStore.profile.establecimiento_id
      if (notifData.prioridad && notifData.prioridad.toLowerCase() === 'urgente') {
        notifData.fecha_programada = new Date().toISOString()
        notifData.estado = 'enviado'
      } else {
        notifData.estado = 'pendiente'
      }
      const { data, error } = await supabase
        .from('notificaciones_programadas')
        .insert(notifData)
        .select()
      if (error) throw error
      notifications.value.unshift(data[0])
      if (notifData.prioridad && notifData.prioridad.toLowerCase() === 'urgente') {
        await sendEmailTrigger(data[0])
      }
    }

    async function deleteNotification(id) {
      const { error } = await supabase.from('notificaciones_programadas').delete().eq('id', id)
      if (error) throw error
      notifications.value = notifications.value.filter((n) => n.id !== id)
    }

    async function sendEmailTrigger(notification) {
      try {
        let recipients = notification.destinatarios_snapshot
        if (typeof recipients === 'string') recipients = JSON.parse(recipients)
        if (!recipients || recipients.length === 0) return
        const payload = {
          tipo: notification.categoria ? notification.categoria.toUpperCase() : 'GENERAL',
          mensaje: notification.mensaje,
          destinatarios: recipients.map((r) => ({
            nombre: r.nombre,
            email: r.email,
            canal: 'email',
          })),
          asunto_extra: notification.titulo,
        }
        const { error } = await supabase.functions.invoke('send-alert', { body: payload })
        if (error) throw error
      } catch (e) {
        console.error('Error enviando email:', e)
        await supabase
          .from('notificaciones_programadas')
          .update({ estado: 'fallido' })
          .eq('id', notification.id)
        const index = notifications.value.findIndex((n) => n.id === notification.id)
        if (index !== -1) notifications.value[index].estado = 'fallido'
      }
    }

    // --- Clima ---
    async function fetchClima() {
      if (potreros.value.length === 0) await fetchPotreros()
      const potreroConUbicacion = potreros.value.find((p) => p.geometria)
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

    // --- Funciones de Detalle (Lote) ---
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
      ])
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

    // --- Reportes Globales ---
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

    // --- ESCRITURA GENÉRICA ---
    function getLocalListByTableName(tableName) {
      switch (tableName) {
        case 'lotes':
          return lotes
        case 'potreros':
          return potreros
        case 'fuentes_de_agua':
          return fuentesAgua
        case 'inventario_items':
          return inventarioItems
        case 'registros_lluvia':
          return registrosLluvia
        case 'dietas':
          return dietas
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

      if (tabla === 'evaluaciones' && loteActual.value && registro.lote_id === loteActual.value.id)
        evaluaciones.value.unshift(nuevoRegistro)
      if (
        tabla === 'eventos_sanitarios' &&
        loteActual.value &&
        registro.lote_id === loteActual.value.id
      )
        eventosSanitarios.value.unshift(nuevoRegistro)
      if (
        tabla === 'eventos_reproductivos' &&
        loteActual.value &&
        registro.lote_id === loteActual.value.id
      )
        eventosReproductivos.value.unshift(nuevoRegistro)
      if (
        tabla === 'consumos_de_dieta' &&
        loteActual.value &&
        registro.lote_id === loteActual.value.id
      )
        consumos.value.unshift(nuevoRegistro)
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
      if (tabla === 'lotes' && loteActual.value && loteActual.value.id === id)
        Object.assign(loteActual.value, registroActualizado)
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

    // --- MOVIMIENTOS ---
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
      await updateRegistro('lotes', loteId, { potrero_actual_id: potreroDestinoId })
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
      await updateRegistro('lotes', loteId, { potrero_actual_id: null })
      const loteEnStore = lotes.value.find((l) => l.id === loteId)
      if (loteEnStore) loteEnStore.potrero_actual_id = null
    }

    // --- HELPERS ---
    function getGDPV(evaluacionesDelLote) {
      if (!evaluacionesDelLote || evaluacionesDelLote.length < 2) return 0
      const evs = [...evaluacionesDelLote].sort(
        (a, b) => new Date(a.fecha_evaluacion) - new Date(b.fecha_evaluacion),
      )
      const p1 = parseFloat(evs[0].peso_promedio_kg),
        p2 = parseFloat(evs[evs.length - 1].peso_promedio_kg)
      const diff = Math.ceil(
        Math.abs(
          new Date(evs[evs.length - 1].fecha_evaluacion) - new Date(evs[0].fecha_evaluacion),
        ) / 86400000,
      )
      return diff > 0 ? ((p2 - p1) / diff).toFixed(3) : 0
    }
    function getCostoKgGanado() {
      return 0
    }
    function getTasaPrenez() {
      return 0
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

    // --- GESTIÓN INTELIGENTE DE AGUA (ACTUALIZADO) ---
    function calcularCalidadAgua(datos) {
      const ph = parseFloat(datos.ph)
      const tds = parseFloat(datos.solidos_totales)
      const nitratos = parseFloat(datos.nitratos || 0)

      if (ph < 5.5 || ph > 9.0) return 'Peligro'
      if (tds > 4000) return 'Peligro'
      if (nitratos > 100) return 'Peligro'

      if (ph < 6.5 || ph > 8.5) return 'Precaución'
      if (tds > 2000) return 'Precaución'
      if (nitratos > 45) return 'Precaución'

      return 'Óptimo'
    }

    async function agregarAnalisisDeAgua(data) {
      const nuevoAnalisis = await createRegistro('analisis_de_agua', data)
      const nuevoEstado = calcularCalidadAgua(data)

      await updateRegistro('fuentes_de_agua', data.fuente_id, {
        ultimo_estado: nuevoEstado,
      })

      const fuente = fuentesAgua.value.find((f) => f.id === data.fuente_id)
      if (fuente) {
        if (!fuente.analisis_de_agua) fuente.analisis_de_agua = []
        fuente.analisis_de_agua.unshift(nuevoAnalisis)
        fuente.ultimo_estado = nuevoEstado
      }
      return { estado: nuevoEstado, peligros: [] }
    }

    async function createFuenteAgua(data) {
      return createRegistro('fuentes_de_agua', data)
    }
    async function updateFuenteAgua(id, data) {
      return updateRegistro('fuentes_de_agua', id, data)
    }
    async function deleteFuenteAgua(id) {
      return deactivateRegistro('fuentes_de_agua', id)
    }

    // --- CORRECCIÓN FINAL Y ROBUSTA DE INVENTARIO (FIXED) ---
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
      return createRegistro('inventario_items', data)
    }
    async function updateInventarioItem(id, data) {
      return updateRegistro('inventario_items', id, data)
    }
    async function deleteInventarioItem(id) {
      return deactivateRegistro('inventario_items', id)
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
      lotes,
      potreros,
      fuentesAgua,
      registrosLluvia,
      dietas,
      clima,
      movimientos,
      inventarioItems,
      inventarioMovimientos,
      miembrosEquipo,
      notifications,
      loteActual,
      evaluaciones,
      eventosSanitarios,
      eventosReproductivos,
      consumos,
      establecimientoActual,

      // NUEVO
      marketPrice,
      setManualPrice,
      fetchMarketPriceAuto,

      getPotreroById,
      fetchEstablecimiento,
      fetchAll,
      fetchLotes,
      fetchPotreros,
      fetchMovimientos,
      fetchInventarioItems,
      fetchInventarioMovimientos,
      fetchFuentesAgua,
      fetchRegistrosLluvia,
      fetchDietas,
      fetchMiembrosEquipo,
      invitarMiembro,
      updateMiembroRol,
      removeMiembro,
      updatePerfilMiembro,
      fetchNotifications,
      createNotification,
      deleteNotification,
      fetchClima,
      fetchLoteDetalle,
      fetchEvaluaciones,
      fetchEventosSanitarios,
      fetchEventosReproductivos,
      fetchConsumos,
      fetchAllEvaluaciones,
      fetchAllEventosSanitarios,
      fetchAllEventosReproductivos,
      fetchAllConsumos,
      createRegistro,
      updateRegistro,
      deactivateRegistro,
      moverLote,
      moverLoteACorral,
      getGDPV,
      getCostoKgGanado,
      getTasaPrenez,
      agregarAnalisisDeAgua,
      createFuenteAgua,
      updateFuenteAgua,
      deleteFuenteAgua,
      registrarMovimientoInventario,
      createInventarioItem,
      updateInventarioItem,
      deleteInventarioItem,
      updateConfigEmergencia,
    }
  },
  {
    persist: {
      key: 'nutrogan_offline_data',
      paths: [
        'lotes',
        'potreros',
        'inventarioItems',
        'miembrosEquipo',
        'fuentesAgua',
        'establecimientoActual',
        'dietas',
        'marketPrice',
      ],
      storage: localStorage,
    },
  },
)
