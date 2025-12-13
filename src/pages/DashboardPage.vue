<template>
  <q-page
    class="dashboard-page text-white overflow-hidden font-outfit column q-pa-md"
    style="background: rgba(5, 5, 5, 0.85)"
  >

    <div
      class="header-row row items-center relative-position z-50 fade-in-down full-width"
      :class="$q.screen.lt.sm ? 'justify-center q-mb-md' : 'justify-between q-mb-sm'"
    >

      <div
        :class="$q.screen.lt.sm ? 'order-last col-6 row justify-start q-pr-xs' : 'row items-center z-top'"
      >
        <div class="location-pill row items-center q-px-sm q-py-xs" :class="{ 'full-width justify-center': $q.screen.lt.sm }">
          <q-icon name="place" color="primary" size="xs" class="q-mr-xs" />
          <div class="column justify-center">
            <span class="text-caption text-weight-bold text-uppercase leading-none tracking-wider">
              {{ dataStore.establecimientoActual?.ciudad || 'FORMOSA' }}
            </span>
            <span class="text-nano text-grey-4 tracking-widest">ARGENTINA</span>
          </div>
        </div>
      </div>

      <div
        :class="$q.screen.lt.sm ? 'order-first col-12 row justify-center q-mb-sm' : 'absolute-center z-top q-mt-xs'"
      >
        <div class="page-title-box">DASHBOARD</div>
      </div>

      <div
        :class="$q.screen.lt.sm ? 'order-last col-6 row justify-end q-pl-xs' : 'row items-center justify-end q-gutter-x-md z-top'"
      >
        <div
          class="glass-capsule row items-center q-px-md shadow-3"
          :style="$q.screen.lt.sm ? 'width: 100%' : ''"
        >
          <q-icon name="search" color="grey-5" size="xs" />
          <q-select
            v-model="searchTarget"
            :options="searchOptions"
            dense
            dark
            borderless
            class="no-border-input q-ml-sm"
            :class="{ 'col': $q.screen.lt.sm }"
            :style="$q.screen.gt.xs ? 'width: 180px' : ''"
            placeholder="Buscar..."
            option-value="id"
            option-label="label"
            hide-dropdown-icon
            use-input
            input-debounce="0"
            @filter="filterSearch"
            @update:model-value="flyToTarget"
          />
        </div>

        <div class="row items-center q-gutter-x-lg gt-sm q-px-sm">
          <div class="column items-center">
            <span class="text-nano text-grey-5 font-mono">HACIENDA</span>
            <span class="text-subtitle2 text-primary leading-none text-weight-bold">{{
              kpis.totalAnimales
            }}</span>
          </div>
          <div class="vertical-sep"></div>
          <div class="column items-center">
            <span class="text-nano text-grey-5 font-mono">OCUPACIÓN</span>
            <span class="text-subtitle2 text-cyan-4 leading-none text-weight-bold"
              >{{ kpis.ocupacion }}%</span
            >
          </div>
        </div>
      </div>
    </div>

    <div class="main-frame col column relative-position overflow-hidden shadow-10">
      <div class="col-grow relative-position overflow-hidden map-area-rounded">

        <div class="full-height full-width relative-position transition-blur" :class="{ 'blur-content': !!selectedPotrero }">
          <l-map
            ref="mapRef"
            v-model:zoom="zoom"
            :center="mapCenter"
            :options="{ zoomControl: false, attributionControl: false, fadeAnimation: true }"
            style="height: 100%; width: 100%; z-index: 0"
            @ready="onMapReady"
          >
            <l-tile-layer :url="currentTileLayer" layer-type="base" name="Base Layer" />
            <l-geo-json v-if="potrerosGeoJson" :geojson="potrerosGeoJson" :options="geoJsonOptions" />
          </l-map>

          <div class="absolute-full no-pointer-events" style="z-index: 10">
            <div
              v-for="potrero in potrerosConPosicion"
              :key="potrero.id"
              class="map-marker-wrapper all-pointer-events"
              :style="{ top: potrero.y + 'px', left: potrero.x + 'px' }"
            >
              <div
                class="pro-marker cursor-pointer column flex-center"
                :class="{
                  occupied: potrero.loteAsignado,
                  free: !potrero.loteAsignado,
                  'drop-target-active': isDraggingFromCorral && !potrero.loteAsignado,
                }"
                @click.stop="selectPotrero(potrero)"
                @dragover.prevent
                @drop="onDropOnPotrero(potrero)"
                :draggable="!!potrero.loteAsignado"
                @dragstart="onDragStartMap(potrero, $event)"
              >
                <div
                  v-if="potrero.loteAsignado"
                  class="map-lote-icon"
                  :style="{
                    '-webkit-mask-image': `url(${getLoteIconPath(potrero.loteAsignado)})`,
                    'mask-image': `url(${getLoteIconPath(potrero.loteAsignado)})`,
                  }"
                ></div>
                <div v-else class="custom-grass-icon"></div>
                <div v-if="potrero.loteAsignado" class="marker-badge">
                  {{ potrero.loteAsignado.cantidad_animales }}
                </div>
              </div>
              <div class="marker-label shadow-2">{{ potrero.nombre }}</div>
            </div>
          </div>

          <div
            class="absolute-right q-ma-md column z-top all-pointer-events"
            style="top: 50%; transform: translateY(-50%)"
          >
            <div class="column bg-glass-blur rounded-borders overflow-hidden shadow-3 border-subtle">
              <q-btn
                flat
                dense
                padding="sm"
                icon="map"
                :color="mapMode === 'dark' ? 'primary' : 'grey'"
                @click="mapMode = 'dark'"
                ><q-tooltip>Oscuro</q-tooltip></q-btn
              >
              <q-separator dark />
              <q-btn
                flat
                dense
                padding="sm"
                icon="satellite_alt"
                :color="mapMode === 'satellite' ? 'primary' : 'grey'"
                @click="mapMode = 'satellite'"
                ><q-tooltip>Satélite</q-tooltip></q-btn
              >
              <q-separator dark class="q-my-xs opacity-50" />
              <q-btn flat dense padding="sm" icon="add" color="white" @click="zoom++" />
              <q-separator dark />
              <q-btn flat dense padding="sm" icon="remove" color="white" @click="zoom--" />
              <q-separator dark />
              <q-btn
                flat
                dense
                padding="sm"
                icon="my_location"
                color="cyan-4"
                @click="centrarMapa(true)"
              />
            </div>
          </div>
        </div>

        <transition name="scale">
          <div v-if="selectedPotrero" class="absolute-center z-max all-pointer-events">
            <ProDetailCard
              :potrero-data="selectedPotrero.potreroData"
              :lote-data="selectedPotrero.loteData"
              @close="selectedPotrero = null"
              @view-history="irADetalle(selectedPotrero.loteData?.id)"
              @drag-lote="onCardDragStart"
            />
          </div>
        </transition>
      </div>

      <div
        class="corral-panel column relative-position border-top-neon transition-blur"
        :class="{ 'blur-content': !!selectedPotrero }"
      >
        <div
          class="row justify-between items-center q-px-md q-py-xs bg-black-transparent"
          style="height: 32px"
        >
          <div class="row items-center font-mono text-xxs text-white tracking-widest">
            <q-icon
              name="fence"
              color="primary"
              size="xs"
              class="q-mr-xs"
              style="font-size: 14px"
            />
            MI CORRAL
          </div>
          <q-badge color="grey-9" text-color="primary" :label="`${lotesDisponibles.length}`" />
        </div>

        <div
          class="col relative-position column justify-between q-py-xs"
          @dragover.prevent
          @drop="onDropCorral"
        >
          <div v-if="lotesDisponibles.length === 0" class="col column flex-center text-grey-6">
            <span class="text-nano text-uppercase tracking-widest opacity-50">Corral Vacío</span>
          </div>

          <div v-else class="col column justify-center">
            <div class="row q-col-gutter-md justify-center items-center full-width q-px-sm">
              <div
                v-for="lote in lotesPaginados"
                :key="lote.id"
                class="col-auto"
                style="width: 260px"
              >
                <q-card
                  class="lote-card cursor-grab full-width"
                  flat
                  draggable="true"
                  @dragstart="onDragStartCorral($event, lote)"
                  @dragend="onDragEnd"
                  @click="selectLote(lote)"
                >
                  <q-card-section class="row items-center no-wrap q-pa-sm">
                    <div class="corral-icon-box q-mr-md">
                      <div
                        class="corral-icon-shape"
                        :style="{
                          '-webkit-mask-image': `url(${getLoteIconPath(lote)})`,
                          'mask-image': `url(${getLoteIconPath(lote)})`,
                        }"
                      ></div>
                    </div>

                    <div class="column overflow-hidden col">
                      <div class="text-subtitle2 text-weight-bold text-white ellipsis">
                        {{ lote.identificacion }}
                      </div>
                      <div class="text-caption text-grey-4 row items-center no-wrap">
                        <q-badge :color="getObjetivoColor(lote.objetivo)" class="q-mr-xs">
                          {{ lote.objetivo }}
                        </q-badge>
                        <span class="ellipsis text-nano">| {{ lote.cantidad_animales }} cb</span>
                      </div>
                    </div>

                    <q-icon name="drag_indicator" color="grey-7" />
                  </q-card-section>
                </q-card>
                </div>
            </div>
          </div>

          <div class="row justify-center q-mb-sm" v-if="totalPages > 1" style="height: 20px">
            <q-pagination
              v-model="page"
              :max="totalPages"
              :max-pages="3"
              boundary-numbers
              dense
              flat
              color="grey-5"
              active-color="primary"
              active-text-color="black"
              size="xs"
            />
          </div>

          <div
            v-if="isDraggingFromMap"
            class="absolute-full flex flex-center drop-overlay-tech no-pointer-events"
          >
            <div class="column flex-center bounce">
              <q-icon name="south" size="2em" class="text-primary" />
              <div class="text-xxs text-white text-weight-bold q-mt-xs">GUARDAR</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="isDraggingFromCorral"
      class="absolute-full flex flex-center no-pointer-events"
      style="z-index: 9000; background: rgba(0, 0, 0, 0.1)"
    >
      <div class="hint-pill bounce shadow-10 text-xs bg-dark-blur border-neon">
        <q-icon name="touch_app" class="q-mr-sm" size="xs" /> Arrastra al mapa
      </div>
    </div>
    <q-inner-loading :showing="globalLoading" dark class="z-max">
      <q-spinner-orbit size="40px" color="primary" />
    </q-inner-loading>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useDataStore } from 'stores/data-store'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import 'leaflet/dist/leaflet.css'
