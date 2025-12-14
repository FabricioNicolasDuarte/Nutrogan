<template>
  <q-page padding class="dashboard-pro-bg text-white font-outfit">
    <div class="relative-position q-mb-lg">
      <div class="absolute-left" style="top: 10px; z-index: 10">
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

      <div class="text-center">
        <div class="page-title-box">Gestión de Lotes</div>
        <div class="text-grey-4 text-subtitle1 q-mt-xs">Visualización y Control del Rodeo</div>
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-xl">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card relative-position overflow-hidden border-neon-left">
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="pets" size="3em" color="primary" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              Rodeo Activo
            </div>
            <div class="text-h3 text-weight-bold text-primary font-numeric text-glow">
              {{ kpiResumen.totalCabezas }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Cabezas totales</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card relative-position overflow-hidden border-cyan-left">
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="grid_view" size="3em" color="cyan-4" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              Grupos
            </div>
            <div class="text-h3 text-weight-bold text-cyan-4 font-numeric">
              {{ kpiResumen.totalLotes }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Lotes registrados</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card relative-position overflow-hidden border-blue-left">
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="category" size="3em" color="secondary" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              Dominancia
            </div>
            <div class="text-h4 text-weight-bold text-white q-mt-sm font-outfit">
              {{ kpiResumen.categoriaDominante }}
            </div>
            <div class="text-caption text-secondary q-mt-xs font-mono">Mayoría del stock</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card relative-position overflow-hidden border-white-left">
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="fence" size="3em" color="white" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              En Corral
            </div>
            <div class="text-h3 text-weight-bold text-white font-numeric">
              {{ kpiResumen.enCorral }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Lotes sin asignar</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row items-center justify-between q-mb-lg q-col-gutter-md">
      <div class="col-12 col-md-6">
        <q-input
          v-model="filtro"
          placeholder="Buscar por ID o categoría..."
          outlined
          dense
          dark
          color="primary"
          class="search-input glass-input"
        >
          <template v-slot:prepend>
            <q-icon name="search" color="grey-5" />
          </template>
        </q-input>
      </div>
      <div class="col-12 col-md-6 text-right mobile-center-btn">
        <q-btn
          color="primary"
          icon="add"
          label="Nuevo Lote"
          class="text-black text-weight-bold shadow-glow full-width-mobile"
          @click="abrirDialogoNuevo"
        />
      </div>
    </div>

    <div v-if="loading.lotes" class="text-center q-pa-xl">
      <q-spinner-orbit color="primary" size="4em" />
      <div class="text-primary q-mt-md font-mono">CARGANDO RODEO...</div>
    </div>

    <div
      v-if="lotesFiltrados.length === 0 && !loading.lotes"
      class="text-center text-grey-6 q-pa-xl"
    >
      <q-icon name="pets" size="5em" class="opacity-50" />
      <div class="text-h6 q-mt-md">No se encontraron lotes.</div>
    </div>

    <div class="row q-col-gutter-lg">
      <div v-for="lote in lotesPaginados" :key="lote.id" class="col-12 col-sm-6 col-md-4">
        <q-card
          class="lote-card full-height column justify-between"
          :class="getBorderClass(lote.objetivo)"
          @click="verDetalleLote(lote.id)"
        >
          <q-card-section class="q-pb-xs cursor-pointer">
            <div class="row items-center no-wrap">
              <div class="lote-icon-wrapper q-mr-md">
                <div
                  class="lote-icon-shape"
                  :style="{
                    '-webkit-mask-image': `url(${getLoteIconPath(lote)})`,
                    'mask-image': `url(${getLoteIconPath(lote)})`,
                    backgroundColor: getObjetivoColorHex(lote.objetivo),
                  }"
                ></div>
              </div>

              <div class="col overflow-hidden">
                <div class="text-h6 text-weight-bold ellipsis font-mono">
                  {{ lote.identificacion }}
                </div>
                <div class="text-caption text-grey-5 text-uppercase tracking-wider ellipsis">
                  {{ lote.objetivo || 'SIN CATEGORÍA' }}
                </div>
              </div>

              <q-btn flat round dense icon="more_vert" color="grey-5" @click.stop>
                <q-menu class="bg-dark text-white border-neon">
                  <q-list dense style="min-width: 140px">
                    <q-item clickable v-close-popup @click="verDetalleLote(lote.id)">
                      <q-item-section avatar><q-icon name="visibility" size="xs" /></q-item-section>
                      <q-item-section>Ver Detalle</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="editarLote(lote)">
                      <q-item-section avatar><q-icon name="edit" size="xs" /></q-item-section>
                      <q-item-section>Editar</q-item-section>
                    </q-item>
                    <q-separator dark />
                    <q-item
                      clickable
                      v-close-popup
                      @click="confirmarEliminar(lote)"
                      class="text-red"
                    >
                      <q-item-section avatar
                        ><q-icon name="delete" size="xs" color="red"
                      /></q-item-section>
                      <q-item-section>Desactivar</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </q-card-section>

          <q-card-section class="q-py-md">
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <div class="metric-box">
                  <div class="label text-grey-5">Cabezas</div>
                  <div class="value font-numeric text-white">{{ lote.cantidad_animales }}</div>
                </div>
              </div>
              <div class="col-6">
                <div class="metric-box">
                  <div class="label text-grey-5">Peso Ing.</div>
                  <div class="value font-numeric text-white">
                    {{ lote.peso_ingreso_kg || 0 }}
                    <span class="text-caption text-grey-6">kg</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="q-mt-md row items-center">
              <q-icon
                :name="lote.potrero_actual_id ? 'fence' : 'home'"
                size="xs"
                class="q-mr-xs"
                :color="lote.potrero_actual_id ? 'primary' : 'grey-5'"
              />
              <span class="text-caption text-grey-4 ellipsis">
                {{ getUbicacion(lote) }}
              </span>
            </div>
          </q-card-section>

          <q-separator dark class="opacity-10" />

          <q-card-actions class="bg-dark-soft row q-col-gutter-sm q-pa-sm">
            <div class="col-4">
              <q-btn
                flat
                color="cyan-4"
                icon="straighten"
                size="sm"
                class="full-width"
                @click.stop="abrirDialogoEvaluar(lote)"
              >
                <q-tooltip class="bg-dark border-cyan">Pesar</q-tooltip>
              </q-btn>
            </div>
            <div class="col-4">
              <q-btn
                flat
                color="primary"
                icon="sync_alt"
                size="sm"
                class="full-width"
                @click.stop="abrirDialogoMover(lote)"
              >
                <q-tooltip class="bg-dark border-neon">Mover</q-tooltip>
              </q-btn>
            </div>
            <div class="col-4">
              <q-btn
                v-if="lote.objetivo === 'Cría'"
                flat
                color="white"
                icon="camera_alt"
                size="sm"
                class="full-width"
                @click.stop="$router.push(`/lote/${lote.id}/scan_cc`)"
              >
                <q-tooltip class="bg-dark">Scan CC</q-tooltip>
              </q-btn>
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

    <q-dialog v-model="showDialog" persistent class="glass-dialog-form">
      <q-card style="min-width: 400px; max-width: 95vw" class="bg-dark text-white border-neon">
        <q-form @submit="guardarLote" class="q-gutter-md">
          <q-card-section class="bg-dark-header">
            <div class="text-h6">{{ modoEdicion ? 'Editar' : 'Nuevo' }} Lote</div>
          </q-card-section>
          <q-card-section class="q-pt-none q-gutter-md">
            <q-input
              v-model="formLote.identificacion"
              label="Identificación (Ej: LT-001)"
              outlined
              dark
              color="primary"
              :rules="[(val) => !!val || 'Requerido']"
              autofocus
            />
            <q-select
              v-model="formLote.objetivo"
              label="Objetivo"
              outlined
              dark
              color="primary"
              :options="['Recría', 'Cría', 'Engorde', 'Otro']"
              :rules="[(val) => !!val || 'Requerido']"
              popup-content-class="glass-dialog-form"
            />
            <q-input
              v-model.number="formLote.cantidad_animales"
              label="Cantidad de Animales"
              type="number"
              outlined
              dark
              color="primary"
              :rules="[(val) => val > 0 || 'Debe ser > 0']"
            />
            <q-input
              v-model.number="formLote.peso_ingreso_kg"
              label="Peso Promedio de Ingreso (kg)"
              type="number"
              step="0.1"
              outlined
              dark
              color="primary"
              :rules="[(val) => val > 0 || 'Debe ser > 0']"
            />
            <q-input
              v-if="!modoEdicion"
              v-model="formLote.fecha_evaluacion"
              label="Fecha de Ingreso"
              type="date"
              stack-label
              outlined
              dark
              color="primary"
              :rules="[(val) => !!val || 'Requerido']"
            />
          </q-card-section>
          <q-card-actions align="right" class="q-pa-md bg-dark-soft">
            <q-btn flat label="Cancelar" color="white" v-close-popup @click="resetForm" />
            <q-btn label="Guardar" type="submit" color="primary" :loading="loading.guardar" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialogEvaluar" class="glass-dialog-form">
      <QuickEvaluateForm
        v-if="loteSeleccionado"
        :lote-prop="loteSeleccionado"
        @close="dialogEvaluar = false"
      />
    </q-dialog>

    <q-dialog v-model="dialogMover" class="glass-dialog-form">
      <QuickMoveForm
        v-if="loteSeleccionado"
        :lote-prop="loteSeleccionado"
        @close="dialogMover = false"
      />
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from 'stores/data-store'
import { useQuasar } from 'quasar'

import QuickEvaluateForm from 'src/components/QuickEvaluateForm.vue'
import QuickMoveForm from 'src/components/QuickMoveForm.vue'

const router = useRouter()
const dataStore = useDataStore()
const $q = useQuasar()

const loading = reactive({ lotes: true, guardar: false })
const filtro = ref('')
const fechaHoy = new Date().toISOString().split('T')[0]

// --- Paginación ---
const page = ref(1)
const pageSize = 6

// --- Estado Diálogos ---
const showDialog = ref(false)
const modoEdicion = ref(false)
const getFormVacio = () => ({
  id: null,
  identificacion: '',
  objetivo: null,
  cantidad_animales: null,
  peso_ingreso_kg: null,
  fecha_evaluacion: fechaHoy,
})
const formLote = reactive(getFormVacio())

const dialogEvaluar = ref(false)
const dialogMover = ref(false)
const loteSeleccionado = ref(null)

// --- KPIs ---
const kpiResumen = computed(() => {
  const lotes = dataStore.lotes || []
  const totalCabezas = lotes.reduce((sum, l) => sum + (l.cantidad_animales || 0), 0)
  const enCorral = lotes.filter((l) => !l.potrero_actual_id).length

  // Categoría Dominante
  const counts = {}
  lotes.forEach((l) => {
    const cat = l.objetivo || 'Otros'
    counts[cat] = (counts[cat] || 0) + (l.cantidad_animales || 0)
  })
  let maxCat = 'N/A'
  let maxVal = 0
  for (const [cat, val] of Object.entries(counts)) {
    if (val > maxVal) {
      maxVal = val
      maxCat = cat
    }
  }

  return {
    totalLotes: lotes.length,
    totalCabezas,
    categoriaDominante: maxCat,
    enCorral,
  }
})

// --- HELPERS VISUALES (Paleta Nutrogan) ---

function getLoteIconPath(lote) {
  const objetivo = lote.objetivo ? String(lote.objetivo).toLowerCase() : 'default'
  let iconName = 'default'

  if (objetivo.includes('cría') || objetivo.includes('cria')) iconName = 'cria'
  else if (objetivo.includes('recría') || objetivo.includes('recria')) iconName = 'recria'
  else if (objetivo.includes('engorde')) iconName = 'engorde'

  return `/icons/${iconName}.svg`
}

// Colores Oficiales: Verde Neón, Cian, Azul
function getObjetivoColorHex(objetivo) {
  if (!objetivo) return '#ffffff'
  const obj = objetivo.toLowerCase()
  if (obj.includes('engorde')) return '#39ff14' // Verde Neón (Crecimiento)
  if (obj.includes('recría') || obj.includes('recria')) return '#00e5ff' // Cian (Transición)
  if (obj.includes('cría') || obj.includes('cria')) return '#0037ff' // Azul Eléctrico (Base)
  return '#ffffff'
}

function getBorderClass(objetivo) {
  if (!objetivo) return 'border-white-card'
  const obj = objetivo.toLowerCase()
  if (obj.includes('engorde')) return 'border-neon-card'
  if (obj.includes('recría') || obj.includes('recria')) return 'border-cyan-card'
  if (obj.includes('cría') || obj.includes('cria')) return 'border-blue-card'
  return 'border-white-card'
}

function getUbicacion(lote) {
  if (lote.potrero_actual_id) {
    return dataStore.getPotreroById(lote.potrero_actual_id)?.nombre || 'Potrero Desconocido'
  }
  return 'En Corral'
}

// --- LOGICA DE NEGOCIO ---

onMounted(async () => {
  loading.lotes = true
  if (dataStore.lotes.length === 0) await dataStore.fetchLotes()
  if (dataStore.potreros.length === 0) await dataStore.fetchPotreros()
  loading.lotes = false
})

const lotesFiltrados = computed(() => {
  if (!filtro.value) return dataStore.lotes
  const f = filtro.value.toLowerCase()
  return dataStore.lotes.filter(
    (l) =>
      l.identificacion.toLowerCase().includes(f) ||
      (l.objetivo && l.objetivo.toLowerCase().includes(f)),
  )
})

const totalPages = computed(() => Math.ceil(lotesFiltrados.value.length / pageSize))
const lotesPaginados = computed(() => {
  const start = (page.value - 1) * pageSize
  return lotesFiltrados.value.slice(start, start + pageSize)
})

watch(filtro, () => (page.value = 1))

// --- ACCIONES CRUD ---

function verDetalleLote(loteId) {
  router.push(`/lote/${loteId}`)
}

function abrirDialogoNuevo() {
  resetForm()
  showDialog.value = true
}

function editarLote(lote) {
  loteSeleccionado.value = lote
  resetForm()
  modoEdicion.value = true
  Object.assign(formLote, {
    id: lote.id,
    identificacion: lote.identificacion,
    objetivo: lote.objetivo,
    cantidad_animales: lote.cantidad_animales,
    peso_ingreso_kg: lote.peso_ingreso_kg,
    fecha_evaluacion: null,
  })
  showDialog.value = true
}

function resetForm() {
  Object.assign(formLote, getFormVacio())
  modoEdicion.value = false
}

async function guardarLote() {
  loading.guardar = true
  try {
    const datosLote = {
      identificacion: formLote.identificacion,
      objetivo: formLote.objetivo,
      cantidad_animales: formLote.cantidad_animales,
      peso_ingreso_kg: formLote.peso_ingreso_kg,
      activo: true,
    }

    if (modoEdicion.value) {
      await dataStore.updateRegistro('lotes', formLote.id, datosLote)
      $q.notify({ type: 'positive', message: 'Lote actualizado' })
    } else {
      const nuevoLote = await dataStore.createRegistro('lotes', datosLote)
      const evaluacionInicial = {
        lote_id: nuevoLote.id,
        fecha_evaluacion: formLote.fecha_evaluacion,
        peso_promedio_kg: formLote.peso_ingreso_kg,
        observaciones: 'Evaluación inicial de ingreso',
      }
      await dataStore.createRegistro('evaluaciones', evaluacionInicial)
      $q.notify({ type: 'positive', message: 'Lote creado exitosamente' })
    }
    showDialog.value = false
    resetForm()
  } catch (error) {
    $q.notify({ color: 'negative', message: error.message })
  } finally {
    loading.guardar = false
  }
}

function confirmarEliminar(lote) {
  $q.dialog({
    title: 'Confirmar Desactivación',
    message: `¿Desactivar el lote "${lote.identificacion}"?`,
    cancel: true,
    dark: true,
    class: 'glass-dialog-form',
  }).onOk(async () => {
    loading.lotes = true
    try {
      await dataStore.deactivateRegistro('lotes', lote.id)
      $q.notify({ type: 'positive', message: 'Lote desactivado' })
    } catch (error) {
      $q.notify({ color: 'negative', message: error.message })
    } finally {
      loading.lotes = false
    }
  })
}

// Acciones Rápidas
function abrirDialogoEvaluar(lote) {
  loteSeleccionado.value = lote
  dialogEvaluar.value = true
}
function abrirDialogoMover(lote) {
  loteSeleccionado.value = lote
  dialogMover.value = true
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

/* === ESTILO COPIADO DE RECURSOS PAGE === */
.page-title-box {
  background: #000000;
  color: #ffffff;
  border: 2px solid #ffffff;
  border-radius: 20px;
  padding: 8px 24px;
  display: inline-block;
  font-family: 'Outfit', sans-serif;
  font-size: 2rem;
  font-weight: 700;
}

/* RESPONSIVE MOBILE TWEAKS */
@media (max-width: 600px) {
  .page-title-box {
    font-size: 1.5rem; /* Título más pequeño en móvil */
    padding: 6px 16px;
  }
  .full-width-mobile {
    width: 100%; /* Botones ancho completo en móvil */
  }
  .mobile-center-btn {
    text-align: center !important; /* Centrar botón en móvil */
  }
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

/* Lote Cards */
.lote-card {
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

/* Bordes Dinámicos */
.border-neon-card {
  border-left: 3px solid #39ff14;
}
.border-cyan-card {
  border-left: 3px solid #00e5ff;
}
.border-blue-card {
  border-left: 3px solid #0037ff;
}
.border-white-card {
  border-left: 3px solid #ffffff;
}

/* Iconos Mask */
.lote-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.lote-icon-shape {
  width: 32px;
  height: 32px;
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
  }
}

/* Utils */
.font-mono {
  font-family: 'Fira Code', monospace;
}
.font-numeric {
  font-family: 'Outfit', sans-serif;
}
.font-outfit {
  font-family: 'Outfit', sans-serif;
}
.text-glow {
  text-shadow: 0 0 15px rgba(57, 255, 20, 0.4);
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
.bg-dark-header {
  background: #050505;
}

/* Inputs y Buscador */
.glass-input :deep(.q-field__control) {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(5px);
  border-radius: 8px;
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
</style>
