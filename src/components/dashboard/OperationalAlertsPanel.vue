<template>
  <div class="alerts-hub column text-white" :class="{ 'alerts-hub--page': variant === 'page' }">
    <div class="row items-center justify-between q-mb-sm" v-if="variant !== 'page'">
      <div class="row items-center">
        <q-icon name="notification_important" color="red-8" size="sm" class="q-mr-sm" />
        <div>
          <div class="text-subtitle2 text-weight-bold">Alertas operativas</div>
          <div class="text-caption text-grey-5">
            {{ activeAlerts.length }} activas
          </div>
        </div>
      </div>
      <q-btn
        flat
        dense
        round
        icon="refresh"
        color="grey-5"
        size="sm"
        :loading="refreshing"
        @click="refresh"
      />
    </div>

    <div v-else class="row items-center justify-between q-mb-md">
      <div class="text-caption text-grey-5">
        {{ activeAlerts.length }} activas · {{ archivedList.length }} archivadas · semáforo R/A/V ·
        evaluación en dispositivo (sin cron servidor)
      </div>
      <q-btn
        flat
        dense
        icon="refresh"
        label="Recalcular"
        color="grey-5"
        :loading="refreshing"
        @click="refresh"
      />
    </div>

    <q-tabs
      v-model="tab"
      dense
      narrow-indicator
      class="text-grey-5 q-mb-sm"
      active-color="primary"
      indicator-color="primary"
      align="justify"
    >
      <q-tab name="activas" :label="`Activas (${activeAlerts.length})`" />
      <q-tab name="archivadas" :label="`Archivadas (${archivedList.length})`" />
      <q-tab name="historial" label="Enviados" />
      <q-tab name="enviar" label="Enviar" />
    </q-tabs>

    <q-tab-panels
      v-model="tab"
      keep-alive
      transition-prev="fade"
      transition-next="fade"
      class="bg-transparent col alerts-panels"
      :class="{ 'alerts-panels--page': variant === 'page' }"
    >
      <q-tab-panel name="activas" class="q-pa-none">
        <div v-if="!activeAlerts.length" class="text-center text-grey-6 q-py-md text-caption">
          Sin alertas activas — estado verde.
        </div>
        <q-list v-else dense separator class="rounded-borders overflow-hidden">
          <q-item v-for="a in activeAlerts" :key="a.id" class="q-px-none">
            <q-item-section avatar>
              <q-avatar
                size="28px"
                :color="traffic(a.severity).color"
                :text-color="traffic(a.severity).textColor || 'white'"
              >
                <q-icon :name="traffic(a.severity).icon" size="16px" />
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium text-caption">
                <q-badge
                  :color="traffic(a.severity).color"
                  :text-color="traffic(a.severity).textColor || 'white'"
                  :label="traffic(a.severity).label"
                  class="q-mr-xs"
                  style="font-size: 0.65rem"
                />
                {{ a.title }}
              </q-item-label>
              <q-item-label caption class="text-grey-6" style="font-size: 0.7rem">
                {{ a.message }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                dense
                round
                icon="archive"
                color="grey-5"
                size="sm"
                @click="archivarUna(a)"
              >
                <q-tooltip>Archivar</q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
        <div v-if="activeAlerts.length" class="row q-gutter-sm q-mt-md">
          <q-btn
            outline
            dense
            color="grey-5"
            icon="inventory_2"
            label="Archivar todas"
            class="col"
            @click="archivarTodas"
          />
          <q-btn
            v-if="critical.length"
            unelevated
            dense
            class="col"
            color="red-8"
            text-color="white"
            icon="mail"
            label="Avisar críticas"
            :loading="notifying"
            @click="notifyTeam"
          />
        </div>
      </q-tab-panel>

      <q-tab-panel name="archivadas" class="q-pa-none">
        <div v-if="!archivedList.length" class="text-center text-grey-6 q-py-md text-caption">
          Nada archivado.
        </div>
        <q-list v-else dense separator>
          <q-item v-for="a in archivedList" :key="a.id" class="q-px-none">
            <q-item-section avatar>
              <q-icon :name="traffic(a.severity).icon" :color="traffic(a.severity).color" size="sm" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-caption text-weight-medium">{{ a.title }}</q-item-label>
              <q-item-label caption class="text-grey-6">
                {{ formatNotifDate(a.archivedAt) }}
                <span v-if="a.stillDetected"> · sigue detectada</span>
                <span v-else> · ya no aplica</span>
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                dense
                round
                icon="unarchive"
                color="primary"
                size="sm"
                @click="restaurarUna(a.id)"
              >
                <q-tooltip>Restaurar a activas</q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
        <q-btn
          v-if="archivedList.length"
          flat
          dense
          color="grey-5"
          label="Vaciar archivadas"
          class="full-width q-mt-sm"
          @click="vaciarArchivadas"
        />
      </q-tab-panel>

      <q-tab-panel name="historial" class="q-pa-none">
        <div
          v-if="!(dataStore.notifications || []).length"
          class="text-center text-grey-6 q-py-md text-caption"
        >
          Sin enviados aún.
        </div>
        <q-list v-else dense separator>
          <q-item v-for="n in dataStore.notifications" :key="n.id" class="q-px-none">
            <q-item-section>
              <q-item-label class="text-caption text-weight-bold">{{ n.titulo }}</q-item-label>
              <q-item-label caption class="text-grey-6">
                {{ formatNotifDate(n.created_at || n.fecha_programada) }}
                · {{ n.categoria || 'general' }}
                · {{ n.estado || '—' }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                dense
                round
                icon="delete_outline"
                color="grey-6"
                size="sm"
                @click="borrarNotif(n.id)"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-tab-panel>

      <q-tab-panel name="enviar" class="q-pa-none">
        <div class="column q-gutter-y-sm">
          <q-select
            v-model="form.prioridad"
            :options="prioridades"
            label="Prioridad"
            dense
            filled
            dark
            emit-value
            map-options
            option-label="label"
            option-value="value"
          />
          <q-select
            v-model="form.categoria"
            :options="categorias"
            label="Canal"
            dense
            filled
            dark
            emit-value
            map-options
            option-label="label"
            option-value="id"
          />
          <q-input v-model="form.titulo" label="Asunto" dense filled dark />
          <q-input
            v-model="form.mensaje"
            label="Mensaje"
            type="textarea"
            dense
            filled
            dark
            autogrow
          />
          <q-btn
            unelevated
            color="primary"
            text-color="black"
            icon="send"
            label="Enviar al equipo"
            class="text-weight-bold"
            :loading="notifying"
            :disable="!form.titulo || !form.mensaje"
            @click="enviarManual"
          />
          <div class="text-caption text-grey-6">
            Solo llegan a miembros suscriptos a ese canal (Equipo).
          </div>
        </div>
      </q-tab-panel>
    </q-tab-panels>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { supabase } from 'boot/supabase'
import { useDataStore } from 'stores/data-store'
import { evaluateOperationalAlerts } from 'src/utils/operationalAlerts'
import {
  ackAlerts,
  archiveAlert,
  archiveAlerts,
  clearArchived,
  filterActiveAlerts,
  getArchivedMap,
  restoreAlert,
  severityTraffic,
} from 'src/utils/alertsAck'
import { useAuthStore } from 'stores/auth-store'

const props = defineProps({
  variant: { type: String, default: 'page' }, // page | drawer
})

const dataStore = useDataStore()
const authStore = useAuthStore()
const $q = useQuasar()
const tab = ref('activas')
const refreshing = ref(false)
const notifying = ref(false)
const rawAlerts = ref([])
const archiveTick = ref(0)

const form = reactive({
  titulo: '',
  mensaje: '',
  categoria: 'general',
  prioridad: 'normal',
})

const categorias = [
  { id: 'lluvia', label: 'Clima / Lluvias' },
  { id: 'sanidad', label: 'Sanidad' },
  { id: 'stock', label: 'Stock' },
  { id: 'agua', label: 'Agua' },
  { id: 'forraje', label: 'Pastura / NDVI' },
  { id: 'general', label: 'General' },
]

const prioridades = [
  { label: 'Normal', value: 'normal' },
  { label: 'Urgente', value: 'urgente' },
  { label: 'Éxito', value: 'success' },
]

const estId = computed(() => authStore.profile?.establecimiento_id)

const activeAlerts = computed(() => {
  void archiveTick.value
  return filterActiveAlerts(rawAlerts.value, estId.value)
})

const archivedList = computed(() => {
  void archiveTick.value
  const map = getArchivedMap(estId.value)
  const detectedIds = new Set(rawAlerts.value.map((a) => a.id))
  return Object.entries(map)
    .map(([id, meta]) => ({
      id,
      title: meta.title || id,
      message: meta.message || '',
      severity: meta.severity || 'info',
      archivedAt: meta.archivedAt,
      stillDetected: detectedIds.has(id),
    }))
    .sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt))
})