import { LMap, LTileLayer, LGeoJson } from '@vue-leaflet/vue-leaflet'
import ProDetailCard from 'components/dashboard/ProDetailCard.vue'
import { useSound } from 'src/composables/useSound'

const dataStore = useDataStore()
const $q = useQuasar()
const router = useRouter()
const { playMuu } = useSound()

// Estados Básicos
const zoom = ref(14)
const mapCenter = ref([-26.1775, -58.1756])
let mapObject = null
const mapRef = ref(null)
const mapMode = ref('dark')
const searchTarget = ref(null)

const selectedPotrero = ref(null)
const globalLoading = ref(false)

// Paginación Corral
const page = ref(1)
const pageSize = computed(() => {
  if ($q.screen.gt.lg) return 6
  if ($q.screen.lg) return 4
  if ($q.screen.md) return 3
  return 1 // Móvil (1 tarjeta por página para que se vea bien grande)
})

// Drag & Drop
const isDraggingFromCorral = ref(false)
const isDraggingFromMap = ref(false)
const draggingPayload = ref(null)
const markerPositions = ref({})

// Computadas
const currentTileLayer = computed(() =>
  mapMode.value === 'satellite'
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
)

const kpis = computed(() => {
  const total = dataStore.lotes.reduce((acc, l) => acc + (l.cantidad_animales || 0), 0)
  const ocupados = dataStore.potreros.filter((p) => lotesEnPotrero(p.id)).length
  const pct = dataStore.potreros.length
    ? Math.round((ocupados / dataStore.potreros.length) * 100)
    : 0
  return { totalAnimales: total, ocupacion: pct }
})

