import localforage from 'localforage'
import { useDataStore } from 'stores/data-store'
import { Notify } from 'quasar'
import { calcularCalidadAgua } from 'src/utils/waterQuality'
import { guardarVisionConfirmada } from 'src/services/visionSave'

const QUEUE_KEY = 'pending'
const FAILED_KEY = 'failed'
const LAST_SYNC_KEY = 'last_sync_ok'
const LEGACY_LS_KEY = 'nutrogan_offline_queue'
const MAX_ATTEMPTS = 5

function base64ToJpegBlob(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: 'image/jpeg' })
}

const queueDb = localforage.createInstance({
  name: 'nutrogan',
  storeName: 'sync_queue',
  description: 'Cola offline Nutrogan',
})

/**
 * Cola offline durable (IndexedDB via localforage).
 * Migra la cola vieja de localStorage si existe.
 */
class SyncService {
  constructor() {
    this.isSyncing = false
    this.queue = []
    this.failed = []
    this.lastSyncOk = null
    this.ready = this.init()

    window.addEventListener('online', () => {
      this.processQueue()
    })
  }

  async init() {
    try {
      const legacyRaw = localStorage.getItem(LEGACY_LS_KEY)
      if (legacyRaw) {
        try {
          const legacy = JSON.parse(legacyRaw)
          if (Array.isArray(legacy) && legacy.length) {
            const existing = (await queueDb.getItem(QUEUE_KEY)) || []
            await queueDb.setItem(QUEUE_KEY, [...existing, ...legacy])
          }
        } catch {
          /* ignore corrupt legacy */
        }
        localStorage.removeItem(LEGACY_LS_KEY)
      }

      this.queue = (await queueDb.getItem(QUEUE_KEY)) || []
      this.failed = (await queueDb.getItem(FAILED_KEY)) || []
      this.lastSyncOk = (await queueDb.getItem(LAST_SYNC_KEY)) || null
      this.emitUpdate()
    } catch (e) {
      console.error('[Sync] init falló, fallback memoria:', e)
      this.queue = []
      this.failed = []
    }
  }

  async ensureReady() {
    await this.ready
  }

  async persist() {
    await queueDb.setItem(QUEUE_KEY, this.queue)
    await queueDb.setItem(FAILED_KEY, this.failed)
    this.emitUpdate()
  }

  emitUpdate() {
    window.dispatchEvent(
      new CustomEvent('queue-updated', {
        detail: {
          pending: this.queue.length,
          failed: this.failed.length,
          syncing: this.isSyncing,
          lastSyncOk: this.lastSyncOk,
        },
      }),
    )
  }

  async addAction(tipo, payload) {
    await this.ensureReady()
    const dataStore = useDataStore()

    try {
      this.applyOptimisticUpdate(dataStore, tipo, payload)
    } catch (e) {
      console.warn('[Sync] optimistic update:', e)
    }

    const action = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      tipo,
      payload,
      timestamp: new Date().toISOString(),
      attempts: 0,
      lastError: null,
    }

    this.queue.push(action)
    await this.persist()

