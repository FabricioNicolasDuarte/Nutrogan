<template>
  <q-page padding class="dashboard-pro-bg text-white">
    <div class="row items-center justify-between q-mb-lg">
      <div class="col-auto">
        <q-btn
          flat
          round
          dense
          icon="arrow_back"
          color="white"
          @click="$router.push('/recursos')"
        />
      </div>

      <div class="col text-center q-px-sm">
        <div class="page-title-box">Central de Clima</div>
      </div>

      <div class="col-auto">
        <q-btn
          color="primary"
          icon="add"
          :label="$q.screen.gt.xs ? 'Registrar Lluvia' : ''"
          class="text-black text-weight-bold shadow-glow"
          :round="$q.screen.xs"
          :dense="$q.screen.xs"
          @click="abrirCargaManual"
        />
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card relative-position overflow-hidden">
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="calendar_month" size="4em" color="blue" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase">Acumulado Mes Actual</div>
            <div class="text-h3 text-weight-bold text-blue-4">
              {{ kpis.mesActual }} <span class="text-h6 text-grey-5">mm</span>
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">
              {{ kpis.diasLluvia }} días con precipitaciones
            </div>
          </q-card-section>
          <q-linear-progress
            :value="kpis.progresoMes"
            color="blue-5"
            track-color="grey-9"
            class="absolute-bottom"
          />
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card">
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase">
              Acumulado Anual ({{ new Date().getFullYear() }})
            </div>
            <div class="text-h3 text-weight-bold text-white">
              {{ kpis.anioActual }} <span class="text-h6 text-grey-5">mm</span>
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">
              Total registrado en el establecimiento
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card bg-dark-soft">
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase">Último Evento</div>
            <div class="text-h4 text-weight-bold text-white q-mt-sm">
              {{ kpis.ultimoRegistro.mm }} <span class="text-body1 text-grey-5">mm</span>
            </div>
            <div class="text-caption text-primary q-mt-xs font-mono">
              {{ kpis.ultimoRegistro.fecha }}
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card
          flat
          class="kpi-card cursor-pointer hover-border-glow"
          v-ripple
          @click="cargarDatosClima"
        >
          <q-card-section class="row items-center justify-between">
            <div>
              <div class="text-caption text-grey-4 text-weight-bold text-uppercase">Ahora</div>
              <div v-if="climaActual" class="text-h4 text-white text-weight-bold">
                {{ climaActual.temperature_2m }}°
              </div>
              <div v-else class="text-caption text-grey-5">--</div>
            </div>
            <q-icon
              v-if="climaActual"
              :name="getWeatherIcon(climaActual.weathercode)"
              size="3.5em"
              class="text-cyan-4 opacity-80"
            />
            <q-spinner-dots v-else color="cyan-4" size="2em" />
          </q-card-section>
          <div
            class="q-px-md q-pb-sm text-caption text-cyan-4 text-weight-medium"
            v-if="climaActual"
          >
            Viento: {{ climaActual.windspeed_10m }} km/h
          </div>
        </q-card>
      </div>
    </div>

    <div class="row q-col-gutter-lg q-mb-lg">
      <div class="col-12 col-md-8">
        <RainfallChart :registros="dataStore.registrosLluvia" />
      </div>

      <div class="col-12 col-md-4 column q-gutter-y-md">
        <q-card flat class="kpi-card col-grow">
          <q-card-section>
            <div class="text-h6 row items-center">
              <q-icon name="calendar_month" class="q-mr-sm text-grey-5" />
              Pronóstico 5 Días
            </div>
          </q-card-section>
          <q-list separator dark>
            <q-item v-if="loading && climaForecast.length === 0">
              <q-item-section class="text-center"><q-spinner color="primary" /></q-item-section>
            </q-item>
            <q-item v-for="dia in climaForecast" :key="dia.fecha" class="q-py-md">
              <q-item-section avatar>
                <div class="column items-center">
                  <span class="text-caption text-weight-bold text-uppercase">{{
                    getDiaSemana(dia.fecha)
                  }}</span>
                  <q-icon
                    :name="getWeatherIcon(dia.weathercode)"
                    :color="getWeatherColor(dia.weathercode)"
                    size="1.5em"
                  />
                </div>
              </q-item-section>
              <q-item-section>
                <div class="text-body2 text-grey-3">
                  {{ getWeatherDescription(dia.weathercode) }}
                </div>
                <div class="text-caption text-grey-5">
                  Min: {{ dia.temp_min }}° | Max: {{ dia.temp_max }}°
                </div>
              </q-item-section>
              <q-item-section side>
                <q-badge v-if="dia.milimetros > 0" :label="`${dia.milimetros} mm`" color="blue-9" />
                <span v-else class="text-grey-7">-</span>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>

    <q-card flat class="glass-panel q-mt-md">
      <q-card-section class="row items-center justify-between">
        <div class="text-h6">Bitácora de Lluvias</div>
        <q-input
          dense
          outlined
          dark
          v-model="filter"
          placeholder="Buscar fecha..."
          color="white"
          class="q-ml-md"
          style="width: 200px"
        >
          <template v-slot:append><q-icon name="search" /></template>
        </q-input>
      </q-card-section>

      <q-table
        :rows="dataStore.registrosLluvia"
        :columns="columns"
        row-key="id"
        dark
        flat
        class="bg-transparent"
        :filter="filter"
        v-model:pagination="pagination"
        hide-bottom
      >
        <template v-slot:body-cell-milimetros="props">
          <q-td :props="props">
            <q-badge color="blue-5" text-color="black" class="text-weight-bold text-body2">
              {{ props.value }} mm
            </q-badge>
          </q-td>
        </template>
        <template v-slot:body-cell-acciones="props">
          <q-td :props="props" align="right">
            <q-btn
              flat
              round
              dense
              icon="delete"
              color="red-5"
              @click="eliminarRegistro(props.row)"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <div class="row justify-center q-mt-lg" v-if="pagesNumber > 1">
      <q-pagination
        v-model="pagination.page"
        :max="pagesNumber"
        :max-pages="6"
        direction-links
        boundary-links
        color="primary"
        active-color="cyan-4"
        text-color="white"
        active-text-color="black"
        class="glass-pagination"
      />
    </div>

    <q-dialog v-model="dialogoCarga" persistent backdrop-filter="blur(4px)">
      <q-card class="bg-dark text-white border-neon" style="min-width: 350px">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6">Registrar Precipitación</div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-form @submit.prevent="guardarLluvia">
          <q-card-section class="q-gutter-md">
            <q-date
              v-model="form.fecha"
              dark
              class="full-width"
              minimal
              color="primary"
              mask="YYYY-MM-DD"
            />

            <div class="row items-center no-wrap">
              <q-icon name="water_drop" size="2em" color="blue-5" class="q-mr-md" />
              <q-input
                v-model.number="form.milimetros"
                type="number"
                step="0.1"
                label="Milímetros caídos (mm)"
                outlined
                dark
                color="white"
                class="full-width"
                autofocus
                :rules="[(val) => val > 0 || 'Debe ser mayor a 0']"
              />
            </div>

            <q-input
              v-model="form.observaciones"
              label="Observaciones (Opcional)"
              outlined
              dark
              color="white"
              type="textarea"
              rows="2"
            />
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md bg-dark-soft">
            <q-btn label="Cancelar" flat color="grey" v-close-popup />
            <q-btn
              label="Guardar Registro"
              type="submit"
              color="primary"
              text-color="black"
              class="text-weight-bold"
              :loading="guardando"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useDataStore } from 'stores/data-store'