const searchOptions = computed(() => {
  const opts = []
  dataStore.potreros.forEach((p) =>
    opts.push({ label: `Potrero: ${p.nombre}`, id: p.id, type: 'potrero', coords: p.geometria }),
  )
  dataStore.lotes.forEach((l) =>
    opts.push({ label: `Lote: ${l.identificacion}`, id: l.id, type: 'lote', lote: l }),
  )
  return opts
})

// === LOGICA CORRAL ===
const lotesDisponibles = computed(() => dataStore.lotes.filter((l) => !l.potrero_actual_id))
const totalPages = computed(() => Math.ceil(lotesDisponibles.value.length / pageSize.value) || 1)
const lotesPaginados = computed(() => {
  const start = (page.value - 1) * pageSize.value
  const end = start + pageSize.value
  return lotesDisponibles.value.slice(start, end)
})
watch([lotesDisponibles, pageSize], () => {
  if (page.value > totalPages.value) page.value = 1
})

const potrerosGeoJson = computed(() => {
  const features = dataStore.potreros
    .filter((p) => p.geometria)
    .map((p) => {
      let geometry = typeof p.geometria === 'string' ? JSON.parse(p.geometria) : p.geometria
      if (geometry.type === 'Feature') geometry = geometry.geometry
      const ocupado = !!lotesEnPotrero(p.id)
      return { type: 'Feature', properties: { id: p.id, ocupado }, geometry }
    })
  return { type: 'FeatureCollection', features }
})

