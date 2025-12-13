import { useDataStore } from 'stores/data-store'
import { Notify } from 'quasar'

const QUEUE_KEY = 'nutrogan_offline_queue'

class SyncService {
  constructor() {
    this.isSyncing = false
    this.queue = this.loadQueue()

    // Escuchar eventos de red
    window.addEventListener('online', () => this.processQueue())
  }

  loadQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    } catch {
      return []
    }
  }

  saveQueue() {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue))
    window.dispatchEvent(new CustomEvent('queue-updated'))
  }

  async addAction(tipo, payload) {
    const dataStore = useDataStore()

    // 1. UI OPTIMISTA (Actualizar estado local visualmente)
    try {
      this.applyOptimisticUpdate(dataStore, tipo, payload)
    } catch (e) {
      console.warn('Error en actualización optimista:', e)
    }

    // 2. ENCOLAR
    const action = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      tipo,
      payload,
      timestamp: new Date().toISOString(),
      attempts: 0,
    }

    this.queue.push(action)
    this.saveQueue()

    // 3. INTENTAR SUBIR
    if (navigator.onLine) {
      this.processQueue()
    }
  }

  applyOptimisticUpdate(store, tipo, payload) {
    if (tipo === 'mover_lote') {
      const lote = store.lotes.find((l) => l.id === payload.lote_id)
      if (lote) lote.potrero_actual_id = payload.potrero_id
    }
    // Aquí podrías agregar lógica para restar stock visualmente, etc.
  }

  async processQueue() {
    if (this.isSyncing || this.queue.length === 0 || !navigator.onLine) return

    this.isSyncing = true
    const dataStore = useDataStore()
    const failedQueue = []
    let processedCount = 0

    for (const item of this.queue) {
      try {
        await this.executeAction(dataStore, item)
        processedCount++
      } catch (error) {
        console.error(`[Sync] Error item ${item.id}:`, error)
        item.attempts++
        // Si falló 3 veces, quizás deberíamos dejarlo en una lista de "Errores" y no reintentar infinitamente
        failedQueue.push(item)
      }
    }

    this.queue = failedQueue
    this.saveQueue()
    this.isSyncing = false

    if (processedCount > 0) {
      Notify.create({
        message: `Sincronización: ${processedCount} registros subidos.`,
        color: 'positive',
        position: 'top',
        icon: 'cloud_done',
        classes: 'field-notify-success-industrial',
      })
    }
  }

  /**
   * Mapeo de acciones Offline -> Supabase
   */
  async executeAction(store, item) {
    switch (item.tipo) {
      case 'evaluacion': // Peso / CC
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

      case 'consumo': // Uso de inventario
        await store.registrarMovimientoInventario(item.payload)
        break

      case 'lluvia':
        await store.createRegistro('registros_lluvia', item.payload)
        break

      default:
        console.warn('Tipo desconocido:', item.tipo)
    }
  }

  getPendingCount() {
    return this.queue.length
  }
}

export const syncService = new SyncService()
