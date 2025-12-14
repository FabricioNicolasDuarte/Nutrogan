<template>
  <q-card
    class="establishment-settings-card column full-height no-shadow relative-position overflow-hidden"
  >
    <div class="settings-header relative-position column flex-center q-pa-lg">
      <div class="z-10 text-center">
        <div class="icon-ring q-mb-sm">
          <q-icon name="domain" size="2em" color="white" />
        </div>
        <div class="text-h5 text-white font-display tracking-wide">Configuración</div>
        <div class="text-caption text-primary font-mono tracking-widest q-mt-xs">
          DATOS DEL ESTABLECIMIENTO
        </div>
      </div>
      <div class="header-bg-gradient"></div>
      <div class="grid-pattern"></div>
    </div>

    <div class="col column bg-dark-surface q-pa-md scroll">
      <q-form @submit.prevent="guardarCambios" class="q-gutter-y-md q-mb-xl">
        <div class="text-subtitle2 text-grey-5 font-mono text-uppercase border-b-gray q-pb-xs">
          Información General
        </div>

        <div class="row q-col-gutter-md">
          <div class="col-12">
            <q-input
              v-model="form.nombre"
              label="Nombre del Establecimiento"
              outlined
              dark
              color="primary"
              class="input-pro"
              :rules="[(val) => !!val || 'Requerido']"
            >
              <template v-slot:prepend>
                <q-icon name="business" color="grey-5" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-6">
            <q-input
              v-model="form.ciudad"
              label="Ciudad / Localidad"
              outlined
              dark
              color="cyan"
              class="input-pro"
            >
              <template v-slot:prepend>
                <q-icon name="place" color="grey-5" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-md-6">
            <q-input
              v-model="form.provincia"
              label="Provincia"
              outlined
              dark
              color="cyan"
              class="input-pro"
            >
              <template v-slot:prepend>
                <q-icon name="map" color="grey-5" />
              </template>
            </q-input>
          </div>
        </div>

        <div class="row justify-end q-mt-md">
          <q-btn
            label="Guardar Cambios"
            type="submit"
            color="primary"
            text-color="black"
            class="text-weight-bold shadow-glow full-width-mobile"
            :loading="loading"
            icon="save"
            unelevated
            rounded
          />
        </div>
      </q-form>

      <div class="column q-gutter-y-sm">
        <div class="row items-center justify-between border-b-gray q-pb-xs q-mb-sm">
          <div class="text-subtitle2 text-grey-5 font-mono text-uppercase">Últimos Eventos</div>
          <q-badge color="grey-9" text-color="white" :label="recentEvents.length" />
        </div>

        <div v-if="recentEvents.length === 0" class="text-center text-grey-7 q-py-lg">
          <q-icon name="history" size="2em" class="q-mb-sm opacity-50" />
          <div class="text-caption">No hay eventos registrados</div>
        </div>

        <div v-else class="events-list q-gutter-y-sm">
          <div
            v-for="event in recentEvents"
            :key="event.id"
            class="event-item row items-center justify-between q-pa-sm rounded-borders relative-position overflow-hidden"
          >
            <div class="status-line" :class="getEventColorClass(event.tipo)"></div>

            <div class="row items-center q-pl-sm">
              <div class="event-icon q-mr-md flex flex-center" :class="getEventBgClass(event.tipo)">
                <q-icon :name="getEventIcon(event.tipo)" size="16px" color="white" />
              </div>
              <div class="column">
                <div class="text-body2 text-white text-weight-medium">
                  {{ event.titulo }}
                </div>
                <div class="text-caption text-grey-5 font-mono" style="font-size: 0.7rem">
                  {{ formatDate(event.fecha) }}
                </div>
              </div>
            </div>

            <div class="text-right q-pr-sm">
              <div class="text-caption text-white font-numeric">
                {{ event.valor }}
              </div>
              <div class="text-nano text-grey-6 text-uppercase">{{ event.unidad }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-card>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useDataStore } from 'stores/data-store'
import { useQuasar } from 'quasar'
import { supabase } from 'boot/supabase'

const store = useDataStore()
const $q = useQuasar()
const loading = ref(false)

// Formulario reactivo
const form = reactive({
  nombre: '',
  ciudad: '',
  provincia: '',
})

