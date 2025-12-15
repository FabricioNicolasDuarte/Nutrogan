<template>
  <q-card class="water-card full-height column justify-between" :class="borderClass">
    <q-card-section class="q-pb-sm">
      <div class="row items-center no-wrap">
        <div class="icon-wrapper q-mr-md">
          <div
            class="icon-shape"
            :style="{
              '-webkit-mask-image': `url(${iconPath})`,
              'mask-image': `url(${iconPath})`,
              backgroundColor: statusColor,
            }"
          ></div>
        </div>

        <div class="col overflow-hidden">
          <div class="text-h6 ellipsis">{{ fuente.nombre }}</div>
          <div class="text-caption text-grey-5 font-mono row items-center">
            {{ fuente.tipo }}
            <span v-if="fuente.es_inteligente" class="text-secondary q-ml-sm row items-center">
              <q-icon name="wifi" size="xs" class="q-mr-xs" /> IoT
            </span>
          </div>
        </div>

        <q-btn flat round dense icon="more_vert" color="grey-5">
          <q-menu class="bg-dark text-white border-neon">
            <q-list dense style="min-width: 140px">
              <q-item clickable v-close-popup @click="emit('editar', fuente)">
                <q-item-section avatar><q-icon name="edit" size="xs" /></q-item-section>
                <q-item-section>Editar</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="emit('eliminar', fuente)" class="text-red">
                <q-item-section avatar><q-icon name="delete" size="xs" /></q-item-section>
                <q-item-section>Eliminar</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </q-card-section>

    <q-separator dark inset class="opacity-10" />

    <q-card-section class="q-py-md">
      <div v-if="ultimoAnalisis">
        <div class="row q-col-gutter-sm">
          <div class="col-6">
            <div class="metric-box">
              <div class="label text-grey-5">pH</div>
              <div class="value font-numeric" :class="getPhColor(ultimoAnalisis.ph)">
                {{ ultimoAnalisis.ph }}
              </div>
            </div>
          </div>
          <div class="col-6">
            <div class="metric-box">
              <div class="label text-grey-5">Salinidad</div>
              <div class="value font-numeric text-white">
                {{ ultimoAnalisis.solidos_totales }}
                <span class="text-caption text-grey-6">ppm</span>
              </div>
            </div>
          </div>
        </div>

        <div class="q-mt-md">
          <div class="row justify-between text-caption text-grey-6 font-mono q-mb-xs">
            <span>Calidad</span>
            <span :style="{ color: statusColor }">{{ estado.label }}</span>
          </div>
          <div class="status-track relative-position">
            <div class="status-fill" :style="{ width: '100%', backgroundColor: statusColor }"></div>
          </div>
        </div>
      </div>

      <div v-else class="text-center text-grey-6 q-py-md">
        <div v-if="loadingSensor">
          <q-spinner-dots color="secondary" size="2em" />
          <div class="text-caption q-mt-sm font-mono text-secondary">Sincronizando...</div>
        </div>
        <div v-else class="q-mt-xs">
          <q-chip
            color="grey-9"
            text-color="grey-5"
            icon="science_off"
            label="Sin Datos"
            size="sm"
          />
        </div>
      </div>
    </q-card-section>

    <div>
      <q-separator dark class="opacity-10" />
      <q-card-actions align="right" class="bg-dark-soft q-py-sm">
        <span class="text-caption text-grey-7 q-mr-auto q-pl-sm font-mono">
          {{ tiempoTranscurrido }}
        </span>

        <div class="row q-gutter-x-xs">
          <q-btn
            v-if="fuente.es_inteligente"
            flat
            dense
            round
            size="sm"
            color="secondary"
            icon="sensors"
            :loading="loadingSensor"
            @click="simularSensor"
          >
            <q-tooltip class="bg-dark border-neon">Leer Sensor</q-tooltip>
          </q-btn>

          <q-btn
            v-if="fuente.tipo === 'Represa'"
            flat
            dense
            round
            size="sm"
            color="teal-4"
            icon="satellite_alt"
            :loading="loadingSentinel"
            @click="simularSentinel"
          >
            <q-tooltip class="bg-dark border-neon">Satélite</q-tooltip>
          </q-btn>

          <q-btn
            flat
            dense
            round
            size="sm"
            color="primary"
            icon="add_circle"
            @click="emit('nuevoAnalisis', fuente)"
          >
            <q-tooltip class="bg-dark border-neon">Cargar Análisis</q-tooltip>
          </q-btn>

          <q-btn
            flat
            dense
            round
            size="sm"
            color="grey-5"
            icon="history"
            @click="emit('verHistorial', fuente)"
          >
            <q-tooltip class="bg-dark border-neon">Historial</q-tooltip>
          </q-btn>
        </div>
      </q-card-actions>
    </div>
  </q-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDataStore } from 'stores/data-store'
import { useQuasar, date } from 'quasar'

const props = defineProps({
  fuente: { type: Object, required: true },
})
const emit = defineEmits(['editar', 'eliminar', 'nuevoAnalisis', 'verHistorial'])

const dataStore = useDataStore()
const $q = useQuasar()
const loadingSensor = ref(false)
const loadingSentinel = ref(false)

// --- CONFIGURACIÓN ---
const ESTADO_CONFIG = {
  Peligro: { label: 'PELIGRO', color: '#ff1744' }, // Rojo
  Precaución: { label: 'ALERTA', color: '#ffea00' }, // Amarillo
  Óptimo: { label: 'ÓPTIMO', color: '#39ff14' }, // Verde Neón
}
const ESTADO_DEFAULT = { label: 'S/D', color: '#555555' } // Gris