const critical = computed(() => activeAlerts.value.filter((a) => a.severity === 'critical'))

function traffic(severity) {
  return severityTraffic(severity)
}

function bumpArchive() {
  archiveTick.value += 1
}

function markRead() {
  if (props.variant !== 'page') return
  ackAlerts(activeAlerts.value)
  window.dispatchEvent(new CustomEvent('alerts-acked'))
}

function formatNotifDate(iso) {
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

function recompute() {
  rawAlerts.value = evaluateOperationalAlerts({
    lotes: dataStore.lotes || [],
    potreros: dataStore.potreros || [],
    fuentesAgua: dataStore.fuentesAgua || [],
    inventarioItems: dataStore.inventarioItems || [],
    evaluaciones: dataStore.evaluaciones || [],
  })
  bumpArchive()
  markRead()
}

function archivarUna(alert) {
  archiveAlert(estId.value, alert)
  bumpArchive()
  markRead()
  $q.notify({ type: 'info', message: 'Alerta archivada', timeout: 1200, position: 'bottom' })
}

function archivarTodas() {
  if (!activeAlerts.value.length) return
  archiveAlerts(estId.value, activeAlerts.value)
  bumpArchive()
  markRead()
  $q.notify({
    type: 'info',
    message: 'Todas las activas archivadas',
    timeout: 1500,
    position: 'bottom',
  })
}

function restaurarUna(id) {
  restoreAlert(estId.value, id)
  bumpArchive()
  markRead()
}

function vaciarArchivadas() {
  clearArchived(estId.value)
  bumpArchive()
  markRead()
}

async function refresh() {
  refreshing.value = true
  try {
    await Promise.all([
      dataStore.fetchFuentesAgua?.(),
      dataStore.fetchInventarioItems?.(),
      dataStore.fetchPotreros?.(),
      dataStore.fetchLotes?.(),
      dataStore.fetchAllEvaluaciones?.(),
      dataStore.fetchNotifications?.(),
      dataStore.fetchMiembrosEquipo?.(),
    ])
    recompute()
  } finally {
    refreshing.value = false
  }
}

async function sendPayload({ titulo, mensaje, categoria, prioridad }) {
  const destinatarios = (dataStore.miembrosEquipo || [])
    .filter((m) => m.config_notificaciones && m.config_notificaciones[categoria])
    .map((m) => ({ email: m.email, nombre: m.nombre_completo }))

  if (!destinatarios.length) {
    throw new Error(`Nadie suscripto a “${categoria}”`)
  }

  const { error: functionError } = await supabase.functions.invoke('send-alert', {
    body: {
      titulo,
      mensaje,
      categoria,
      prioridad,
      destinatarios,
      metadata: {
        logo_url:
          'https://cglogstrtjvbpsoaghib.supabase.co/storage/v1/object/public/assets/nutrogan-logo.png',
        app_url: 'https://www.nutrogan.site',
      },
    },
  })
  if (functionError) throw functionError

  await dataStore.createNotification({
    titulo,
    mensaje,
    categoria,
    prioridad,
    estado: 'enviado',
    destinatarios_snapshot: JSON.stringify(destinatarios),
  })

  return destinatarios.length
}

async function notifyTeam() {
  if (!critical.value.length) return
  notifying.value = true
  try {
    const categories = [...new Set(critical.value.map((a) => a.category))]
    const categoria = categories[0] || 'general'
    const titulo = `Nutrogan: ${critical.value.length} alerta(s) crítica(s)`
    const mensaje = critical.value
      .map((a) => `• [${a.category}] ${a.title}\n  ${a.message}`)
      .join('\n\n')
    const n = await sendPayload({
      titulo,
      mensaje,
      categoria,
      prioridad: 'urgente',
    })
    $q.notify({ type: 'positive', message: `Avisados ${n} miembros`, icon: 'mark_email_read' })
    tab.value = 'historial'
    await dataStore.fetchNotifications()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'No se pudo avisar' })
  } finally {
    notifying.value = false
  }
}