    if (navigator.onLine) {
      this.processQueue()
    }
  }

  applyOptimisticUpdate(store, tipo, payload) {
    if (tipo === 'mover_lote') {
      const lote = store.lotes.find((l) => l.id === payload.lote_id)
      if (lote) lote.potrero_actual_id = payload.potrero_id
      return
    }

    if (tipo === 'evaluacion' && Array.isArray(store.evaluaciones)) {
      store.evaluaciones.unshift({
        id: `local-${Date.now()}`,
        ...payload,
        _offline: true,
      })
      return
    }

    if (tipo === 'lluvia' && Array.isArray(store.registrosLluvia)) {
      store.registrosLluvia.unshift({
        id: `local-${Date.now()}`,
        ...payload,
        _offline: true,
      })
      return
    }

    if (tipo === 'consumo' && payload.p_item_id && Array.isArray(store.inventarioItems)) {
      const item = store.inventarioItems.find((i) => i.id === payload.p_item_id)
      if (item && typeof payload.p_cantidad === 'number') {
        item.stock_actual = Number(item.stock_actual || 0) + Number(payload.p_cantidad)
      }
      return
    }

    if (tipo === 'situacion' && Array.isArray(store.situaciones)) {
      store.situaciones.unshift({
        id: `local-${Date.now()}`,
        ...payload,
        _offline: true,
      })
      return
    }

    if (tipo === 'vision' && Array.isArray(store.registrosVision)) {
      const hoy = new Date().toISOString().slice(0, 10)
      store.registrosVision.unshift({
        id: `local-${Date.now()}`,
        lote_id: payload.lote_id,
        modo: payload.modo,
        fecha: hoy,
        texto_confirmado: payload.propuesta?.nota || payload.propuesta?.descripcion || '',
        condicion_corporal: payload.modo === 'condicion' ? payload.propuesta?.condicion_corporal : null,
        gravedad: payload.modo === 'anomalia' ? payload.propuesta?.gravedad : null,
        consistencia: payload.modo === 'fecal' ? payload.propuesta?.consistencia : null,
        color: payload.modo === 'fecal' ? payload.propuesta?.color : null,
        presencia_parasitos: payload.modo === 'fecal' ? !!payload.propuesta?.presencia_parasitos : null,
        _offline: true,
      })
      if (payload.modo === 'condicion' && Array.isArray(store.evaluaciones)) {
        store.evaluaciones.unshift({
          id: `local-cc-${Date.now()}`,
          lote_id: payload.lote_id,
          fecha_evaluacion: hoy,
          peso_promedio_kg: null,
          condicion_corporal: payload.propuesta?.condicion_corporal,
          _offline: true,
        })
      }
      return
    }

    if (tipo === 'analisis_agua' && Array.isArray(store.fuentesAgua)) {
      const fuente = store.fuentesAgua.find((f) => f.id === payload.fuente_id)
      if (fuente) {
        const { estado } = calcularCalidadAgua(payload)
        if (!fuente.analisis_de_agua) fuente.analisis_de_agua = []
        fuente.analisis_de_agua.unshift({
          id: `local-${Date.now()}`,
          ...payload,
          _offline: true,
        })
        fuente.ultimo_estado = estado
      }
    }
  }

  async processQueue() {
    await this.ensureReady()
    if (this.isSyncing || this.queue.length === 0 || !navigator.onLine) return

    this.isSyncing = true
    this.emitUpdate()

    const dataStore = useDataStore()
    const stillPending = []
    let processedCount = 0
    let movedToFailed = 0

    // Snapshot para no mutar mientras iteramos
    const batch = [...this.queue]
    this.queue = []

    for (const item of batch) {
      try {
        await this.executeAction(dataStore, item)
        processedCount++
      } catch (error) {
        item.attempts = (item.attempts || 0) + 1
        item.lastError = error?.message || String(error)
        console.error(`[Sync] fallo ${item.tipo} (${item.attempts}/${MAX_ATTEMPTS}):`, error)

        if (item.attempts >= MAX_ATTEMPTS) {
          this.failed.push({ ...item, failedAt: new Date().toISOString() })
          movedToFailed++
        } else {
          stillPending.push(item)
        }
      }
    }

    this.queue = stillPending
    await this.persist()

    if (processedCount > 0) {
      this.lastSyncOk = new Date().toISOString()
      await queueDb.setItem(LAST_SYNC_KEY, this.lastSyncOk)
    }

    this.isSyncing = false
    this.emitUpdate()

    if (processedCount > 0) {
      Notify.create({
        message: `Sincronizados ${processedCount} registro${processedCount === 1 ? '' : 's'}`,
        color: 'positive',
        position: 'top',
        icon: 'cloud_done',
      })
    }

    if (movedToFailed > 0) {
      Notify.create({
        message: `${movedToFailed} registro${movedToFailed === 1 ? '' : 's'} fallaron tras ${MAX_ATTEMPTS} intentos`,
        color: 'warning',
        position: 'top',
        icon: 'error_outline',
      })
    }
  }

  async executeAction(store, item) {
    switch (item.tipo) {
      case 'evaluacion':
        await store.createRegistro('evaluaciones', item.payload)
        break
      case 'mover_lote':
        await store.moverLote(
          item.payload.lote_id,
          item.payload.potrero_id,
          item.payload.fecha_entrada,
        )
        break
      case 'evento_sanitario':
        await store.createRegistro('eventos_sanitarios', item.payload)
        break
      case 'evento_reproductivo':
        await store.createRegistro('eventos_reproductivos', item.payload)
        break
      case 'situacion':
        await store.createRegistro('situaciones_lote', item.payload)
        break
      case 'consumo':
        await store.registrarMovimientoInventario(item.payload)
        break
      case 'lluvia':
        await store.createRegistro('registros_lluvia', item.payload)
        break
      case 'analisis_agua':
        await store.agregarAnalisisDeAgua(item.payload)
        break
      case 'vision':
        await guardarVisionConfirmada({
          loteId: item.payload.lote_id,
          modo: item.payload.modo,
          fotoBlob: item.payload.image_base64 ? base64ToJpegBlob(item.payload.image_base64) : null,
          propuesta: item.payload.propuesta,
          userId: item.payload.user_id,
        })
        break
      case 'vision_lectura': {
        const { supabase } = await import('boot/supabase')
        const { parseVisionProposal } = await import('src/utils/visionParse')
        const { guardarPropuestaPendiente } = await import('src/services/visionPendiente')
        const { data, error } = await supabase.functions.invoke('analizar-vision', {
          body: {
            modo: item.payload.modo,
            lote_id: item.payload.lote_id,
            image_base64: item.payload.image_base64,
          },
        })
        if (error) throw error
        if (data?.error) throw new Error(data.error)
        await guardarPropuestaPendiente({
          id: item.id,
          lote_id: item.payload.lote_id,
          modo: item.payload.modo,
          image_base64: item.payload.image_base64,
          user_id: item.payload.user_id,
          propuesta: parseVisionProposal(item.payload.modo, data.texto),
        })
        break
      }
      default:
        throw new Error(`Tipo de acción desconocido: ${item.tipo}`)
    }
  }

  getPendingCount() {
    return this.queue.length
  }

  getFailedCount() {
    return this.failed.length
  }

  getLastSyncOk() {
    return this.lastSyncOk
  }

  getPending() {
    return [...this.queue]
  }

  getFailed() {
    return [...this.failed]
  }

  /** Reencola fallidos para otro intento */
  async retryFailed() {
    await this.ensureReady()
    if (!this.failed.length) return
    const retrying = this.failed.map((item) => ({
      ...item,
      attempts: 0,
      lastError: null,
    }))
    this.failed = []
    this.queue.push(...retrying)
    await this.persist()
    if (navigator.onLine) this.processQueue()
  }

  async discardFailed(id) {
    await this.ensureReady()
    this.failed = this.failed.filter((i) => i.id !== id)
    await this.persist()
  }

  async discardAllFailed() {
    await this.ensureReady()
    this.failed = []
    await this.persist()
  }
}

export const syncService = new SyncService()
