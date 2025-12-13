<template>
  <q-layout view="hHh lpR fFf" class="field-mode-layout bg-white text-black">
    <q-header class="field-header-bar q-py-sm" elevated>
      <q-toolbar class="row items-center justify-between">
        <div
          class="status-indicator row items-center cursor-pointer bg-white text-black q-px-md q-py-xs rounded-borders"
          style="border: 3px solid black"
          @click="forzarSincronizacion"
        >
          <q-icon
            :name="statusIcon"
            size="1.8em"
            class="q-mr-sm"
            :class="{ 'text-green-6': isOnline, 'text-red-6': !isOnline, 'spin-fast': isSyncing }"
          />

          <div class="column">
            <span class="text-subtitle1 text-weight-bolder leading-none">{{ statusText }}</span>
            <span v-if="pendientes > 0" class="text-caption text-weight-bold text-orange-9">
              {{ pendientes }} PENDIENTES
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
const isSyncing = ref(false)

const checkPendientes = () => {
  pendientes.value = syncService.getPendingCount()
}

const updateOnlineStatus = () => {
  isOnline.value = navigator.onLine
  if (isOnline.value && pendientes.value > 0) triggerSync()
}

function actualizarEstadoSync(status) {
  if (status.syncing !== undefined) isSyncing.value = status.syncing
}

function forzarSincronizacion() {
  if (!isOnline.value)
    return $q.notify({ message: 'SIN CONEXIÓN', color: 'negative', icon: 'wifi_off' })
  triggerSync()
}

function triggerSync() {
  syncService.processQueue()
}

onMounted(() => {
  checkPendientes()
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  window.addEventListener('queue-updated', checkPendientes)
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
  window.removeEventListener('queue-updated', checkPendientes)
})

const statusIcon = computed(() => {
  if (!isOnline.value) return 'wifi_off'
  if (isSyncing.value) return 'sync'
  return 'wifi'
})

const statusText = computed(() => {
  if (!isOnline.value) return 'OFFLINE'
  if (isSyncing.value) return 'SUBIENDO...'
  return 'ONLINE'
})

function confirmarSalida() {
  if (pendientes.value > 0) {
    $q.dialog({
      title: '⚠️ DATOS PENDIENTES',
      message: `Tienes ${pendientes.value} registros sin subir.`,
      ok: { label: 'SALIR IGUAL', color: 'negative' },
      cancel: true,
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
