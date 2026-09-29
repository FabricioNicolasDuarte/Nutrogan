<template>
  <div class="alerts-hub column text-white" :class="{ 'alerts-hub--page': variant === 'page' }">
    <div class="row items-center justify-between q-mb-sm" v-if="variant !== 'page'">
      <div class="row items-center">
        <q-icon name="notification_important" color="orange-8" size="sm" class="q-mr-sm" />
        <div>
          <div class="text-subtitle2 text-weight-bold">Alertas operativas</div>
          <div class="text-caption text-grey-5">
            {{ alerts.length }} activas
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
        {{ alerts.length }} activas · umbrales de campo (sin inventar datos)
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
      active-color="orange-8"
      indicator-color="orange-8"
      align="justify"
    >
      <q-tab name="activas" label="Activas" />
      <q-tab name="historial" label="Historial" />
      <q-tab name="enviar" label="Enviar" />
    </q-tabs>

    <q-tab-panels
      v-model="tab"
      animated
      class="bg-transparent col alerts-panels"
      :class="{ 'alerts-panels--page': variant === 'page' }"
    >
      <q-tab-panel name="activas" class="q-pa-none">
        <div v-if="!alerts.length" class="text-center text-grey-6 q-py-md text-caption">
          Sin alertas con los datos cargados.
        </div>
        <q-list v-else dense separator class="rounded-borders overflow-hidden">
          <q-item v-for="a in alerts" :key="a.id" class="q-px-none">
            <q-item-section avatar>
              <q-icon :name="severityIcon(a.severity)" :color="severityColor(a.severity)" size="xs" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium text-caption">{{ a.title }}</q-item-label>
              <q-item-label caption class="text-grey-6" style="font-size: 0.7rem">
                {{ a.message }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <q-btn
          v-if="critical.length"
          unelevated
          dense
          class="full-width q-mt-md"
          color="orange-9"
          text-color="white"
          icon="mail"
          label="Avisar críticas"
          :loading="notifying"
          @click="notifyTeam"
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

defineProps({
  variant: { type: String, default: 'page' }, // page | drawer
})

const dataStore = useDataStore()
const $q = useQuasar()
const tab = ref('activas')
const refreshing = ref(false)
const notifying = ref(false)
const alerts = ref([])

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

const critical = computed(() => alerts.value.filter((a) => a.severity === 'critical'))

function severityIcon(s) {
  if (s === 'critical') return 'error'
  if (s === 'warn') return 'warning'
  return 'info'
}
function severityColor(s) {
  if (s === 'critical') return 'red-8'
  if (s === 'warn') return 'orange-8'
  return 'blue-6'
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
  alerts.value = evaluateOperationalAlerts({
    lotes: dataStore.lotes || [],
    potreros: dataStore.potreros || [],
    fuentesAgua: dataStore.fuentesAgua || [],
    inventarioItems: dataStore.inventarioItems || [],
    evaluaciones: dataStore.evaluaciones || [],
  })
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

defineExpose({ alerts, recompute, refresh })
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