const potrerosConPosicion = computed(() => {
  return dataStore.potreros
    .filter((p) => p.geometria)
    .map((p) => {
      const pos = markerPositions.value[p.id] || { x: -5000, y: -5000 }
      return { ...p, x: pos.x, y: pos.y, loteAsignado: lotesEnPotrero(p.id) }
    })
})

const geoJsonOptions = computed(() => ({
  style: (feature) => ({
    color: feature.properties.ocupado ? '#00e5ff' : '#39ff14',
    weight: 2,
    opacity: 0.6,
    fillColor: feature.properties.ocupado ? '#0037ff' : '#39ff14',
    fillOpacity: 0.15,
  }),
}))

// Métodos
function filterSearch(val, update) {
  update(() => { /* show all */ })
}
function flyToTarget(val) {
  if (!val || !mapObject) return
  if (val.type === 'potrero') {
    try {
      let geo = typeof val.coords === 'string' ? JSON.parse(val.coords) : val.coords
      if (geo.type === 'Feature') geo = geo.geometry
      const coords = geo.coordinates[0][0]
      mapObject.flyTo([coords[1], coords[0]], 16)
      selectPotrero(dataStore.getPotreroById(val.id))
    } catch {
      // ignore invalid coordinates
    }
  } else if (val.type === 'lote') {
    if (val.lote.potrero_actual_id) {
      const p = dataStore.getPotreroById(val.lote.potrero_actual_id)
      if (p) flyToTarget({ type: 'potrero', coords: p.geometria, id: p.id })
    } else {
      $q.notify({ message: 'Lote en corral', color: 'info' })
    }
  }
  searchTarget.value = null
}

function updateMarkerPositions() {
  if (!mapObject) return
  const newPositions = {}
  dataStore.potreros.forEach((p) => {
    if (!p.geometria) return
    let centerLat, centerLng
    try {
      let geo = typeof p.geometria === 'string' ? JSON.parse(p.geometria) : p.geometria
      if (geo.type === 'Feature') geo = geo.geometry
      const coords = geo.coordinates[0]
      if (!coords) return
      let latSum = 0,
        lngSum = 0
      coords.forEach((c) => {
        lngSum += c[0]
        latSum += c[1]
      })
      centerLat = latSum / coords.length
      centerLng = lngSum / coords.length
      const point = mapObject.latLngToContainerPoint([centerLat, centerLng])
      newPositions[p.id] = { x: point.x, y: point.y }
    } catch {
      // ignore geometry parsing error
    }
  })
  markerPositions.value = newPositions
}

function onMapReady(map) {
  mapObject = map
  map.on('move', updateMarkerPositions)
  map.on('zoom', updateMarkerPositions)
  map.on('resize', updateMarkerPositions)
  setTimeout(() => {
    if (mapObject) {
      mapObject.invalidateSize()
      updateMarkerPositions()
    }
  }, 400)
}

function centrarMapa() {
  if (!mapObject || !('geolocation' in navigator)) return
  navigator.geolocation.getCurrentPosition((p) => {
    mapObject.flyTo([p.coords.latitude, p.coords.longitude], 16)
  })
}