async function enviarManual() {
  notifying.value = true
  try {
    const n = await sendPayload({ ...form })
    $q.notify({ type: 'positive', message: `Enviado a ${n} miembros`, icon: 'mark_email_read' })
    form.titulo = ''
    form.mensaje = ''
    tab.value = 'historial'
    await dataStore.fetchNotifications()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'Error al enviar' })
  } finally {
    notifying.value = false
  }
}

async function borrarNotif(id) {
  try {
    await dataStore.deleteNotification(id)
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'No se pudo borrar' })
  }
}

watch(
  () => [
    dataStore.lotes?.length,
    dataStore.potreros?.length,
    dataStore.fuentesAgua?.length,
    dataStore.inventarioItems?.length,
    dataStore.evaluaciones?.length,
  ],
  recompute,
  { immediate: true },
)

onMounted(async () => {
  await Promise.all([
    !(dataStore.evaluaciones || []).length ? dataStore.fetchAllEvaluaciones?.() : null,
    dataStore.fetchNotifications?.(),
    !(dataStore.miembrosEquipo || []).length ? dataStore.fetchMiembrosEquipo?.() : null,
  ])
  recompute()
})

defineExpose({ alerts: activeAlerts, recompute, refresh })
</script>

<style scoped>
.alerts-hub--page {
  min-height: 420px;
}
.alerts-panels {
  max-height: 280px;
  overflow: auto;
}
.alerts-panels--page {
  max-height: none;
  overflow: visible;
  min-height: 360px;
}
.alerts-panels :deep(.q-tab-panel) {
  background: transparent;
}
</style>