// --- COMPUTED PROPERTIES ---

// 1. Icono SVG Personalizado
const iconPath = computed(() => {
  const tipo = props.fuente.tipo ? props.fuente.tipo.toLowerCase() : 'otros'
  let filename = 'otros.svg'
  if (tipo.includes('tanque')) filename = 'tanque.svg'
  else if (tipo.includes('bebedero')) filename = 'bebedero.svg'
  else if (tipo.includes('represa')) filename = 'represa.svg'
  else if (tipo.includes('pozo')) filename = 'pozo.svg'
  else if (tipo.includes('arroyo')) filename = 'arroyo.svg'
  else if (tipo.includes('molino')) filename = 'molino.svg'
  return `/icons/water-icons/${filename}`
})

// 2. Estado y Color
const estado = computed(() => ESTADO_CONFIG[props.fuente.ultimo_estado] || ESTADO_DEFAULT)
const statusColor = computed(() => estado.value.color)

// 3. Borde Izquierdo Dinámico
const borderClass = computed(() => {
  const est = props.fuente.ultimo_estado
  if (est === 'Óptimo') return 'border-neon-card'
  if (est === 'Precaución') return 'border-orange-card'
  if (est === 'Peligro') return 'border-red-card'
  return 'border-grey-card'
})

const ultimoAnalisis = computed(() => props.fuente.analisis_de_agua?.[0] || null)

const tiempoTranscurrido = computed(() => {
  if (!ultimoAnalisis.value?.fecha_analisis) return 'Sin reg.'
  const diff = date.getDateDiff(new Date(), new Date(ultimoAnalisis.value.fecha_analisis), 'hours')
  if (diff < 1) return 'Recién'
  if (diff < 24) return `Hace ${diff}h`
  return date.formatDate(ultimoAnalisis.value.fecha_analisis, 'DD/MM')
})

function getPhColor(ph) {
  const val = parseFloat(ph)
  if (val < 6.5 || val > 8.5) return 'text-red-4'
  if (val < 6.8 || val > 8.0) return 'text-yellow-4'
  return 'text-green-4'
}

// --- SIMULACIONES ---
async function simularSensor() {
  loadingSensor.value = true
  setTimeout(async () => {
    try {
      const ph = (7.0 + Math.random() * 0.8).toFixed(1)
      const tds = Math.floor(800 + Math.random() * 400)

      const data = {
        fuente_id: props.fuente.id,
        fecha_analisis: new Date().toISOString(),
        metodo: 'Sensor IoT',
        ph: ph,
        solidos_totales: tds,
        nitratos: Math.floor(Math.random() * 5),
        arsenico: 0,
        observaciones: 'Lectura automática',
      }
      await dataStore.agregarAnalisisDeAgua(data)
      $q.notify({
        type: 'positive',
        message: 'Datos IoT Recibidos',
        caption: `pH: ${ph} | TDS: ${tds}`,
      })
    } catch {
      $q.notify({ type: 'negative', message: 'Error de conexión' })
    } finally {
      loadingSensor.value = false
    }
  }, 2000)
}

function simularSentinel() {
  loadingSentinel.value = true
  $q.notify({ type: 'info', message: 'Solicitando imagen satelital...' })
  setTimeout(() => {
    loadingSentinel.value = false
    $q.notify({ type: 'positive', message: 'Análisis finalizado', caption: 'Sup. Agua: 3.2 ha' })
  }, 3000)
}

onMounted(() => {
  if (props.fuente.es_inteligente && !ultimoAnalisis.value) simularSensor()
})
</script>

<style lang="scss" scoped>
/* TARJETA PRINCIPAL (Estilo Potrero) */
.water-card {
  background: rgba(10, 10, 12, 0.7); /* Fondo oscuro semitransparente pero sólido */
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  transition: all 0.3s ease;
  overflow: hidden;

  &:hover {
    box-shadow: 0 0 20px rgba(57, 255, 20, 0.15); /* Sombra sutil al hover */
    background: rgba(15, 15, 20, 0.9);
    transform: translateY(-3px);
  }
}

/* BORDES DE ESTADO */
.border-neon-card {
  border-left: 4px solid #39ff14;
}
.border-orange-card {
  border-left: 4px solid #ffea00;
}
.border-red-card {
  border-left: 4px solid #ff1744;
}
.border-grey-card {
  border-left: 4px solid #555555;
}

/* ICONO ENMASCARADO */
.icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.icon-shape {
  width: 32px;
  height: 32px;
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
  transition: background-color 0.3s;
}

/* CAJAS DE MÉTRICAS */
.metric-box {
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  padding: 8px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.05);

  .label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
  }
  .value {
    font-size: 1.2rem;
    font-weight: bold;
  }
}

/* BARRA DE ESTADO */
.status-track {
  height: 4px;
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}
.status-fill {
  height: 100%;
}

/* UTILIDADES */
.font-numeric {
  font-family: 'Outfit', sans-serif;
}
.font-mono {
  font-family: 'Fira Code', monospace;
}
.bg-dark-soft {
  background: rgba(0, 0, 0, 0.3);
}
.opacity-10 {
  opacity: 0.1;
}
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.border-neon {
  border: 1px solid #39ff14;
}
</style>
