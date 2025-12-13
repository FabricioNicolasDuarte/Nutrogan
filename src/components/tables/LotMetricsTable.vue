<template>
  <q-card flat class="metrics-card">
    <div class="q-pa-md">
      <div class="row items-center justify-between full-width q-mb-md">
        <div class="row items-center">
          <q-icon name="analytics" color="cyan-accent-3" size="sm" class="q-mr-sm" />
          <div class="text-h6 text-white font-outfit">Rendimiento Detallado</div>
        </div>
        <q-input
          borderless
          dense
          debounce="300"
          v-model="filter"
          placeholder="Buscar lote..."
          dark
          color="cyan-accent-3"
          class="search-input"
        >
          <template v-slot:prepend>
            <q-icon name="search" color="grey-6" size="xs" />
          </template>
        </q-input>
      </div>

      <q-table
        :rows="rows"
        :columns="columns"
        row-key="id"
        dark
        flat
        :pagination="{ rowsPerPage: 10 }"
        card-class="bg-transparent"
        table-header-class="text-grey-5 text-uppercase font-mono text-caption"
        :filter="filter"
        no-data-label="No se encontraron datos de rendimiento"
      >
        <template v-slot:body-cell-categoria="props">
          <q-td :props="props">
            <q-badge
              outline
              :color="getCategoriaColor(props.value)"
              class="q-px-sm q-py-xs text-weight-bold font-mono tracking-wide"
              rounded
            >
              {{ props.value.toUpperCase() }}
            </q-badge>
          </q-td>
        </template>

        <template v-slot:body-cell-peso="props">
          <q-td :props="props">
            <div class="text-white text-weight-bold font-numeric" style="font-size: 1.1em">
              {{ props.value }}
              <span class="text-grey-6 text-caption" v-if="props.value !== '-'">kg</span>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-gdpv="props">
          <q-td :props="props">
            <div class="row items-center justify-end no-wrap">
              <div class="column items-end q-mr-md">
                <span :class="getGdpvClass(props.value)" class="text-weight-bold font-numeric">
                  {{ props.value }}
                </span>
                <span
                  class="text-caption text-grey-7"
                  style="font-size: 0.7em"
                  v-if="props.value !== '-'"
                  >kg/día</span
                >
              </div>
              <q-linear-progress
                v-if="props.value !== '-'"
                :value="getGdpvProgress(props.value)"
                :color="getGdpvColorName(props.value)"
                track-color="grey-9"
                size="6px"
                rounded
                style="width: 50px"
              >
                <q-tooltip class="bg-dark text-caption">
                  Eficiencia: {{ (getGdpvProgress(props.value) * 100).toFixed(0) }}%
                </q-tooltip>
              </q-linear-progress>
              <div v-else style="width: 50px" class="text-center text-grey-8">-</div>
            </div>
          </q-td>
        </template>

        <template v-slot:no-data>
          <div class="full-width row flex-center q-pa-lg text-grey-6">
            <q-icon name="search_off" size="2em" class="q-mr-sm" />
            <span>No se encontraron lotes activos con evaluaciones.</span>
          </div>
        </template>
      </q-table>

      <div class="explanation-box q-mt-md">
        <div class="row items-center q-mb-xs">
          <q-icon name="speed" color="cyan-accent-3" size="xs" class="q-mr-sm" />
          <span class="text-weight-bold text-white text-caption">Métricas de Desempeño</span>
        </div>
        <p class="text-caption text-grey-4 q-mb-none">
          <strong>GDPV:</strong> Ganancia diaria. <span class="text-green-13">>0.6 kg</span> (Alta),
          <span class="text-blue-13">0.3-0.6 kg</span> (Media).
        </p>
      </div>
    </div>
  </q-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from 'stores/data-store'

const dataStore = useDataStore()
const filter = ref('')

const columns = [
  { name: 'identificacion', label: 'Lote', field: 'identificacion', sortable: true, align: 'left' },
  { name: 'animales', label: 'Cabezas', field: 'animales', sortable: true, align: 'center' },
  { name: 'categoria', label: 'Objetivo', field: 'categoria', sortable: true, align: 'left' },
  {
    name: 'fecha_peso',
    label: 'Últ. Evaluación',
    field: 'fecha_peso',
    sortable: true,
    align: 'right',
  },
  { name: 'peso', label: 'Peso Actual', field: 'peso', sortable: true, align: 'right' },
  { name: 'gdpv', label: 'Ganancia Diaria', field: 'gdpv', sortable: true, align: 'right' },
]