// Drag & Drop
function onDragStartCorral(event, lote) {
  isDraggingFromCorral.value = true
  draggingPayload.value = { type: 'corral_lote', loteId: lote.id }
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', JSON.stringify(draggingPayload.value))
}
function onCardDragStart(payload) {
  isDraggingFromMap.value = true
  draggingPayload.value = payload
}
function onDragStartMap(potrero, event) {
  if (!potrero.loteAsignado) return
  isDraggingFromMap.value = true
  draggingPayload.value = {
    type: 'card_lote',
    loteId: potrero.loteAsignado.id,
    potreroOrigenId: potrero.id,
  }
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', JSON.stringify(draggingPayload.value))
}
function onDragEnd() {
  isDraggingFromCorral.value = false
  isDraggingFromMap.value = false
  draggingPayload.value = null
}
async function onDropOnPotrero(potrero) {
  if (isDraggingFromCorral.value && draggingPayload.value?.type === 'corral_lote') {
    if (potrero.loteAsignado) {
      $q.notify({ message: 'Ocupado', color: 'warning', icon: 'warning', position: 'top' })
      onDragEnd()
      return
    }
    try {
      globalLoading.value = true
      await dataStore.moverLote(draggingPayload.value.loteId, potrero.id)
      await dataStore.fetchLotes()
      playMuu()
      $q.notify({ message: 'Asignado', color: 'positive', icon: 'check', position: 'top' })
    } catch {
      $q.notify({ message: 'Error', color: 'negative', position: 'top' })
    } finally {
      globalLoading.value = false
      onDragEnd()
    }
  }
}
async function onDropCorral(e) {
  let data = draggingPayload.value
  if (!data)
    try {
      data = JSON.parse(e.dataTransfer.getData('text/plain'))
    } catch {
      // ignore non-json drag data
    }
  if (data && data.type === 'card_lote') {
    try {
      globalLoading.value = true
      await dataStore.moverLoteACorral(data.loteId, data.potreroOrigenId)
      await dataStore.fetchLotes()
      playMuu()
      $q.notify({ message: 'En Corral', color: 'info', icon: 'input', position: 'top' })
      selectedPotrero.value = null
    } catch {
      $q.notify({ message: 'Error', color: 'negative', position: 'top' })
    } finally {
      globalLoading.value = false
      onDragEnd()
    }
  }
  onDragEnd()
}

// Utils
function selectPotrero(p) {
  const l = p.loteAsignado
  selectedPotrero.value = {
    potreroData: {
      id: p.id,
      nombre: p.nombre,
      superficie: p.superficie_ha?.toFixed(1) || 0,
      ndvi: p.ultimo_ndvi?.toFixed(2) || '-',
      ubicacion: p.ciudad || '',
    },
    loteData: l
      ? {
          id: l.id,
          identificacion: l.identificacion,
          cantidad: l.cantidad_animales,
          objetivo: l.objetivo,
          peso: l.peso_ingreso_kg || '-',
          fechaIngreso: formatearFecha(p.fecha_entrada),
          icon: getLoteIconPath(l),
        }
      : null,
  }
}
function selectLote(l) {
  $q.notify({
    message: l.identificacion,
    caption: 'Arrastra al mapa',
    color: 'dark',
    icon: 'touch_app',
    position: 'top',
  })
}
function irADetalle(id) {
  if (id) router.push(`/lote/${id}`)
}
function lotesEnPotrero(id) {
  return dataStore.lotes.find((l) => l.potrero_actual_id === id)
}
function getLoteIconPath(l) {
  const o = l.objetivo ? String(l.objetivo).toLowerCase() : 'default'
  let n = 'default'
  if (o.includes('recría') || o.includes('recria')) n = 'recria'
  else if (o.includes('cría') || o.includes('cria')) n = 'cria'
  else if (o.includes('engorde')) n = 'engorde'
  return `/icons/${n}.svg`
}
function formatearFecha(f) {
  return f ? new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '-'
}

function getObjetivoColor(obj) {
  if (obj === 'Engorde') return 'green-9'
  if (obj === 'Recría') return 'cyan-9'
  if (obj === 'Cría') return 'blue-10'
  return 'blue-grey-8'
}

onMounted(async () => {
  await dataStore.fetchAll()
})
watch(
  () => dataStore.potreros,
  () => nextTick(updateMarkerPositions),
  { deep: true },
)
</script>

<style lang="scss" scoped>
/* GENERAL */
.font-outfit {
  font-family: 'Outfit', sans-serif;
}
.font-mono {
  font-family: 'Fira Code', monospace;
}
.dashboard-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* HEADER ELEMENTS */
.page-title-box {
  background: #000;
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 100px;
  padding: 4px 16px;
  font-weight: 700;
  letter-spacing: 1.5px;
  font-size: 1.5rem;
  box-shadow: 0 0 5px rgba(2, 230, 255, 0.099);
}
.glass-pill {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50px;
  height: 36px;
}
.glass-capsule {
  background: rgb(15, 15, 20);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  height: 36px;
}
.icon-glow {
  width: 20px;
  height: 20px;
  background: rgba(0, 255, 17, 0.989);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.location-pill {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  background: rgba(34, 34, 34, 0);
}
.vertical-sep {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.15);
  margin: 10 10px;
}
.text-xxs {
  font-size: 0.65rem;
}
.text-xs {
  font-size: 0.75rem;
}
.text-nano {
  font-size: 0.5rem;
  letter-spacing: 0.5px;
}
.leading-none {
  line-height: 1;
}
.tracking-wider {
  letter-spacing: 1px;
}
.tracking-widest {
  letter-spacing: 2px;
}