import { useAuthStore } from 'stores/auth-store'
import { useQuasar } from 'quasar'
import RainfallChart from 'components/charts/RainfallChart.vue'

const dataStore = useDataStore()
const authStore = useAuthStore()
const $q = useQuasar()

// Estados
const loading = ref(false)
const guardando = ref(false)
const dialogoCarga = ref(false)
const filter = ref('')

// Configuración de Paginación para q-table
const pagination = ref({
  sortBy: 'fecha',
  descending: true,
  page: 1,
  rowsPerPage: 5, // Mostrar 5 registros por página
})

const form = reactive({
  fecha: new Date().toISOString().split('T')[0],
  milimetros: null,
  observaciones: '',
})

// Helpers
function formatearFecha(iso) {
  if (!iso) return '-'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// Columnas Tabla
const columns = [
  {
    name: 'fecha',
    label: 'Fecha',
    field: 'fecha',
    sortable: true,
    format: (val) => formatearFecha(val),
    align: 'left',
  },
  { name: 'milimetros', label: 'Lluvia', field: 'milimetros', sortable: true, align: 'center' },
  { name: 'observaciones', label: 'Notas', field: 'observaciones', align: 'left' },
  { name: 'acciones', label: '', align: 'right' },
]

// --- COMPUTADAS DE NEGOCIO (KPIS) ---
const kpis = computed(() => {
  const registros = dataStore.registrosLluvia || []
  const hoy = new Date()
  const mesActual = hoy.getMonth()
  const anioActual = hoy.getFullYear()

  // 1. Acumulado Mes
  const lluviasMes = registros.filter((r) => {
    const d = new Date(r.fecha + 'T00:00:00')
    return d.getMonth() === mesActual && d.getFullYear() === anioActual
  })
  const totalMes = lluviasMes.reduce((acc, r) => acc + parseFloat(r.milimetros), 0)

  // 2. Acumulado Año
  const lluviasAnio = registros.filter((r) => {
    const d = new Date(r.fecha + 'T00:00:00')
    return d.getFullYear() === anioActual
  })
  const totalAnio = lluviasAnio.reduce((acc, r) => acc + parseFloat(r.milimetros), 0)

  // 3. Último registro
  let ultimo = { mm: '--', fecha: 'Sin datos' }
  if (registros.length > 0) {
    const rec = registros[0] // Asume orden DESC
    ultimo = { mm: rec.milimetros, fecha: formatearFecha(rec.fecha) }
  }

  // Progreso visual
  const progresoMes = Math.min(totalMes / 100, 1)

  return {
    mesActual: totalMes.toFixed(1),
    diasLluvia: lluviasMes.length,
    anioActual: totalAnio.toFixed(1),
    ultimoRegistro: ultimo,
    progresoMes,
  }
})

// Computada para el total de páginas
const pagesNumber = computed(() => {
  return Math.ceil((dataStore.registrosLluvia?.length || 0) / pagination.value.rowsPerPage)
})

const climaActual = computed(() => dataStore.clima?.current)
const climaForecast = computed(() => dataStore.clima?.forecast || [])

// --- ACCIONES ---

function abrirCargaManual() {
  form.fecha = new Date().toISOString().split('T')[0]
  form.milimetros = null
  form.observaciones = ''
  dialogoCarga.value = true
}

async function guardarLluvia() {
  if (!authStore.profile?.establecimiento_id) {
    return $q.notify({ type: 'negative', message: 'Error de establecimiento' })
  }

  guardando.value = true
  try {
    const payload = {
      fecha: form.fecha,
      milimetros: parseFloat(form.milimetros),
      observaciones: form.observaciones,
      establecimiento_id: authStore.profile.establecimiento_id,
    }

    await dataStore.createRegistro('registros_lluvia', payload)
    $q.notify({
      type: 'positive',
      message: 'Lluvia registrada correctamente',
      icon: 'cloud_done',
    })
    dialogoCarga.value = false
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error al guardar: ' + e.message })
  } finally {
    guardando.value = false
  }
}

// CORRECCIÓN ESLINT: Ahora usamos 'row' dentro de la función
function eliminarRegistro(row) {
  $q.dialog({
    title: 'Eliminar Registro',
    // Usamos row.fecha para mostrar qué estamos borrando
    message: `¿Estás seguro de eliminar el registro del ${formatearFecha(
      row.fecha,
    )}? Esta acción afectará los acumulados.`,
    dark: true,
    cancel: true,
  }).onOk(async () => {
    // await dataStore.deleteRegistro('registros_lluvia', row.id)
    $q.notify({
      type: 'info',
      message: 'Función de eliminar pendiente de implementación en Store',
    })
  })
}

async function cargarDatosClima() {
  loading.value = true
  try {
    await dataStore.fetchClima()
    if (dataStore.registrosLluvia.length === 0) {
      await dataStore.fetchRegistrosLluvia()
    }
  } finally {
    loading.value = false
  }
}

function getDiaSemana(fecha) {
  const dias = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
  const d = new Date(fecha + 'T00:00:00')
  return dias[d.getDay()]
}

function getWeatherIcon(code) {
  if (code <= 3) return 'wb_sunny'
  if (code <= 48) return 'cloud'
  if (code <= 67) return 'water_drop'
  if (code <= 82) return 'umbrella'
  if (code > 90) return 'thunderstorm'
  return 'question_mark'
}

function getWeatherColor(code) {
  if (code <= 3) return 'orange'
  if (code <= 48) return 'grey'
  return 'blue'
}

function getWeatherDescription(code) {
  if (code <= 3) return 'Despejado/Nublado'
  if (code <= 67) return 'Lluvia'
  if (code > 80) return 'Tormenta'
  return 'Variable'
}

onMounted(() => {
  cargarDatosClima()
})
</script>

<style lang="scss" scoped>
.dashboard-pro-bg {
  background-image: url('src/assets/nutrogan-bg.jpg');
  background-size: cover;
  background-attachment: fixed;
  min-height: 100vh;
}

.page-title-box {
  font-size: 2rem;
  font-weight: 700;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
  /* Ajuste de línea para que no se corte en móviles */
  line-height: 1.2;
}

.kpi-card {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: all 0.3s ease;
}

.hover-border-glow:hover {
  border-color: #39ff14;
  box-shadow: 0 0 15px rgba(57, 255, 20, 0.2);
}

.bg-dark-soft {
  background: rgba(0, 0, 0, 0.6);
}

.border-neon {
  border: 1px solid #39ff14;
}

.glass-panel {
  background: rgba(20, 20, 25, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}

.shadow-glow {
  box-shadow: 0 0 15px rgba(57, 255, 20, 0.4);
}

.opacity-20 {
  opacity: 0.2;
}
.opacity-80 {
  opacity: 0.8;
}
.font-mono {
  font-family: 'Courier New', monospace;
}

/* Estilo de Paginación Glass (Consistente con otras páginas) */
:deep(.glass-pagination .q-btn) {
  background: rgba(0, 0, 0, 0.3) !important;
  backdrop-filter: blur(4px);
}
:deep(.glass-pagination .q-btn.text-black) {
  background: #26c6da !important;
  color: black !important;
  font-weight: bold;
}
</style>