const rows = computed(() => {
  return dataStore.lotes.map((lote) => {
    const evs = dataStore.evaluaciones
      .filter((e) => e.lote_id === lote.id && e.fecha_evaluacion)
      .sort((a, b) => new Date(b.fecha_evaluacion) - new Date(a.fecha_evaluacion))

    const ultimaEv = evs[0]
    let pesoMostrar = '-'
    let gdpvCalc = '-'

    if (ultimaEv && Number(ultimaEv.peso_promedio_kg) > 0) {
      pesoMostrar = parseFloat(ultimaEv.peso_promedio_kg).toFixed(1)
    } else if (lote.peso_ingreso_kg && Number(lote.peso_ingreso_kg) > 0) {
      pesoMostrar = parseFloat(lote.peso_ingreso_kg).toFixed(1)
    }

    if (evs.length >= 2) {
      gdpvCalc = calcularGDPVManual(evs[1], evs[0])
    } else if (evs.length === 1 && lote.peso_ingreso_kg > 0) {
      const fechaIngreso = new Date(lote.created_at)
      const fechaEval = new Date(evs[0].fecha_evaluacion)
      if (fechaEval > fechaIngreso) {
        const fakePrevEv = {
          peso_promedio_kg: lote.peso_ingreso_kg,
          fecha_evaluacion: lote.created_at,
        }
        gdpvCalc = calcularGDPVManual(fakePrevEv, evs[0])
      }
    }

    return {
      id: lote.id,
      identificacion: lote.identificacion || 'Sin ID',
      animales: lote.cantidad_animales || 0,
      categoria: lote.objetivo || 'General',
      peso: pesoMostrar,
      fecha_peso: ultimaEv ? formatearFecha(ultimaEv.fecha_evaluacion) : 'Ingreso',
      gdpv: gdpvCalc,
    }
  })
})

function calcularGDPVManual(evAnterior, evActual) {
  const p1 = parseFloat(evAnterior.peso_promedio_kg)
  const p2 = parseFloat(evActual.peso_promedio_kg)
  if (isNaN(p1) || isNaN(p2)) return '-'

  const d1 = new Date(evAnterior.fecha_evaluacion)
  const d2 = new Date(evActual.fecha_evaluacion)
  const diffTime = d2 - d1
  const diffDays = diffTime / (1000 * 60 * 60 * 24)
  if (diffDays <= 0.5) return '-'

  const ganancia = p2 - p1
  const resultado = ganancia / diffDays

  if (resultado > 2.5 || resultado < -1.5) return '-'
  return resultado.toFixed(3)
}

function formatearFecha(fechaISO) {
  if (!fechaISO) return '-'
  const d = new Date(fechaISO)
  const day = String(d.getUTCDate()).padStart(2, '0')
  const months = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ]
  const month = months[d.getUTCMonth()]
  return `${day} ${month}`
}

function getCategoriaColor(cat) {
  if (!cat) return 'grey'
  const c = cat.toLowerCase()
  if (c.includes('engorde')) return 'green-13' // Verde Neón
  if (c.includes('cría') || c.includes('cria')) return 'blue-6' // Azul Eléctrico
  if (c.includes('recría')) return 'cyan-4' // Cyan Fluor
  return 'grey-6'
}

function getGdpvClass(val) {
  if (val === '-') return 'text-grey-6'
  const num = parseFloat(val)
  if (num < 0) return 'text-white' // Blanco (Antes rojo)
  if (num < 0.4) return 'text-blue-13' // Azul Eléctrico (Antes lima)
  if (num >= 0.4) return 'text-green-13' // Verde Neón (Ok)
  return 'text-white'
}

function getGdpvColorName(val) {
  if (val === '-') return 'grey'
  const num = parseFloat(val)
  if (num < 0) return 'white'
  if (num < 0.4) return 'blue-13'
  if (num >= 0.4) return 'green-13'
  return 'grey'
}

function getGdpvProgress(val) {
  if (val === '-') return 0
  const num = parseFloat(val)
  if (num < 0) return 0
  return Math.min(num / 1.5, 1)
}
</script>

<style lang="scss" scoped>
.metrics-card {
  background: rgba(15, 15, 20, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
}
.search-input :deep(.q-field__control) {
  background: rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  padding: 0 12px;
}
.search-input :deep(.q-field__native) {
  color: white;
}
.explanation-box {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px;
}
.font-numeric {
  font-family: 'Fira Code', monospace;
  letter-spacing: -0.5px;
}
.font-mono {
  font-family: 'Fira Code', monospace;
}
.font-outfit {
  font-family: 'Outfit', sans-serif;
}
:deep(.q-table__card) {
  background: transparent !important;
  box-shadow: none !important;
}
:deep(.q-table th) {
  font-weight: 700;
  color: #888;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  letter-spacing: 0.5px;
}
:deep(.q-table tbody td) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  height: 55px;
}
:deep(.q-table tbody tr:hover) {
  background: rgba(255, 255, 255, 0.05) !important;
}
</style>