/* MARCO PRINCIPAL */
.main-frame {
  border: 1px solid rgba(255, 255, 255, 0.195);
  border-radius: 20px;
  background: rgba(20, 20, 20, 0.5) !important;
  backdrop-filter: blur(8px);
  margin-bottom: 10px; /* Footer */
}
.map-area-rounded {
  border-radius: 20px 20px 0 0;
}

/* CORRAL */
.corral-panel {
  height: 150px;
  flex-shrink: 0;
  z-index: 50;
  background: rgba(10, 10, 12, 0.8);
  border-top: 1px solid rgb(255, 255, 255);
}
.bg-black-transparent {
  background: rgba(81, 82, 83, 0.333);
}

/* --- TARJETA LOTE ESTILO NEON/CYBERPUNK --- */
.lote-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  transition: all 0.2s;
  overflow: hidden;
  &:hover {
    background: rgba(4, 4, 4, 0.08);
    border-color: #39ff14;
    transform: translateY(-2px);
  }
}

.corral-icon-box {
  width: 50px;
  height: 50px;
  min-width: 50px;
  border-radius: 12px;
  background-color: #000000;
  border: 2px solid #39ff14;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 12px rgba(57, 255, 20, 0.2);
}

.corral-icon-shape {
  width: 30px;
  height: 30px;
  background-color: #39ff14;
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}

/* MARKERS & UTILS */
.bg-glass-blur {
  background: rgba(32, 32, 32, 0.692);
  backdrop-filter: blur(10px);
}
.border-subtle {
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.map-marker-wrapper {
  position: absolute;
  transform: translate(-50%, -50%);
  transition:
    top 0.05s,
    left 0.05s;
}
.pro-marker {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid;
  background: rgba(0, 0, 0, 0.8);
  transition: all 0.2s;
  &.free {
    border-color: #76ff14;
    color: #39ff14;
    &:hover {
      background: #000;
      transform: scale(1.2);
    }
  }
  &.occupied {
    border-color: #00e5ff;
    color: #00e5ff;
    background: rgba(0, 20, 40, 0.9);
    &:hover {
      transform: scale(1.2);
    }
  }
  &.drop-target-active {
    transform: scale(1.3);
    border-color: #fff;
    background: rgba(57, 255, 20, 0.4);
  }
}
.map-lote-icon {
  width: 26px;
  height: 26px;
  background: currentColor;
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
}
.custom-grass-icon {
  width: 24px;
  height: 24px;
  background: currentColor;
  mask-image: url('/icons/potrero.svg');
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
}
.marker-label {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-top: 4px;
  white-space: nowrap;
}
.marker-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #0037ff;
  color: #fff;
  font-size: 9px;
  font-weight: bold;
  padding: 1px 5px;
  border-radius: 8px;
  border: 1px solid #fff;
}

.drop-overlay-tech {
  background: rgba(10, 15, 30, 0.95);
  backdrop-filter: blur(4px);
  z-index: 100;
  border: 2px dashed #39ff14;
  margin: 10px;
  border-radius: 12px;
}
.hint-pill {
  background: #111;
  border: 1px solid #39ff14;
  color: #39ff14;
  padding: 8px 16px;
  border-radius: 50px;
  font-weight: 600;
}
.bounce {
  animation: bounce 1s infinite;
}
@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}
.fade-in-down {
  animation: fadeInDown 0.5s ease-out;
}
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ESTILOS PARA EL EFECTO BLUR */
.blur-content {
  filter: blur(5px);
  transition: filter 0.3s ease;
  pointer-events: none;
}
.transition-blur {
  transition: filter 0.3s ease;
}

/* Colores */
.bg-blue-10 {
  background-color: #1565c0;
}
.bg-cyan-6 {
  background-color: #00acc1;
}
.bg-green-6 {
  background-color: #43a047;
}
.bg-grey {
  background-color: #757575;
}
</style>
