<template>
  <q-layout view="hHh lpR fFf" class="field-mode-layout bg-white text-black">
    <q-header class="field-header-bar q-py-sm" elevated>
      <q-toolbar class="row items-center justify-between">
        <div
          class="status-indicator row items-center cursor-pointer bg-white text-black q-px-md q-py-xs rounded-borders"
          style="border: 3px solid black"
          @click="abrirPanelSync"
        >
          <q-icon
            :name="statusIcon"
            size="1.8em"
            class="q-mr-sm"
            :class="{
              'text-green-6': isOnline && fallidos === 0,
              'text-orange-9': fallidos > 0,
              'text-red-6': !isOnline,
              'spin-fast': isSyncing,
            }"
          />

          <div class="column">
            <span class="text-subtitle1 text-weight-bolder leading-none">{{ statusText }}</span>
            <span v-if="pendientes > 0" class="text-caption text-weight-bold text-orange-9">
              {{ pendientes }} PENDIENTES
            </span>
            <span v-else-if="fallidos > 0" class="text-caption text-weight-bold text-negative">
              {{ fallidos }} FALLIDOS
            </span>
            <span v-else-if="lastSyncLabel" class="text-caption text-grey-8">
              {{ lastSyncLabel }}
            </span>
          </div>
        </div>

        <q-btn
          flat
          dense
          icon="logout"
          label="SALIR"
          class="text-white text-weight-bold"
          @click="confirmarSalida"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view :is-online="isOnline" @sync-status-change="actualizarEstadoSync" />
    </q-page-container>

    <q-dialog v-model="showSyncPanel">
      <q-card class="bg-white text-black" style="min-width: 320px; max-width: 420px">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6 text-weight-bolder">Cola offline</div>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div class="text-body2 q-mb-sm">
            Estado: <strong>{{ isOnline ? 'Online' : 'Offline' }}</strong>
            · Pendientes: <strong>{{ pendientes }}</strong>
            · Fallidos: <strong>{{ fallidos }}</strong>
          </div>
          <div v-if="lastSyncLabel" class="text-caption text-grey-7 q-mb-md">
            Última sync OK: {{ lastSyncLabel }}
          </div>

          <div v-if="pendientes === 0 && fallidos === 0" class="text-grey-7 q-py-md text-center">
            Cola vacía — los registros de campo ya están en el servidor (o aún no hay nada
            pendiente).
          </div>

          <q-list v-if="pendientesList.length" bordered separator class="rounded-borders q-mb-md">
            <q-item-label header>Pendientes</q-item-label>
            <q-item v-for="item in pendientesList" :key="item.id">
              <q-item-section>
                <q-item-label>{{ labelAccion(item) }}</q-item-label>
                <q-item-label caption>
                  Intento {{ item.attempts || 0 }}/5 · {{ formatHora(item.timestamp) }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <q-list v-if="fallidosList.length" bordered separator class="rounded-borders">
            <q-item-label header class="text-negative">Fallidos</q-item-label>
            <q-item v-for="item in fallidosList" :key="item.id">
              <q-item-section>
                <q-item-label>{{ labelAccion(item) }}</q-item-label>
                <q-item-label caption class="text-negative">
                  {{ item.lastError || 'Error desconocido' }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn flat dense size="sm" color="negative" label="Descartar" @click="descartar(item.id)" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            v-if="fallidos > 0"
            flat
            color="primary"
            label="Reintentar fallidos"
            :disable="!isOnline || isSyncing"
            @click="reintentarFallidos"
          />
          <q-btn
            unelevated
            color="black"
            text-color="white"
            label="Sincronizar ahora"
            :disable="!isOnline || isSyncing || pendientes === 0"
            :loading="isSyncing"
            @click="triggerSync"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { syncService } from 'src/services/SyncService'

const router = useRouter()
const $q = useQuasar()

const isOnline = ref(navigator.onLine)
const pendientes = ref(0)
const fallidos = ref(0)
const isSyncing = ref(false)
const showSyncPanel = ref(false)
const pendientesList = ref([])
const fallidosList = ref([])
const lastSyncOk = ref(null)

async function refreshQueue() {
  await syncService.ensureReady()
  pendientes.value = syncService.getPendingCount()
  fallidos.value = syncService.getFailedCount()
  pendientesList.value = syncService.getPending()
  fallidosList.value = syncService.getFailed()
  isSyncing.value = syncService.isSyncing
  lastSyncOk.value = syncService.getLastSyncOk()
}

const updateOnlineStatus = () => {
  isOnline.value = navigator.onLine
  if (isOnline.value && pendientes.value > 0) triggerSync()
}

function onQueueUpdated(e) {
  if (e?.detail) {
    pendientes.value = e.detail.pending ?? pendientes.value
    fallidos.value = e.detail.failed ?? fallidos.value
    isSyncing.value = !!e.detail.syncing
    if (e.detail.lastSyncOk) lastSyncOk.value = e.detail.lastSyncOk
  }
  refreshQueue()
}

function actualizarEstadoSync(status) {
  if (status.syncing !== undefined) isSyncing.value = status.syncing
}

function abrirPanelSync() {
  refreshQueue()
  showSyncPanel.value = true
}

async function triggerSync() {
  if (!isOnline.value) {
    return $q.notify({ message: 'SIN CONEXIÓN', color: 'negative', icon: 'wifi_off' })
  }
  isSyncing.value = true
  try {
    await syncService.processQueue()
  } finally {
    await refreshQueue()
  }
}

async function reintentarFallidos() {
  await syncService.retryFailed()
  await refreshQueue()
}

async function descartar(id) {
  await syncService.discardFailed(id)
  await refreshQueue()
}

function labelAccion(item) {
  const map = {
    evaluacion: 'Evaluación / peso',
    mover_lote: 'Mover lote',
    evento_sanitario: 'Sanidad',
    evento_reproductivo: 'Reproducción',
    consumo: 'Consumo despensa',
    lluvia: 'Lluvia',
    analisis_agua: 'Análisis de agua',
  }
  return map[item.tipo] || item.tipo
}

function formatHora(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

const lastSyncLabel = computed(() => {
  if (!lastSyncOk.value) return ''
  return formatHora(lastSyncOk.value)
})

onMounted(async () => {
  await refreshQueue()
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  window.addEventListener('queue-updated', onQueueUpdated)
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
  window.removeEventListener('queue-updated', onQueueUpdated)
})

const statusIcon = computed(() => {
  if (!isOnline.value) return 'wifi_off'
  if (isSyncing.value) return 'sync'
  if (fallidos.value > 0) return 'error_outline'
  if (pendientes.value > 0) return 'cloud_upload'
  return 'cloud_done'
})

const statusText = computed(() => {
  if (!isOnline.value) return 'OFFLINE'
  if (isSyncing.value) return 'SUBIENDO...'
  if (fallidos.value > 0) return 'CON ERRORES'
  if (pendientes.value > 0) return 'PENDIENTE'
  return 'SINCRONIZADO'
})

function confirmarSalida() {
  if (pendientes.value > 0 || fallidos.value > 0) {
    $q.dialog({
      title: 'Datos sin sincronizar',
      message: `Tenés ${pendientes.value} pendientes y ${fallidos.value} fallidos.`,
      ok: { label: 'SALIR IGUAL', color: 'negative' },
      cancel: { label: 'QUEDARME', flat: true },
    }).onOk(() => router.push('/'))
  } else {
    router.push('/')
  }
}
</script>

<style scoped>
.spin-fast {
  animation: spin 1s infinite linear;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.leading-none {
  line-height: 1;
}
</style>
