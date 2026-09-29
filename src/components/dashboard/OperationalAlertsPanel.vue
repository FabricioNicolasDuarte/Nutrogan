<template>
  <q-card flat bordered class="alerts-panel bg-dark text-white">
    <q-card-section class="row items-center justify-between q-pb-none">
      <div class="row items-center">
        <q-icon name="notification_important" color="orange-8" size="sm" class="q-mr-sm" />
        <div>
          <div class="text-subtitle1 text-weight-bold">Alertas operativas</div>
          <div class="text-caption text-grey-5">
            {{ alerts.length }} activas · umbrales de campo (sin inventar datos)
          </div>
        </div>
      </div>
      <div class="row q-gutter-xs">
        <q-btn
          flat
          dense
          round
          icon="refresh"
          color="grey-5"
          :loading="refreshing"
          @click="refresh"
        >
          <q-tooltip>Recalcular</q-tooltip>
        </q-btn>
        <q-btn
          v-if="!compact"
          unelevated
          dense
          color="orange-9"
          text-color="white"
          label="Avisar equipo"
          icon="mail"
          :disable="!critical.length || notifying"
          :loading="notifying"
          @click="notifyTeam"
        />
      </div>
    </q-card-section>

    <q-card-section v-if="!alerts.length" class="text-center text-grey-6 q-py-lg">
      Sin alertas con los datos cargados.
    </q-card-section>

    <q-list v-else separator class="q-pb-sm">
      <q-item v-for="a in alerts" :key="a.id" dense>
        <q-item-section avatar>
          <q-icon
            :name="severityIcon(a.severity)"
            :color="severityColor(a.severity)"
            size="sm"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-bold">{{ a.title }}</q-item-label>
          <q-item-label caption class="text-grey-5">{{ a.message }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-badge :color="categoryColor(a.category)" outline>{{ a.category }}</q-badge>
        </q-item-section>
      </q-item>
    </q-list>
  </q-card>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { supabase } from 'boot/supabase'
import { useDataStore } from 'stores/data-store'
import { evaluateOperationalAlerts } from 'src/utils/operationalAlerts'

const props = defineProps({
  /** Si true, oculta el botón de mail (p.ej. dashboard compacto). */
  compact: { type: Boolean, default: false },
})

const dataStore = useDataStore()
const $q = useQuasar()
const refreshing = ref(false)
const notifying = ref(false)
const alerts = ref([])

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
function categoryColor(c) {
  const map = { agua: 'cyan', forraje: 'light-green', sanidad: 'red', stock: 'amber', general: 'grey' }
  return map[c] || 'grey'
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
    ])
    recompute()
  } finally {
    refreshing.value = false
  }
}

async function notifyTeam() {
  if (!critical.value.length) return
  notifying.value = true
  try {
    const categories = [...new Set(critical.value.map((a) => a.category))]
    const destinatarios = (dataStore.miembrosEquipo || [])
      .filter((m) => {
        const cfg = m.config_notificaciones || {}
        return categories.some((c) => cfg[c] || cfg.general)
      })
      .map((m) => ({ email: m.email, nombre: m.nombre_completo }))

    if (!destinatarios.length) {
      throw new Error('Nadie suscripto a agua/forraje/sanidad/stock/general')
    }

    const titulo = `Nutrogan: ${critical.value.length} alerta(s) crítica(s)`
    const mensaje = critical.value.map((a) => `• [${a.category}] ${a.title}\n  ${a.message}`).join('\n\n')
    const categoria = categories[0] || 'general'
    const prioridad = 'urgente'

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

    $q.notify({
      type: 'positive',
      message: `Avisados ${destinatarios.length} miembros`,
      icon: 'mark_email_read',
    })
  } catch (e) {
    $q.notify({ type: 'negative', message: e.message || 'No se pudo avisar' })
  } finally {
    notifying.value = false
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
  if (!(dataStore.evaluaciones || []).length) {
    await dataStore.fetchAllEvaluaciones?.()
  }
  recompute()
})

defineExpose({ alerts, recompute, refresh })
</script>

<style scoped>
.alerts-panel {
  border-color: rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(12, 12, 16, 0.85);
}
</style>
