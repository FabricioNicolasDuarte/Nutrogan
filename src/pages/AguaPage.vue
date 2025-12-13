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
          Gestión Hídrica
        </div>
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-xl">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card relative-position overflow-hidden border-cyan-left">
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="water_drop" size="3em" color="cyan-4" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              Inventario
            </div>
            <div class="text-h3 text-weight-bold text-cyan-4 font-numeric text-glow">
              {{ kpiResumen.total }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Puntos de agua activos</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card relative-position overflow-hidden border-neon-left">
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="science" size="3em" color="primary" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              pH Promedio
            </div>
            <div class="text-h3 text-weight-bold text-primary font-numeric">
              {{ kpiResumen.promedioPh }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Calidad Global</div>
          </q-card-section>
          <q-linear-progress
            :value="(Number(kpiResumen.promedioPh) || 0) / 14"
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
              Críticos
            </div>
            <div class="text-h3 text-weight-bold text-white font-numeric">
              {{ kpiResumen.criticos }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Fuentes contaminadas</div>
          </q-card-section>
          <q-linear-progress
            :value="kpiResumen.criticos / (dataStore.fuentesAgua.length || 1)"
            color="white"
            track-color="dark"
            class="absolute-bottom"
            size="4px"
          />
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card relative-position overflow-hidden border-blue-left">
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="sensors" size="3em" color="secondary" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              Red IoT
            </div>
            <div class="text-h3 text-weight-bold text-secondary font-numeric">
              {{ kpiResumen.inteligentes }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Sensores telemétricos</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card flat class="map-card-pro q-mb-xl overflow-hidden shadow-glow">
      <div class="map-header row items-center justify-between q-px-md q-py-sm bg-dark-glass">
        <div class="row items-center">
          <q-icon name="public" color="primary" class="q-mr-sm" />
          <span class="text-subtitle2 font-mono">GEO_HIDROLOGIA_V2</span>
        </div>
        <div class="row q-gutter-x-sm">
          <div class="row items-center">
            <div class="dot bg-green-13"></div>
            <span class="text-caption q-ml-xs">OK</span>
          </div>
          <div class="row items-center">
            <div class="dot bg-yellow-14"></div>
            <span class="text-caption q-ml-xs">WARN</span>
          </div>
          <div class="row items-center">
            <div class="dot bg-white"></div>
            <span class="text-caption q-ml-xs">CRIT</span>
          </div>
        </div>
      </div>

      <div class="map-wrapper relative-position">
        <l-map
          ref="mapRef"
          v-model:zoom="zoom"
          :center="mapCenter"
          :options="{ zoomControl: false }"
          style="height: 100%; width: 100%"
          @ready="onMapReady"
        >
          <l-tile-layer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            layer-type="base"
            name="Stadia Dark"
          />

          <l-geo-json v-if="potrerosGeoJson" :geojson="potrerosGeoJson" :options="geoJsonOptions" />

          <l-marker
            v-for="fuente in fuentesConGeo"
            :key="fuente.id"
            :lat-lng="getCoords(fuente.geometria)"
            :icon="getIconoLeaflet(fuente)"
          >
            <l-popup class="custom-popup">
              <div class="text-subtitle2 text-weight-bold font-mono">{{ fuente.nombre }}</div>
              <div class="text-caption text-grey-4">{{ fuente.tipo }}</div>
              <div class="q-mt-xs">
                <span :style="{ color: getStatusColor(fuente.ultimo_estado) }"
                  >● {{ fuente.ultimo_estado }}</span
                >
              </div>
            </l-popup>
          </l-marker>
        </l-map>

        <div class="absolute-bottom-right q-ma-md pointer-events-auto column q-gutter-y-xs">
          <q-btn flat round dense icon="add" class="glass-btn" @click="zoom++" />
          <q-btn flat round dense icon="remove" class="glass-btn" @click="zoom--" />
        </div>
      </div>
    </q-card>

    <div class="row items-center justify-between q-mb-lg">
      <div class="text-h5 text-weight-bold row items-center">
        <q-icon name="grid_view" class="q-mr-sm text-primary" />
        Fuentes de Agua
      </div>
      <q-btn
        color="primary"
        icon="add"
        label="Nueva Fuente"
        class="text-black text-weight-bold shadow-glow"
        @click="abrirFormFuente(null)"
      />
    </div>

    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner-orbit color="primary" size="4em" />
      <div class="text-primary q-mt-md font-mono">CARGANDO RECURSOS HÍDRICOS...</div>
    </div>

    <div
      v-if="!loading && dataStore.fuentesAgua.length === 0"
      class="text-center text-grey-6 q-pa-xl"
    >
      <q-icon name="water_off" size="5em" />
      <div class="text-h6 q-mt-md">Sin fuentes registradas.</div>
    </div>

    <div class="row q-col-gutter-lg">
      <div v-for="fuente in fuentesPaginadas" :key="fuente.id" class="col-12 col-sm-6 col-md-4">
        <q-card
          class="water-card full-height column justify-between"
          :class="getBorderClass(fuente.ultimo_estado)"
        >
          <q-card-section class="q-pb-xs">
            <div class="row items-center no-wrap">
              <div class="fuente-icon-wrapper q-mr-md">
                <div
                  class="fuente-icon-shape"
                  :style="{
                    '-webkit-mask-image': `url(${getFuenteIconPath(fuente)})`,
                    'mask-image': `url(${getFuenteIconPath(fuente)})`,
                    backgroundColor: getStatusColor(fuente.ultimo_estado),
                  }"
                ></div>
              </div>

              <div class="col overflow-hidden">
                <div class="text-h6 ellipsis">{{ fuente.nombre }}</div>
                <div class="text-caption text-grey-5 font-mono">
                  {{ fuente.tipo }}
                  <span v-if="fuente.es_inteligente" class="text-secondary">
                    | IoT <q-icon name="wifi" size="10px" />
                  </span>
                </div>
              </div>

              <q-btn flat round dense icon="more_vert" color="grey-5">
                <q-menu class="bg-dark text-white border-neon">
                  <q-list dense style="min-width: 140px">
                    <q-item clickable v-close-popup @click="abrirFormFuente(fuente)">
                      <q-item-section avatar><q-icon name="edit" size="xs" /></q-item-section>
                      <q-item-section>Editar</q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      v-close-popup
                      @click="confirmarEliminar(fuente)"
                      class="text-red"
                    >
                      <q-item-section avatar><q-icon name="delete" size="xs" /></q-item-section>
                      <q-item-section>Eliminar</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </q-card-section>

          <q-card-section class="q-py-sm">
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <div class="metric-box">
                  <div class="label text-primary">pH</div>
                  <div class="value font-numeric">{{ getLastAnalisis(fuente).ph }}</div>
                </div>
              </div>
              <div class="col-6">
                <div class="metric-box">
                  <div class="label text-cyan-4">TDS (ppm)</div>
                  <div class="value font-numeric">{{ getLastAnalisis(fuente).tds }}</div>
                </div>
              </div>
            </div>

            <div class="text-caption text-grey-6 q-mt-sm font-mono text-center">
              <q-icon name="history" size="xs" /> {{ getLastAnalisis(fuente).fecha }}
            </div>
          </q-card-section>

          <q-separator dark class="opacity-10" />
          <q-card-actions class="bg-dark-soft row q-col-gutter-sm q-pa-sm">
            <div class="col-6">
              <q-btn
                outline
                color="primary"
                label="Analizar"
                size="sm"
                class="full-width font-weight-bold"
                icon="science"
                @click="abrirFormAnalisis(fuente)"
              />
            </div>
            <div class="col-6">
              <q-btn
                flat
                color="white"
                label="Historial"
                size="sm"
                class="full-width"
                @click="abrirHistorial(fuente)"
              />
            </div>
          </q-card-actions>
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

    <q-dialog v-model="dialogos.formFuente" persistent class="glass-dialog-form">
      <FormFuenteAgua :fuente-editar="fuenteSeleccionada" @close="dialogos.formFuente = false" />
    </q-dialog>

    <q-dialog v-model="dialogos.formAnalisis" persistent class="glass-dialog-form">
      <FormAnalisisAgua
        v-if="fuenteSeleccionada"
        :fuente-id="fuenteSeleccionada.id"
        :fuente-nombre="fuenteSeleccionada.nombre"
        @close="dialogos.formAnalisis = false"
      />
    </q-dialog>

    <q-dialog v-model="dialogos.historial" class="glass-dialog-form">
      <DialogAnalisisHistorial
        v-if="fuenteSeleccionada"
        v-model="dialogos.historial"
        :fuente="fuenteSeleccionada"
      />
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useDataStore } from 'stores/data-store'
import { useQuasar } from 'quasar'
import { LMap, LTileLayer, LMarker, LGeoJson, LPopup } from '@vue-leaflet/vue-leaflet'
import L from 'leaflet'
import { supabase } from 'boot/supabase'

import FormFuenteAgua from 'components/agua/FormFuenteAgua.vue'
import FormAnalisisAgua from 'components/agua/FormAnalisisAgua.vue'
import DialogAnalisisHistorial from 'components/agua/DialogAnalisisHistorial.vue'

const dataStore = useDataStore()
const $q = useQuasar()
const loading = ref(false)

// Paginación
const page = ref(1)
const pageSize = 6

const totalPages = computed(() => Math.ceil(dataStore.fuentesAgua.length / pageSize))
const fuentesPaginadas = computed(() => {
  const start = (page.value - 1) * pageSize
  const end = start + pageSize
  return dataStore.fuentesAgua.slice(start, end)
})

// Dialogos
const dialogos = reactive({ formFuente: false, formAnalisis: false, historial: false })
const fuenteSeleccionada = ref(null)

// Map Ref
const mapRef = ref(null)
const zoom = ref(14)
const mapCenter = ref([-26.1775, -58.1756])

// --- COMPUTADAS VISUALES ---

const kpiResumen = computed(() => {
  const lista = dataStore.fuentesAgua || []
  const conAnalisis = lista.filter((f) => f.analisis_de_agua && f.analisis_de_agua.length > 0)

  let sumaPh = 0
  let countPh = 0
  conAnalisis.forEach((f) => {
    const ultimo = f.analisis_de_agua[0]
    if (ultimo && ultimo.ph) {
      sumaPh += Number(ultimo.ph)
      countPh++
    }
  })

  const criticos = lista.filter((f) => f.ultimo_estado === 'Peligro').length
  const inteligentes = lista.filter((f) => f.es_inteligente).length

  return {
    total: lista.length,
    promedioPh: countPh > 0 ? (sumaPh / countPh).toFixed(1) : '-',
    criticos,
    inteligentes,
  }
})

// Mapa: GeoJSON
const fuentesConGeo = computed(() => dataStore.fuentesAgua.filter((f) => f.geometria))
const potrerosGeoJson = computed(() => {
  const features = dataStore.potreros
    .filter((p) => p.geometria)
    .map((p) => ({
      type: 'Feature',
      properties: { nombre: p.nombre },
      geometry: p.geometria,
    }))
  return { type: 'FeatureCollection', features }
})

// Estilo Neón para Polígonos
const geoJsonOptions = computed(() => ({
  style: {
    color: '#39ff14',
    weight: 1,
    opacity: 0.4,
    fillColor: '#39ff14',
    fillOpacity: 0.05,
  },
}))

// --- FUNCIONES HELPERS VISUALES (Para Cards) ---

function getFuenteIconPath(fuente) {
  // Lógica para usar los SVGs personalizados en /public/icons/water-icons/
  if (fuente.es_inteligente) {
    return '/icons/water-icons/bebedero-inteligente.svg'
  }

  const tipo = fuente.tipo ? fuente.tipo.toLowerCase() : 'otros'
  let filename = 'otros.svg'

  if (tipo.includes('tanque')) filename = 'tanque.svg'
  else if (tipo.includes('bebedero')) filename = 'bebedero.svg'
  else if (tipo.includes('represa')) filename = 'represa.svg'
  else if (tipo.includes('pozo')) filename = 'pozo.svg'
  else if (tipo.includes('arroyo')) filename = 'arroyo.svg'

  return `/icons/water-icons/${filename}`
}

function getStatusColor(estado) {
  if (estado === 'Óptimo') return '#39ff14' // Verde Neón
  if (estado === 'Precaución') return '#00e5ff' // Cian
  if (estado === 'Peligro') return '#ffffff' // Blanco (Alto contraste)
  return '#555555' // Gris
}

function getBorderClass(estado) {
  if (estado === 'Óptimo') return 'border-neon-card'
  if (estado === 'Precaución') return 'border-cyan-card'
  if (estado === 'Peligro') return 'border-white-card'
  return ''
}

function getLastAnalisis(fuente) {
  if (fuente.analisis_de_agua && fuente.analisis_de_agua.length > 0) {
    const ult = fuente.analisis_de_agua[0]
    return {
      ph: ult.ph || '-',
      tds: ult.solidos_totales || '-',
      fecha: new Date(ult.fecha_analisis).toLocaleDateString('es-AR'),
    }
  }
  return { ph: '-', tds: '-', fecha: 'Sin datos' }
}

// --- ICONOS DE MAPA (PINES ESTÁNDAR) ---
// Regresamos al estilo de Pin SVG (Gota) para el mapa,
// pero mantenemos los colores de estado.
function getIconoLeaflet(fuente) {
  const color = getStatusColor(fuente.ultimo_estado)

  const svg = `
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 8px ${color});">
      <path d="M12 2C7 2 3 7 3 10.5C3 12.1627 3.65992 13.8824 5.30514 15.6558C7.54572 18.068 10.5186 21.0963 11.5367 22.0833C11.724 22.2662 12.016 22.2662 12.2033 22.0833C13.2214 21.0963 16.1943 18.068 18.4349 15.6558C20.7628 13.2985 21 11.6033 21 10.5C21 7 17 2 12 2Z"
        stroke="#000000" stroke-width="1.5" fill="${color}" fill-opacity="0.9"/>
      <circle cx="12" cy="10" r="3" fill="#000000" fill-opacity="0.5"/>
    </svg>
  `
  return L.divIcon({
    className: 'custom-pin-standard',
    html: svg,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -32],
  })
}

function getCoords(geometria) {
  if (geometria?.coordinates) return [geometria.coordinates[1], geometria.coordinates[0]]
  return [-26.17, -58.17]
}

function onMapReady() {
  setTimeout(() => {
    if (mapRef.value) mapRef.value.leafletObject.invalidateSize()
  }, 300)
}

// --- ACCIONES (CRUD) ---
function abrirFormFuente(f) {
  fuenteSeleccionada.value = f
  dialogos.formFuente = true
}
async function abrirFormAnalisis(f) {
  if (!f.analisis_de_agua || f.analisis_de_agua.length === 0) {
    const { data } = await supabase
      .from('analisis_de_agua')
      .select('*')
      .eq('fuente_id', f.id)
      .order('fecha_analisis', { ascending: false })
    if (data) f.analisis_de_agua = data
  }
  fuenteSeleccionada.value = f
  dialogos.formAnalisis = true
}
async function abrirHistorial(f) {
  if (!f.analisis_de_agua || f.analisis_de_agua.length === 0) {
    const { data } = await supabase
      .from('analisis_de_agua')
      .select('*')
      .eq('fuente_id', f.id)
      .order('fecha_analisis', { ascending: false })
    if (data) f.analisis_de_agua = data
  }
  fuenteSeleccionada.value = f
  dialogos.historial = true
}
function confirmarEliminar(f) {
  $q.dialog({
    title: 'Eliminar',
    message: `¿Borrar ${f.nombre}?`,
    cancel: true,
    dark: true,
  }).onOk(async () => {
    await dataStore.deleteFuenteAgua(f.id)
    $q.notify({ type: 'positive', message: 'Eliminado' })
  })
}

onMounted(async () => {
  loading.value = true
  if (dataStore.fuentesAgua.length === 0) await dataStore.fetchFuentesAgua()
  if (dataStore.potreros.length === 0) await dataStore.fetchPotreros()
  loading.value = false
})
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

/* KPI Cards */
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
  &:hover {
    transform: translateY(-3px);
    background: rgba(20, 20, 25, 0.95);
  }
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

/* Mapa Card */
.map-card-pro {
  background: rgba(15, 15, 20, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  height: 500px;
  display: flex;
  flex-direction: column;
}
.map-wrapper {
  flex: 1;
  background: #000;
}
.bg-dark-glass {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 5px currentColor;
}

/* Water Cards */
.water-card {
  background: rgba(10, 10, 12, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  transition: all 0.3s ease;
  overflow: hidden;
  &:hover {
    box-shadow: 0 0 20px rgba(0, 229, 255, 0.15);
    background: rgba(15, 15, 20, 0.9);
  }
}
/* Borders dinámicos */
.border-neon-card {
  border-left: 3px solid #39ff14;
}
.border-cyan-card {
  border-left: 3px solid #00e5ff;
}
.border-white-card {
  border-left: 3px solid #ffffff;
}

/* Icono Máscara SVG */
.fuente-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.fuente-icon-shape {
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

/* Metric Box */
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
    color: white;
  }
}

/* Typography & Utils */
.font-mono {
  font-family: 'Fira Code', monospace;
}
.font-numeric {
  font-family: 'Outfit', sans-serif;
}
.text-glow {
  text-shadow: 0 0 15px rgba(0, 229, 255, 0.4);
}
.glass-btn {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
}
.shadow-glow {
  box-shadow: 0 0 15px rgba(57, 255, 20, 0.4);
}
.opacity-20 {
  opacity: 0.2;
}
.opacity-10 {
  opacity: 0.1;
}
.bg-dark-soft {
  background: rgba(0, 0, 0, 0.3);
}

/* Paginación */
:deep(.glass-pagination .q-btn) {
  background: rgba(0, 0, 0, 0.3) !important;
  backdrop-filter: blur(4px);
}
:deep(.glass-pagination .q-btn.text-black) {
  background: #39ff14 !important;
  color: black !important;
  font-weight: bold;
}

/* Leaflet Popups */
:deep(.leaflet-popup-content-wrapper) {
  background: rgba(10, 10, 10, 0.9);
  color: white;
  border: 1px solid #39ff14;
  backdrop-filter: blur(4px);
}
:deep(.leaflet-popup-tip) {
  background: rgba(10, 10, 10, 0.9);
  border: 1px solid #39ff14;
}
</style>
