<template>
  <q-page padding class="dashboard-pro-bg text-white">
    <div class="relative-position q-mb-xl q-pt-sm" style="min-height: 60px">
      <div class="absolute-left" style="z-index: 10">
        <q-btn
          flat
          round
          dense
          icon="arrow_back"
          color="white"
          @click="$router.push('/recursos')"
          class="glass-btn"
        />
      </div>

      <div class="absolute-center full-width text-center pointer-events-none" style="z-index: 0">
        <div class="page-title-box shadow-5" style="margin: 0; pointer-events: auto">
          Monitoreo Satelital
        </div>
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-xl">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card relative-position overflow-hidden border-neon-left">
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="spa" size="3em" color="primary" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              Vigor Promedio
            </div>
            <div class="text-h3 text-weight-bold text-primary font-numeric text-glow">
              {{ kpiResumen.promedioNdvi }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Índice Global (NDVI)</div>
          </q-card-section>
          <q-linear-progress
            :value="Number(kpiResumen.promedioNdvi) || 0"
            color="primary"
            track-color="dark"
            class="absolute-bottom"
            size="4px"
          />
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card relative-position overflow-hidden border-white-left">
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="warning" size="3em" color="white" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              Atención
            </div>
            <div class="text-h3 text-weight-bold text-white font-numeric">
              {{ kpiResumen.criticos }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Lotes con bajo rendimiento</div>
          </q-card-section>
          <q-linear-progress
            :value="kpiResumen.criticos / (dataStore.potreros.length || 1)"
            color="white"
            track-color="dark"
            class="absolute-bottom"
            size="4px"
          />
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card relative-position overflow-hidden border-cyan-left">
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="layers" size="3em" color="cyan-4" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              Digitalizado
            </div>
            <div class="text-h3 text-weight-bold text-cyan-4 font-numeric">
              {{ kpiResumen.totalHa }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Hectáreas monitoreadas</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card
          flat
          class="kpi-card relative-position overflow-hidden cursor-pointer kpi-sync border-blue-left"
          v-ripple
          @click="ejecutarAnalisisNDVI"
        >
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="cloud_sync" size="3em" color="secondary" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              Sentinel-2
            </div>
            <div class="text-h5 text-weight-bolder text-white q-mt-sm">
              {{ loading ? 'Sincronizando...' : 'Actualizado' }}
            </div>
            <div class="text-caption text-secondary q-mt-sm row items-center font-mono">
              <q-icon name="history" size="xs" class="q-mr-xs" /> {{ kpiResumen.ultimaAct }}
            </div>
          </q-card-section>
          <q-inner-loading :showing="loading" color="primary" label="Conectando..." />
        </q-card>
      </div>
    </div>

    <div class="row items-center justify-between q-mb-lg">
      <div class="text-h5 text-weight-bold row items-center">
        <q-icon name="grid_view" class="q-mr-sm text-primary" />
        Detalle por Potrero
      </div>
      <q-btn
        outline
        color="primary"
        icon="satellite_alt"
        label="Sincronizar Todo"
        @click="ejecutarAnalisisNDVI"
        :loading="loading"
        class="glass-btn"
      >
        <q-tooltip class="bg-dark text-white border-neon">Actualizar datos satelitales</q-tooltip>
      </q-btn>
    </div>

    <div v-if="loading && dataStore.potreros.length === 0" class="text-center q-pa-xl">
      <q-spinner-orbit color="primary" size="4em" />
      <div class="text-primary q-mt-md font-mono">ESTABLECIENDO ENLACE SATELITAL...</div>
    </div>

    <div v-if="dataStore.potreros.length === 0 && !loading" class="text-center text-grey-6 q-pa-xl">
      <q-icon name="cloud_off" size="5em" />
      <div class="text-h6 q-mt-md">Sin potreros activos.</div>
    </div>

    <div class="row q-col-gutter-lg">
      <div v-for="potrero in potrerosPaginados" :key="potrero.id" class="col-12 col-md-6 col-lg-4">
        <q-card class="ndvi-card full-height column justify-between">
          <div>
            <q-card-section class="q-pb-sm">
              <div class="row items-center no-wrap">
                <div class="potrero-icon-wrapper q-mr-md">
                  <div
                    class="potrero-icon-shape"
                    :style="{
                      '-webkit-mask-image': `url(${getPotreroIconPath(potrero)})`,
                      'mask-image': `url(${getPotreroIconPath(potrero)})`,
                      backgroundColor: getNdviColorHex(potrero.ultimo_ndvi),
                    }"
                  ></div>
                </div>

                <div class="col overflow-hidden">
                  <div class="text-h6 ellipsis">{{ potrero.nombre }}</div>
                  <div class="text-caption text-grey-5 font-mono">
                    {{ potrero.superficie_ha }} HA
                    <span v-if="potrero.tipo" class="text-primary"> | {{ potrero.tipo }} </span>
                  </div>
                </div>

                <q-badge outline :color="getNdviColorClass(potrero.ultimo_ndvi)" class="font-mono">
                  {{ getEstadoForraje(potrero.ultimo_ndvi) }}
                </q-badge>
              </div>
            </q-card-section>

            <q-separator dark inset class="opacity-10" />

            <q-card-section class="text-center q-py-lg">
              <div class="text-caption text-uppercase text-grey-6 tracking-widest q-mb-xs">
                Índice de Vigor
              </div>
              <div class="row items-baseline justify-center">
                <span
                  class="text-display font-numeric text-weight-bold"
                  :style="{ color: getNdviColorHex(potrero.ultimo_ndvi) }"
                >
                  {{
                    typeof potrero.ultimo_ndvi === 'number'
                      ? potrero.ultimo_ndvi.toFixed(2)
                      : '-.--'
                  }}
                </span>
                <span class="text-subtitle2 text-grey-7 q-ml-sm font-mono">NDVI</span>
              </div>

              <div class="q-mt-md relative-position q-mx-md">
                <div class="ndvi-track shadow-glow"></div>
                <div
                  class="ndvi-marker"
                  :style="{ left: getNdviPercentage(potrero.ultimo_ndvi) + '%' }"
                ></div>
              </div>
              <div class="row justify-between text-caption text-grey-8 q-mx-md q-mt-xs font-mono">
                <span>0.0</span>
                <span>0.5</span>
                <span>1.0</span>
              </div>
            </q-card-section>
          </div>

          <div>
            <q-separator dark class="opacity-10" />
            <q-card-actions align="right" class="bg-dark-soft q-py-sm">
              <span class="text-caption text-grey-7 q-mr-auto q-pl-sm font-mono">
                {{ formatearFecha(potrero.fecha_ultimo_ndvi) }}
              </span>

              <q-btn
                v-if="!potrero.geometria"
                flat
                dense
                color="white"
                icon="draw"
                label="Dibujar"
                @click="$router.push(`/recursos/potreros/draw/${potrero.id}`)"
              />
              <template v-else>
                <q-btn
                  flat
                  dense
                  color="cyan-4"
                  icon="analytics"
                  @click="verAnalisisProfundo(potrero)"
                >
                  <q-tooltip class="bg-dark border-neon">Histórico</q-tooltip>
                </q-btn>
                <q-btn
                  flat
                  dense
                  color="primary"
                  icon="refresh"
                  @click="analizarPotreroIndividual(potrero)"
                  :loading="loadingIndividual[potrero.id]"
                />
              </template>
            </q-card-actions>
          </div>
        </q-card>
      </div>
    </div>

    <div class="row justify-center q-mt-xl" v-if="totalPages > 1">
      <q-pagination
        v-model="page"
        :max="totalPages"
        :max-pages="6"
        direction-links
        boundary-links
        color="primary"
        active-color="primary"
        text-color="grey-6"
        active-text-color="black"
        class="glass-pagination"
      />
    </div>

    <q-dialog v-model="showHistorialDialog" full-width backdrop-filter="blur(8px)">
      <q-card class="bg-dark text-white border-neon">
        <q-card-section class="row items-center justify-between bg-dark-header">
          <div class="row items-center">
            <q-icon name="query_stats" color="primary" size="md" class="q-mr-sm" />
            <div>
              <div class="text-h6 font-outfit">{{ potreroActualHistorial }}</div>
              <div class="text-caption text-grey-5 font-mono">ANÁLISIS ESPECTRAL (6 MESES)</div>
            </div>
          </div>
          <q-btn icon="close" flat round dense v-close-popup color="grey-5" />
        </q-card-section>

        <q-card-section>
          <SatelliteHistoryChart :historial="historialData" :loading="loadingHistorial" />

          <div class="row q-mt-lg q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-banner rounded class="bg-dark-soft text-white border-left-green">
                <div class="text-weight-bold text-primary">VIGOR (NDVI)</div>
                <div class="text-caption text-grey-4">
                  Biomasa fotosintéticamente activa. Valores altos indican pastura densa y
                  saludable.
                </div>
              </q-banner>
            </div>
            <div class="col-12 col-md-6">
              <q-banner rounded class="bg-dark-soft text-white border-left-cyan">
                <div class="text-weight-bold text-cyan-4">HUMEDAD (NDMI)</div>
                <div class="text-caption text-grey-4">
                  Estrés hídrico en vegetación. Anticipa sequías antes de ser visibles al ojo
                  humano.
                </div>
              </q-banner>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="mostrarErrores">
      <q-card class="bg-dark text-white border-white" style="min-width: 350px">
        <q-card-section>
          <div class="text-h6 text-white"><q-icon name="warning" class="q-mr-sm" />Reporte</div>
        </q-card-section>
        <q-list dense separator dark>
          <q-item v-for="(error, index) in erroresAnalisis" :key="index">
            <q-item-section>
              <q-item-label>{{ error.potrero }}</q-item-label>
              <q-item-label caption class="text-grey-5">{{ error.error }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <q-card-actions align="right">
          <q-btn flat label="Cerrar" color="white" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useDataStore } from 'stores/data-store'
import { useAuthStore } from 'stores/auth-store'
import { supabase } from 'boot/supabase'
import { useQuasar } from 'quasar'
import { useSound } from 'src/composables/useSound'
import SatelliteHistoryChart from 'components/charts/SatelliteHistoryChart.vue'

const dataStore = useDataStore()
const authStore = useAuthStore()
const $q = useQuasar()
const { playNdvi } = useSound()

// Estados
const loading = ref(false)
const loadingIndividual = reactive({})
const erroresAnalisis = ref([])
const mostrarErrores = ref(false)

// Estados Historial
const showHistorialDialog = ref(false)
const loadingHistorial = ref(false)
const historialData = ref([])
const potreroActualHistorial = ref('')

// Paginación
const page = ref(1)
const pageSize = 6

// --- FUNCIONES VISUALES (PALETA NUTROGAN) ---

// 1. Iconos Personalizados (Masks)
function getPotreroIconPath(potrero) {
  const tipo = potrero.tipo ? potrero.tipo.toLowerCase() : 'otro'
  let iconName = 'otro' // fallback

  if (tipo.includes('pastura')) iconName = 'pastura'
  else if (tipo.includes('campo-natural')) iconName = 'campo-natural'
  else if (tipo.includes('verdeo')) iconName = 'verdeo'
  else if (tipo.includes('reserva')) iconName = 'reserva'

  return `/icons/${iconName}.svg`
}

// 2. Colores Hexadecimales (Para SVG y Textos)
// Paleta: Neon Green (#39ff14), Lime (#ccff00), Cyan (#00e5ff), Electric Blue (#0037ff)
function getNdviColorHex(ndvi) {
  if (typeof ndvi !== 'number') return '#555555' // Gris oscuro (sin dato)
  if (ndvi < 0.2) return '#ffffff' // Blanco (Crítico/Suelo desnudo - Alto contraste)
  if (ndvi < 0.4) return '#0037ff' // Azul Eléctrico (Bajo)
  if (ndvi < 0.5) return '#00e5ff' // Cian (Regular)
  if (ndvi < 0.7) return '#ccff00' // Lima (Bueno)
  return '#39ff14' // Verde Neón (Excelente)
}

// 3. Clases de Color Quasar (Para Badges)
function getNdviColorClass(ndvi) {
  if (typeof ndvi !== 'number') return 'grey'
  if (ndvi < 0.2) return 'white'
  if (ndvi < 0.4) return 'primary' // Azul oscuro se puede ajustar en css si primary es verde
  if (ndvi < 0.5) return 'cyan'
  if (ndvi < 0.7) return 'lime'
  return 'green-13'
}

function getEstadoForraje(ndvi) {
  if (typeof ndvi !== 'number') return 'N/A'
  if (ndvi >= 0.7) return 'EXCELENTE'
  if (ndvi >= 0.5) return 'BUENO'
  if (ndvi >= 0.4) return 'REGULAR'
  if (ndvi >= 0.2) return 'BAJO'
  return 'CRÍTICO'
}

function getNdviPercentage(ndvi) {
  if (typeof ndvi !== 'number') return 0
  // Normalizar visualmente entre 0.1 y 0.9 para el gráfico
  const val = Math.max(0, Math.min(1, ndvi))
  return val * 100
}

function formatearFecha(fecha) {
  if (!fecha) return '---'
  const date = new Date(fecha)
  const ahora = new Date()
  const diffHoras = (ahora - date) / (1000 * 60 * 60)
  if (diffHoras < 1) return 'RECIÉN'
  if (diffHoras < 24) return `HACE ${Math.floor(diffHoras)}H`
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

// --- KPIs ---
const kpiResumen = computed(() => {
  const lista = dataStore.potreros || []
  const conDatos = lista.filter((p) => typeof p.ultimo_ndvi === 'number')
  const conGeo = lista.filter((p) => p.geometria)

  const sumNdvi = conDatos.reduce((acc, p) => acc + p.ultimo_ndvi, 0)
  const promedioNdvi = conDatos.length ? (sumNdvi / conDatos.length).toFixed(2) : '-'
  // Críticos: Menor a 0.3
  const criticos = conDatos.filter((p) => p.ultimo_ndvi < 0.3).length
  const totalHa = lista.reduce((acc, p) => acc + (p.superficie_ha || 0), 0).toFixed(1)

  let ultimaAct = 'N/A'
  if (conDatos.length > 0) {
    const fechas = conDatos.map((p) => new Date(p.fecha_ultimo_ndvi).getTime())
    const maxFecha = new Date(Math.max(...fechas))
    ultimaAct = maxFecha.toLocaleDateString('es-AR')
  }

  return { promedioNdvi, criticos, totalHa, conGeometria: conGeo.length, ultimaAct }
})

// Ordenamiento y Paginación
const potrerosOrdenados = computed(() => {
  if (!dataStore.potreros) return []
  return [...dataStore.potreros].sort((a, b) => {
    const ndviA = a.ultimo_ndvi ?? -1
    const ndviB = b.ultimo_ndvi ?? -1
    return ndviB - ndviA
  })
})

const totalPages = computed(() => Math.ceil(potrerosOrdenados.value.length / pageSize))
const potrerosPaginados = computed(() => {
  const start = (page.value - 1) * pageSize
  const end = start + pageSize
  return potrerosOrdenados.value.slice(start, end)
})

// --- LÓGICA DE NEGOCIO ---
onMounted(() => {
  if (dataStore.potreros.length === 0) {
    loading.value = true
    dataStore.fetchPotreros().finally(() => {
      loading.value = false
    })
  }
})

async function ejecutarAnalisisNDVI() {
  playNdvi()
  loading.value = true
  erroresAnalisis.value = []
  const notif = $q.notify({
    type: 'ongoing',
    message: 'Solicitando imágenes Sentinel-2...',
    color: 'dark',
    textColor: 'primary',
    timeout: 0,
    spinner: true,
  })

  try {
    const estId = authStore.profile?.establecimiento_id
    if (!estId) throw new Error('Auth Error')

    const { data, error } = await supabase.functions.invoke('analizar-ndvi', {
      body: { establecimiento_id: estId },
    })
    if (error) throw error

    if (data.resultados) {
      data.resultados.forEach((res) => {
        const p = dataStore.potreros.find((x) => x.id === res.id)
        if (p && res.estado === 'exitoso') {
          p.ultimo_ndvi = res.ndvi
          p.fecha_ultimo_ndvi = new Date().toISOString()
        }
      })
    }
    if (data.errores?.length) {
      erroresAnalisis.value = data.errores
      mostrarErrores.value = true
    }
    notif({ type: 'positive', message: 'Sincronización completada', timeout: 3000 })
  } catch (error) {
    console.error(error)
    notif({ type: 'negative', message: 'Error de conexión', timeout: 3000 })
  } finally {
    loading.value = false
  }
}

async function analizarPotreroIndividual(potrero) {
  playNdvi()
  loadingIndividual[potrero.id] = true
  try {
    const { data, error } = await supabase.functions.invoke('analizar-ndvi', {
      body: {
        establecimiento_id: authStore.profile?.establecimiento_id,
        potrero_ids: [potrero.id],
      },
    })
    if (error) throw error
    const res = data.resultados?.[0]
    if (res?.estado === 'exitoso') {
      potrero.ultimo_ndvi = res.ndvi
      potrero.fecha_ultimo_ndvi = new Date().toISOString()
      $q.notify({
        type: 'positive',
        message: 'Dato actualizado',
        caption: `NDVI: ${res.ndvi.toFixed(2)}`,
      })
    }
  } catch (error) {
    console.error(error)
    $q.notify({ type: 'negative', message: 'Fallo al analizar' })
  } finally {
    loadingIndividual[potrero.id] = false
  }
}

async function verAnalisisProfundo(potrero) {
  showHistorialDialog.value = true
  loadingHistorial.value = true
  potreroActualHistorial.value = potrero.nombre
  historialData.value = []
  try {
    const { data, error } = await supabase.functions.invoke('analizar-ndvi', {
      body: {
        establecimiento_id: authStore.profile?.establecimiento_id,
        potrero_id: potrero.id,
      },
    })
    if (error) throw error
    if (data.historial) {
      historialData.value = data.historial
    }
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Error cargando historial' })
  } finally {
    loadingHistorial.value = false
  }
}
</script>

<style lang="scss" scoped>
/* Fondo Pro */
.dashboard-pro-bg {
  background-image: url('src/assets/nutrogan-bg.jpg');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  min-height: 100vh;
}

.page-title-box {
  background: #000000;
  color: #ffffff;
  border: 2px solid #ffffff;
  border-radius: 20px;
  padding: 8px 24px;
  display: inline-block;
  font-family: 'Outfit', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
}

/* KPI Cards con bordes de color */
.kpi-card {
  background: rgba(15, 15, 20, 0.85);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: transform 0.2s;
}
.kpi-card:hover {
  transform: translateY(-3px);
  background: rgba(20, 20, 25, 0.95);
}

.border-neon-left {
  border-left: 4px solid #39ff14;
}
.border-white-left {
  border-left: 4px solid #ffffff;
}
.border-cyan-left {
  border-left: 4px solid #00e5ff;
}
.border-blue-left {
  border-left: 4px solid #0037ff;
}

/* Tarjeta de Potrero */
.ndvi-card {
  background: rgba(10, 10, 12, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  transition: all 0.3s ease;
  overflow: hidden;

  &:hover {
    border-color: #39ff14;
    box-shadow: 0 0 20px rgba(57, 255, 20, 0.15);
    background: rgba(15, 15, 20, 0.9);
  }
}

/* Iconos SVG Personalizados */
.potrero-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.potrero-icon-shape {
  width: 32px;
  height: 32px;
  /* El color se inyecta inline dinámicamente */
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}

/* Barra NDVI con Gradiente Oficial */
.ndvi-track {
  height: 6px;
  width: 100%;
  background: linear-gradient(
    90deg,
    #0037ff 0%,
    /* Azul Eléctrico */ #00e5ff 33%,
    /* Cian */ #ccff00 66%,
    /* Lima */ #39ff14 100% /* Verde Neón */
  );
  border-radius: 4px;
  opacity: 0.9;
}
.ndvi-marker {
  position: absolute;
  top: -5px;
  width: 4px;
  height: 16px;
  background: #fff;
  box-shadow: 0 0 8px #fff;
  transform: translateX(-50%);
  transition: left 1s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 2px;
}

/* Tipografía */
.font-mono {
  font-family: 'Fira Code', monospace;
  letter-spacing: -0.5px;
}
.font-numeric {
  font-family: 'Outfit', sans-serif;
}
.text-display {
  font-size: 2.5rem;
  line-height: 1;
}
.text-glow {
  text-shadow: 0 0 15px rgba(57, 255, 20, 0.4);
}
.tracking-wide {
  letter-spacing: 1px;
}
.tracking-widest {
  letter-spacing: 2px;
}

/* Utilidades */
.glass-btn {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
}
.bg-dark-soft {
  background: rgba(0, 0, 0, 0.3);
}
.bg-dark-header {
  background: #050505;
}
.opacity-20 {
  opacity: 0.2;
}
.opacity-10 {
  opacity: 0.1;
}
.shadow-glow {
  box-shadow: 0 0 15px rgba(0, 229, 255, 0.3);
}
.border-neon {
  border: 1px solid #39ff14;
}
.border-left-green {
  border-left: 3px solid #39ff14;
}
.border-left-cyan {
  border-left: 3px solid #00e5ff;
}

/* Paginación */
:deep(.glass-pagination .q-btn) {
  background: rgba(0, 0, 0, 0.3) !important;
  backdrop-filter: blur(4px);
}
:deep(.glass-pagination .q-btn.text-black) {
  background: #39ff14 !important; /* Verde neón activo */
  color: black !important;
  font-weight: bold;
}
</style>