// --- PROPIEDAD COMPUTADA: COMBINAR EVENTOS ---
// Une lluvias, evaluaciones y otros datos para mostrar un resumen vivo
const recentEvents = computed(() => {
  const events = []

  // 1. Agregar Lluvias
  if (store.registrosLluvia) {
    store.registrosLluvia.forEach((r) => {
      events.push({
        id: `rain-${r.id}`,
        fecha: r.fecha,
        tipo: 'lluvia',
        titulo: 'Registro Pluviométrico',
        valor: r.milimetros,
        unidad: 'mm',
      })
    })
  }

  // 2. Agregar Evaluaciones (Pesajes)
  if (store.evaluaciones) {
    store.evaluaciones.forEach((e) => {
      // Intentar buscar nombre del lote si está disponible
      const lote = store.lotes.find((l) => l.id === e.lote_id)
      const nombreLote = lote ? lote.identificacion : 'Lote'
      events.push({
        id: `eval-${e.id}`,
        fecha: e.fecha_evaluacion,
        tipo: 'evaluacion',
        titulo: `Pesaje ${nombreLote}`,
        valor: e.peso_promedio_kg,
        unidad: 'kg Avg',
      })
    })
  }

  // Ordenar por fecha descendente y tomar los últimos 6
  return events.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 6)
})

// --- ACTIONS ---

async function guardarCambios() {
  loading.value = true
  try {
    // 1. Actualizar DB
    const { error } = await supabase
      .from('establecimientos')
      .update({
        nombre: form.nombre,
        ciudad: form.ciudad,
        provincia: form.provincia,
      })
      .eq('id', store.establecimientoActual.id)

    if (error) throw error

    // 2. Actualizar Store Local (Impacto Inmediato en Dashboard y PDF)
    store.establecimientoActual.nombre = form.nombre
    store.establecimientoActual.ciudad = form.ciudad
    store.establecimientoActual.provincia = form.provincia

    $q.notify({
      type: 'positive',
      message: 'Establecimiento actualizado',
      caption: 'Los cambios se reflejarán en los reportes.',
      icon: 'domain_verification',
    })
  } catch (e) {
    console.error(e)
    $q.notify({
      type: 'negative',
      message: 'Error al guardar cambios',
    })
  } finally {
    loading.value = false
  }
}

// --- HELPERS VISUALES ---

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  })
}

function getEventIcon(tipo) {
  if (tipo === 'lluvia') return 'water_drop'
  if (tipo === 'evaluacion') return 'scale'
  return 'event'
}

function getEventColorClass(tipo) {
  if (tipo === 'lluvia') return 'bg-cyan-accent-3'
  if (tipo === 'evaluacion') return 'bg-light-green-13'
  return 'bg-grey'
}

function getEventBgClass(tipo) {
  if (tipo === 'lluvia') return 'bg-cyan-9'
  if (tipo === 'evaluacion') return 'bg-green-9'
  return 'bg-grey-8'
}

onMounted(() => {
  // Cargar datos iniciales del store al formulario
  if (store.establecimientoActual) {
    form.nombre = store.establecimientoActual.nombre || ''
    form.ciudad = store.establecimientoActual.ciudad || ''
    form.provincia = store.establecimientoActual.provincia || ''
  }
  // Asegurar que tengamos datos para la lista
  if (store.registrosLluvia.length === 0) store.fetchLluvias()
  if (store.evaluaciones.length === 0) store.fetchAllEvaluaciones()
})
</script>

<style scoped lang="scss">
.establishment-settings-card {
  background: #121214;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  overflow: hidden;
}

/* HEADER CON GRADIENTE */
.settings-header {
  background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
  min-height: 160px;
}

.header-bg-gradient {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(57, 255, 20, 0.1) 0%, transparent 60%);
  z-index: 1;
}

.grid-pattern {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
  z-index: 0;
  opacity: 0.5;
}

.icon-ring {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}

.bg-dark-surface {
  background: #121214;
}

.input-pro :deep(.q-field__control) {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}
.input-pro :deep(.q-field__label) {
  color: #888;
}

/* LISTA DE EVENTOS */
.event-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s;
}
.event-item:hover {
  background: rgba(255, 255, 255, 0.06);
  transform: translateX(4px);
}

.status-line {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
}

.event-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
}

/* UTILS */
.font-display {
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
}
.font-mono {
  font-family: 'Fira Code', monospace;
}
.font-numeric {
  font-family: 'Fira Code', monospace;
  font-weight: bold;
}
.text-nano {
  font-size: 0.6rem;
}
.border-b-gray {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.shadow-glow {
  box-shadow: 0 0 15px rgba(57, 255, 20, 0.2);
}
.full-width-mobile {
  width: 100%;
  @media (min-width: 600px) {
    width: auto;
  }
}
</style>
