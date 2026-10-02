<template>
  <q-page class="field-page bg-white text-black">
    <div
      class="field-sub-header q-px-md q-py-sm row items-center justify-between sticky-top"
      style="z-index: 50"
    >
      <div class="row items-center">
        <q-icon name="agriculture" size="2em" class="q-mr-sm text-black" />
        <div class="column">
          <div class="text-h6 text-weight-bold leading-none">{{ getTitle }}</div>
          <div class="text-caption text-grey-8" v-if="currentView === 'menu'">
            {{ dataStore.establecimientoActual?.nombre || 'Establecimiento' }}
          </div>
        </div>
      </div>
      <q-btn
        v-if="currentView !== 'menu'"
        flat
        dense
        round
        icon="arrow_back"
        color="black"
        size="lg"
        @click="volverMenu"
      />
    </div>

    <div v-if="currentView === 'menu'" class="q-pa-md q-pb-xl">
      <div
        v-if="authStore.canViewDecisions && pastureWarnings.length"
        class="pasture-banner q-mb-md q-pa-md"
        style="border: 3px solid #c62828; background: #ffebee"
      >
        <div class="text-weight-bolder text-negative q-mb-xs">
          PASTURA BAJA ({{ pastureWarnings.length }})
        </div>
        <div
          v-for="w in pastureWarnings.slice(0, 3)"
          :key="w.id"
          class="text-body2 text-grey-9 q-mb-xs"
        >
          {{ w.title }} — {{ w.message }}
        </div>
      </div>

      <div class="text-h6 text-weight-bolder q-mb-md q-mt-sm text-center text-grey-9">
        PANEL DE ACCIONES
      </div>

      <div class="row q-col-gutter-md">
        <div class="col-6 col-md-4">
          <button class="industrial-btn bg-white full-width" @click="iniciarFlujo('mover_lote')">
            <q-icon name="sync_alt" size="3em" class="q-mb-xs" />
            <span class="btn-label">MOVER</span>
          </button>
        </div>
        <div class="col-6 col-md-4">
          <button class="industrial-btn bg-white full-width" @click="iniciarFlujo('evaluacion')">
            <q-icon name="straighten" size="3em" class="q-mb-xs" />
            <span class="btn-label">PESAR</span>
          </button>
        </div>

        <div class="col-6 col-md-4">
          <button
            class="industrial-btn bg-white full-width"
            @click="iniciarFlujo('evento_sanitario')"
          >
            <q-icon name="vaccines" size="3em" class="q-mb-xs" />
            <span class="btn-label">SANIDAD</span>
          </button>
        </div>
        <div class="col-6 col-md-4">
          <button class="industrial-btn bg-white full-width" @click="iniciarFlujo('consumo')">
            <q-icon name="inventory_2" size="3em" class="q-mb-xs" />
            <span class="btn-label">DESPENSA</span>
          </button>
        </div>

        <div class="col-6 col-md-4">
          <button class="industrial-btn bg-white full-width" @click="iniciarFlujo('lluvia')">
            <q-icon name="thunderstorm" size="3em" class="q-mb-xs" />
            <span class="btn-label">LLUVIA</span>
          </button>
        </div>

        <div class="col-6 col-md-4">
          <button class="industrial-btn bg-white full-width" @click="iniciarFlujo('scan_cc')">
            <q-icon name="photo_camera" size="3em" class="q-mb-xs" />
            <span class="btn-label">VISIÓN</span>
          </button>
        </div>

        <div class="col-6 col-md-4">
          <button class="industrial-btn bg-white full-width" @click="iniciarFlujo('situacion')">
            <q-icon name="edit_note" size="3em" class="q-mb-xs" />
            <span class="btn-label">SITUACIÓN</span>
          </button>
        </div>

        <div v-if="authStore.canViewDecisions" class="col-6 col-md-4">
          <button class="industrial-btn bg-white full-width" @click="iniciarFlujo('decision')">
            <q-icon name="account_tree" size="3em" class="q-mb-xs" />
            <span class="btn-label">DECIDIR</span>
          </button>
        </div>

        <div class="col-6 col-md-4">
          <button class="industrial-btn bg-white full-width" @click="iniciarFlujo('analisis_agua')">
            <q-icon name="water_drop" size="3em" class="q-mb-xs" />
            <span class="btn-label">AGUA</span>
          </button>
        </div>
      </div>

      <div class="text-caption text-grey-7 q-mt-sm text-center" style="font-size: 0.7rem">
        AGUA: umbrales orientativos de campo — no sustituyen laboratorio.
      </div>

      <div style="height: 120px"></div>
    </div>

    <div v-if="currentView === 'decision'" class="q-pa-md">
      <DecisionLotePanel v-if="decisionCampo" :decision="decisionCampo" tone="light" @cargar="cargarDesdeCampo" />
    </div>

    <div v-if="currentView === 'situacion'" class="q-pa-md column q-gutter-md">
      <div class="text-h6 text-weight-bolder">{{ selectedLote?.identificacion }}</div>
      <q-select
        v-model="situacionAmbito"
        :options="ambitosCampo"
        emit-value
        map-options
        outlined
        label="De qué se trata"
      />
      <q-input v-model="situacionTipo" outlined label="Tipo (escribí el que haga falta)" />
      <q-input v-model="situacionDetalle" outlined type="textarea" label="Qué pasó" />
      <q-toggle v-model="situacionRevision" label="Pedir revisión en la decisión" />
      <q-btn
        unelevated
        color="black"
        text-color="white"
        label="GUARDAR"
        :disable="!situacionTipo.trim()"
        @click="guardarSituacionCampo"
      />
    </div>

    <div v-if="esVistaLista" class="column q-pb-xl">
      <div v-if="currentView === 'select_lote'">
        <q-item
          v-for="lote in dataStore.lotes"
          :key="lote.id"
          clickable
          v-ripple
          class="lote-item-giant"
          :class="{ 'item-active': selectedLote?.id === lote.id }"
          @click="seleccionarLote(lote)"
        >
          <q-item-section>
            <q-item-label class="text-h5 text-weight-bolder text-black">{{
              lote.identificacion
            }}</q-item-label>
            <q-item-label class="text-subtitle1 text-grey-8"
              >{{ lote.cantidad_animales }} cabezas</q-item-label
            >
          </q-item-section>
          <q-item-section side>
            <q-icon name="chevron_right" size="3em" color="black" />
          </q-item-section>
        </q-item>
      </div>

      <div v-if="currentView === 'select_destino'">
        <q-item
          v-for="potrero in dataStore.potreros"
          :key="potrero.id"
          clickable
          v-ripple
          class="lote-item-giant"
          @click="confirmarMovimiento(potrero)"
        >
          <q-item-section avatar><q-icon name="fence" size="3em" color="black" /></q-item-section>
          <q-item-section>
            <q-item-label class="text-h5 text-weight-bolder text-black">{{
              potrero.nombre
            }}</q-item-label>
            <q-item-label class="text-subtitle1 text-grey-8"
              >{{ potrero.superficie_ha || 0 }} ha</q-item-label
            >
          </q-item-section>
        </q-item>
      </div>

      <div v-if="currentView === 'select_item'">
        <q-item
          v-for="item in dataStore.inventarioItems"
          :key="item.id"
          clickable
          v-ripple
          class="lote-item-giant"
          @click="seleccionarItem(item)"
        >
          <q-item-section>
            <q-item-label class="text-h5 text-weight-bolder text-black">{{
              item.nombre
            }}</q-item-label>
            <q-item-label class="text-subtitle1 text-grey-8"
              >Stock: {{ item.stock_actual }} {{ item.unidad }}</q-item-label
            >
          </q-item-section>
        </q-item>
      </div>

      <div v-if="currentView === 'select_fuente'">
        <div
          v-if="!(dataStore.fuentesAgua || []).length"
          class="q-pa-lg text-center text-grey-8 text-h6"
        >
          No hay fuentes de agua cargadas. Crealas en el módulo Agua (escritorio).
        </div>
        <q-item
          v-for="fuente in dataStore.fuentesAgua"
          :key="fuente.id"
          clickable
          v-ripple
          class="lote-item-giant"
          @click="seleccionarFuente(fuente)"
        >
          <q-item-section avatar>
            <q-icon name="water_drop" size="3em" color="black" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-h5 text-weight-bolder text-black">{{
              fuente.nombre
            }}</q-item-label>
            <q-item-label class="text-subtitle1 text-grey-8">
              Estado: {{ fuente.ultimo_estado || 'Sin análisis' }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </div>

      <div v-if="currentView === 'select_option'" class="q-pa-md">
        <button
          v-for="opt in currentOptions"
          :key="opt"
          class="industrial-btn bg-white full-width text-left q-mb-md"
          style="flex-direction: row; justify-content: flex-start; padding: 20px; min-height: 80px"
          @click="confirmarEventoSimple(opt)"
        >
          <q-icon name="radio_button_unchecked" size="2em" class="q-mr-md text-black" />
          <span class="text-h6 text-weight-bold text-black">{{ opt }}</span>
        </button>
        <button
          class="industrial-btn bg-white full-width text-left q-mb-md"
          style="flex-direction: row; justify-content: flex-start; padding: 20px; min-height: 80px"
          @click="abrirSituacionLibre"
        >
          <q-icon name="edit" size="2em" class="q-mr-md text-black" />
          <span class="text-h6 text-weight-bold text-black">OTRO TIPO</span>
        </button>
      </div>
      <div style="height: 120px"></div>
    </div>

    <div
      v-if="currentView === 'numpad'"
      class="column flex-center q-pa-md"
      style="min-height: 80vh"
    >
      <div class="full-width text-right q-mb-lg border-bottom-thick q-pb-sm">
        <div class="text-h6 text-grey-8">{{ numpadLabel }}</div>
        <div class="text-h2 text-weight-bolder text-black">
          {{ numpadValue || '0' }} <span class="text-h4 text-grey-6">{{ numpadUnit }}</span>
        </div>
      </div>

      <div class="row q-col-gutter-sm full-width" style="max-width: 500px">
        <div class="col-4" v-for="n in [1, 2, 3, 4, 5, 6, 7, 8, 9]" :key="n">
          <button class="numpad-btn bg-white text-black" @click="addNum(n)">{{ n }}</button>
        </div>
        <div class="col-4">
          <button class="numpad-btn bg-white text-black" @click="addNum('.')">.</button>
        </div>
        <div class="col-4">
          <button class="numpad-btn bg-white text-black" @click="addNum(0)">0</button>
        </div>
        <div class="col-4">
          <button class="numpad-btn bg-red-1 text-red-9" @click="delNum()">
            <q-icon name="backspace" />
          </button>
        </div>
      </div>

      <div class="full-width q-mt-xl" style="max-width: 500px">
        <button class="btn-save-giant full-width text-black" @click="confirmarNumpad">
          GUARDAR
        </button>
      </div>
    </div>

    <div
      v-if="currentView === 'camera'"
      class="fixed-full bg-black text-white column flex-center"
      style="z-index: 9999"
    >
      <video
        ref="videoRef"
        autoplay
        playsinline
        class="absolute-full fit object-cover"
        style="z-index: 0"
      ></video>

      <div class="absolute-full flex flex-center" style="z-index: 2; pointer-events: none">
        <div class="viewfinder"></div>
      </div>

      <div
        class="absolute-bottom column items-center q-pb-xl"
        style="width: 100%; z-index: 10; pointer-events: auto"
      >
        <button
          class="shutter-btn-contrast q-mb-lg"
          @click.stop.prevent="capturarFotoReal"
        ></button>
        <q-btn flat color="white" label="CANCELAR" icon="close" size="lg" @click="cerrarCamara" />
      </div>
    </div>

    <q-dialog v-model="showResultDialog" persistent transition-show="scale" transition-hide="scale">
      <q-card
        class="bg-white text-black cc-result-card"
        style="min-width: 350px; border: 4px solid black"
      >
        <q-card-section class="bg-black text-white text-center q-py-md">
          <div class="text-h5 text-weight-bold">CC · ESCALA INTA</div>
          <div class="text-caption text-grey-4">Registro manual 1–9 (Argentina)</div>
        </q-card-section>

        <q-card-section class="q-pa-lg text-center">
          <div class="text-subtitle1 text-grey-8 q-mb-sm text-weight-bold">
            CONDICIÓN CORPORAL
          </div>

          <div class="row justify-center items-center q-gutter-x-md">
            <q-btn
              push
              round
              icon="remove"
              size="xl"
              color="red"
              text-color="white"
              @click="ajustarCC(-0.5)"
            />

            <div class="text-h1 text-weight-bolder text-black" style="min-width: 120px">
              {{ formatCcInta(ccResult) }}
            </div>

            <q-btn
              push
              round
              icon="add"
              size="xl"
              color="green"
              text-color="white"
              @click="ajustarCC(0.5)"
            />
          </div>

          <div class="text-body2 text-grey-7 q-mt-md" style="min-height: 2.5em">
            {{ describeCcInta(ccResult) }}
          </div>
        </q-card-section>

        <q-card-actions align="center" class="q-pa-md bg-grey-2">
          <button
            class="industrial-btn bg-green-13 text-black q-px-xl full-width"
            style="font-size: 1.5rem; height: 70px"
            @click="guardarCC"
          >
            CONFIRMAR
          </button>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useDataStore } from 'stores/data-store'
import { useAuthStore } from 'stores/auth-store'
import { syncService } from 'src/services/SyncService'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import {
  CC_INTA_DEFAULT,
  clampCcInta,
  describeCcInta,
  formatCcInta,
} from 'src/utils/ccInta'
import { fieldPastureWarnings } from 'src/utils/operationalAlerts'
import { calcularCalidadAgua } from 'src/utils/waterQuality'
import { AMBITOS_SITUACION, decisionDesdeContexto } from 'src/utils/decisionLote'
import DecisionLotePanel from 'src/components/decision/DecisionLotePanel.vue'

const dataStore = useDataStore()
const authStore = useAuthStore()
const router = useRouter()
const $q = useQuasar()

// Estados UI
const currentView = ref('menu')
const currentFlow = ref(null)
const selectedLote = ref(null)
const situacionTipo = ref('')
const situacionDetalle = ref('')
const situacionAmbito = ref('otro')
const situacionRevision = ref(false)
const ambitosCampo = AMBITOS_SITUACION
const selectedItem = ref(null)
const selectedFuente = ref(null)
const aguaPh = ref(null)
const aguaStep = ref('ph') // ph | tds
const comidaPaso = ref('puesto')
const comidaPuesta = ref(null)
const numpadValue = ref('')
const numpadLabel = ref('')
const numpadUnit = ref('')
const currentOptions = ref([])
const pendientes = ref(0)

// Estados para Cámara y CC
const videoRef = ref(null)
const stream = ref(null)
const procesandoFoto = ref(false)
const showResultDialog = ref(false)
const ccResult = ref(CC_INTA_DEFAULT)

const pastureWarnings = computed(() =>
  fieldPastureWarnings(dataStore.potreros || [], dataStore.lotes || []),
)

const decisionCampo = computed(() => {
  if (!selectedLote.value) return null
  return decisionDesdeContexto(selectedLote.value, {
    lotes: dataStore.lotes || [],
    potreros: dataStore.potreros || [],
    evaluaciones: dataStore.evaluaciones || [],
    movimientos: dataStore.movimientos || [],
    registrosLluvia: dataStore.registrosLluvia || [],
    fuentesAgua: dataStore.fuentesAgua || [],
    registrosVision: dataStore.registrosVision || [],
    inventarioMovimientos: dataStore.inventarioMovimientos || [],
    eventosReproductivos: dataStore.eventosReproductivos || [],
    situaciones: dataStore.situaciones || [],
    lecturasNdvi: dataStore.lecturasNdvi || [],
    lluviaEstimada: dataStore.lluviaEstimada || {},
    precioKg: dataStore.marketPrice?.value,
  })
})

// Helpers Vista
const esVistaLista = computed(() =>
  ['select_lote', 'select_destino', 'select_item', 'select_option', 'select_fuente'].includes(
    currentView.value,
  ),
)
const getTitle = computed(() => {
  if (currentView.value === 'menu') return 'PANEL DE CONTROL'
  if (currentView.value === 'select_lote') return 'SELECCIONAR LOTE'
  if (currentView.value === 'select_destino') return 'DESTINO'
  if (currentView.value === 'select_item') return 'INSUMO'
  if (currentView.value === 'select_fuente') return 'FUENTE DE AGUA'
  if (currentView.value === 'numpad') return 'INGRESAR DATO'
  if (currentView.value === 'decision') return 'QUÉ DECIDIR'
  if (currentView.value === 'situacion') return 'SITUACIÓN'
  return 'MODO CAMPO'
})

// Navegación
function volverMenu() {
  stopCamera()
  currentView.value = 'menu'
  currentFlow.value = null
  selectedLote.value = null
  selectedFuente.value = null
  aguaPh.value = null
  aguaStep.value = 'ph'
  comidaPaso.value = 'puesto'
  comidaPuesta.value = null
}

function iniciarFlujo(flujo) {
  currentFlow.value = flujo
  selectedLote.value = null
  selectedFuente.value = null
  aguaPh.value = null
  aguaStep.value = 'ph'
  comidaPaso.value = 'puesto'
  comidaPuesta.value = null
  numpadValue.value = ''

  if (flujo === 'lluvia') {
    configNumpad('REGISTRO DE LLUVIA', 'mm')
    currentView.value = 'numpad'
  } else if (flujo === 'analisis_agua') {
    currentView.value = 'select_fuente'
  } else {
    currentView.value = 'select_lote'
  }
}

function seleccionarFuente(fuente) {
  selectedFuente.value = fuente
  aguaStep.value = 'ph'
  configNumpad(`pH — ${fuente.nombre}`, 'pH')
  currentView.value = 'numpad'
}

function seleccionarLote(lote) {
  selectedLote.value = lote
  if (currentFlow.value === 'mover_lote') currentView.value = 'select_destino'
  else if (currentFlow.value === 'evaluacion') {
    configNumpad(`PESO: ${lote.identificacion}`, 'KG')
    currentView.value = 'numpad'
  } else if (currentFlow.value === 'scan_cc') {
    router.push(`/lote/${lote.id}/scan_cc`)
  } else if (currentFlow.value === 'decision') {
    currentView.value = 'decision'
  } else if (currentFlow.value === 'situacion') {
    situacionTipo.value = ''
    situacionDetalle.value = ''
    situacionRevision.value = false
    currentView.value = 'situacion'
  } else if (currentFlow.value === 'consumo') {
    currentView.value = 'select_item'
  } else if (currentFlow.value === 'evento_sanitario') {
    currentOptions.value = ['Vacunación', 'Desparasitación', 'Tratamiento', 'Otro']
    currentView.value = 'select_option'
  } else if (currentFlow.value === 'evento_reproductivo') {
    currentOptions.value = ['Servicio', 'Tacto (Preñada)', 'Tacto (Vacía)', 'Parto', 'Aborto']
    currentView.value = 'select_option'
  }
}

function seleccionarItem(item) {
  selectedItem.value = item
  comidaPaso.value = 'puesto'
  comidaPuesta.value = null
  configNumpad(`CUÁNTO SE PUSO: ${item.nombre}`, item.unidad)
  currentView.value = 'numpad'
}

function configNumpad(label, unit) {
  numpadLabel.value = label
  numpadUnit.value = unit
  numpadValue.value = ''
}

// --- LÓGICA DE CÁMARA ---
async function startCamera() {
  currentView.value = 'camera'
  procesandoFoto.value = false
  await nextTick()

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    $q.notify({ type: 'negative', message: 'Cámara no soportada' })
    return
  }

  try {
    const constraints = {
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    }
    stream.value = await navigator.mediaDevices.getUserMedia(constraints)
    if (videoRef.value) videoRef.value.srcObject = stream.value
  } catch (err) {
    console.warn('Fallo cámara avanzada, reintentando básica...', err)
    try {
      stream.value = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.value) videoRef.value.srcObject = stream.value
    } catch {
      volverMenu()
    }
  }
}

function stopCamera() {
  if (stream.value) {
    stream.value.getTracks().forEach((track) => track.stop())
    stream.value = null
  }
}

function cerrarCamara() {
  stopCamera()
  currentView.value = 'select_lote'
}

function capturarFotoReal() {
  // La cámara queda como apoyo visual opcional; el CC se carga a mano (INTA).
  stopCamera()
  currentView.value = 'menu'
  procesandoFoto.value = false
  ccResult.value = CC_INTA_DEFAULT
  showResultDialog.value = true
}

function ajustarCC(delta) {
  ccResult.value = clampCcInta(ccResult.value + delta)
}

async function guardarCC() {
  showResultDialog.value = false
  const cc = clampCcInta(ccResult.value)
  await syncService.addAction('evaluacion', {
    lote_id: selectedLote.value.id,
    fecha_evaluacion: new Date().toISOString().split('T')[0],
    peso_promedio_kg: null,
    condicion_corporal: cc,
    observaciones: `CC INTA ${formatCcInta(cc)} — ${describeCcInta(cc)}`,
  })
  notificarExito(`CC INTA GUARDADA: ${formatCcInta(cc)}`)
  volverMenu()
}

// Acciones Finales
async function confirmarMovimiento(potrero) {
  await syncService.addAction('mover_lote', {
    lote_id: selectedLote.value.id,
    potrero_id: potrero.id,
    fecha_entrada: new Date().toISOString().split('T')[0],
  })
  notificarExito(`LOTE MOVIDO A ${potrero.nombre}`)
  volverMenu()
}

function cargarDesdeCampo(id) {
  if (!selectedLote.value) return
  if (id === 'pesos') {
    currentFlow.value = 'evaluacion'
    configNumpad(`PESO: ${selectedLote.value.identificacion}`, 'KG')
    currentView.value = 'numpad'
  } else if (id === 'condicion' || id === 'sanidad') {
    router.push(`/lote/${selectedLote.value.id}/scan_cc`)
  } else if (id === 'ocupacion') {
    currentFlow.value = 'lluvia'
    configNumpad('REGISTRO DE LLUVIA', 'mm')
    currentView.value = 'numpad'
  } else if (id === 'agua') {
    currentFlow.value = 'analisis_agua'
    currentView.value = 'select_fuente'
  } else if (id === 'comida') {
    currentFlow.value = 'consumo'
    currentView.value = 'select_item'
  } else if (id === 'carga') {
    currentFlow.value = 'mover_lote'
    currentView.value = 'select_destino'
  } else if (id === 'situacion') {
    currentFlow.value = 'situacion'
    currentView.value = 'situacion'
  }
}

function abrirSituacionLibre() {
  situacionAmbito.value = currentFlow.value === 'evento_sanitario' ? 'sanidad' : 'hacienda'
  situacionTipo.value = ''
  situacionDetalle.value = ''
  situacionRevision.value = true
  currentView.value = 'situacion'
}

async function guardarSituacionCampo() {
  const tipo = situacionTipo.value.trim()
  if (!tipo || !selectedLote.value) return
  await syncService.addAction('situacion', {
    lote_id: selectedLote.value.id,
    fecha: new Date().toISOString().split('T')[0],
    ambito: situacionAmbito.value || 'otro',
    tipo,
    detalle: situacionDetalle.value.trim() || null,
    pedir_revision: !!situacionRevision.value,
  })
  notificarExito('SITUACIÓN GUARDADA')
  volverMenu()
}

async function confirmarNumpad() {
  const sobraSinTocar = currentFlow.value === 'consumo' && comidaPaso.value === 'sobra' && !numpadValue.value
  if (!numpadValue.value && !sobraSinTocar) return
  const val = sobraSinTocar ? 0 : parseFloat(numpadValue.value)

  if (currentFlow.value === 'evaluacion') {
    await syncService.addAction('evaluacion', {
      lote_id: selectedLote.value.id,
      fecha_evaluacion: new Date().toISOString().split('T')[0],
      peso_promedio_kg: val,
      condicion_corporal: null,
    })
    notificarExito(`PESO GUARDADO: ${val} KG`)
  } else if (currentFlow.value === 'lluvia') {
    await syncService.addAction('lluvia', {
      fecha: new Date().toISOString().split('T')[0],
      milimetros: val,
    })
    notificarExito(`LLUVIA: ${val} mm`)
  } else if (currentFlow.value === 'consumo') {
    if (comidaPaso.value === 'puesto') {
      if (!(val > 0)) {
        $q.notify({ type: 'warning', message: 'Anotá cuánto se puso', position: 'center' })
        return
      }
      comidaPuesta.value = val
      comidaPaso.value = 'sobra'
      numpadValue.value = ''
      configNumpad(`CUÁNTO SOBRÓ: ${selectedItem.value.nombre}`, selectedItem.value.unidad)
      return
    }
    const sobro = numpadValue.value === '' ? 0 : val
    if (!(sobro >= 0) || sobro > comidaPuesta.value) {
      $q.notify({ type: 'warning', message: 'No puede sobrar más de lo que se puso', position: 'center' })
      return
    }
    const comido = comidaPuesta.value - sobro
    await syncService.addAction('consumo', {
      p_item_id: selectedItem.value.id,
      p_lote_id: selectedLote.value?.id || null,
      p_cantidad: -comido,
      p_tipo_movimiento: 'Uso',
      p_cantidad_puesta: comidaPuesta.value,
      p_cantidad_sobrante: sobro,
      p_observaciones: `Se pusieron ${comidaPuesta.value} y sobraron ${sobro}.`,
    })
    notificarExito(sobro > 0 ? `COMIDO ${comido}. SOBRÓ ${sobro}` : `COMIDO ${comido}`)
  } else if (currentFlow.value === 'analisis_agua') {
    if (aguaStep.value === 'ph') {
      if (!(val >= 0 && val <= 14)) {
        $q.notify({ type: 'warning', message: 'pH entre 0 y 14', position: 'center' })
        return
      }
      aguaPh.value = val
      aguaStep.value = 'tds'
      configNumpad(`TDS — ${selectedFuente.value.nombre}`, 'ppm')
      return
    }
    const payload = {
      fuente_id: selectedFuente.value.id,
      fecha_analisis: new Date().toISOString().split('T')[0],
      ph: aguaPh.value,
      solidos_totales: val,
      nitratos: 0,
      arsenico: 0,
      observaciones: 'Registro rápido modo campo (pH + TDS)',
    }
    const { estado } = calcularCalidadAgua(payload)
    await syncService.addAction('analisis_agua', payload)
    notificarExito(`AGUA: ${estado}`)
  }
  volverMenu()
}

async function confirmarEventoSimple(opt) {
  const tipoAccion =
    currentFlow.value === 'evento_sanitario' ? 'evento_sanitario' : 'evento_reproductivo'
  await syncService.addAction(tipoAccion, {
    lote_id: selectedLote.value.id,
    fecha: new Date().toISOString().split('T')[0],
    tipo_evento: opt,
  })
  notificarExito(`${opt} REGISTRADO`)
  volverMenu()
}

function addNum(n) {
  numpadValue.value += n
}
function delNum() {
  numpadValue.value = numpadValue.value.slice(0, -1)
}

function notificarExito(msg) {
  $q.notify({
    message: msg,
    position: 'center',
    timeout: 1500,
    classes: 'field-notify-success-industrial',
  })
}

const updatePendientes = () => {
  pendientes.value = syncService.getPendingCount()
}

onMounted(() => {
  window.addEventListener('queue-updated', updatePendientes)
  updatePendientes()
  if (navigator.onLine) dataStore.fetchAll()
})

onUnmounted(() => {
  stopCamera()
  window.removeEventListener('queue-updated', updatePendientes)
})
</script>

<style lang="scss" scoped>
.field-page {
  background-color: #ffffff;
  min-height: 100vh;
}

/* Header Pegajoso */
.sticky-top {
  position: sticky;
  top: 0;
  z-index: 1000;
  background-color: #ffffff;
}

.border-bottom-thick {
  border-bottom: 4px solid #000;
}

/* Botones Industriales */
.industrial-btn {
  border: 3px solid #000000;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 4px 4px 0px #000;
  /* Altura reducida para que quepan mejor en 2 filas */
  min-height: 110px;
  margin-bottom: 8px;
  transition: all 0.1s;
  cursor: pointer;

  &:active {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0px #000;
    background-color: #39ff14 !important;
  }
}

.btn-label {
  font-size: 1rem;
  font-weight: 900;
  margin-top: 5px;
  text-transform: uppercase;
  color: #000;
  text-align: center;
}

/* Items Gigantes para lista */
.lote-item-giant {
  padding: 15px 15px; /* Padding reducido */
  min-height: 80px;
  border-bottom: 1px solid #ddd;
}

/* Botón Guardar Gigante */
.btn-save-giant {
  border: 3px solid #000;
  background-color: #39ff14;
  font-size: 1.5rem;
  font-weight: 900;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 5px 5px 0 #000;
  &:active {
    transform: translate(3px, 3px);
    box-shadow: 0 0 0 #000;
  }
}

/* Numpad Gigante */
.numpad-btn {
  width: 100%;
  height: 70px;
  font-size: 2.5rem;
  font-weight: bold;
  border: 2px solid #000;
  border-radius: 8px;
  color: #000;
  margin-bottom: 8px;
  &:active {
    background-color: #000 !important;
    color: #fff !important;
  }
}

/* Botón de Cámara */
.shutter-btn-contrast {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background-color: white;
  border: 6px solid #000;
  box-shadow: 0 0 0 4px #ffffff;
  cursor: pointer;
  transition: transform 0.1s;
  &:active {
    background-color: #39ff14;
    transform: scale(0.95);
  }
}

/* Visor de Cámara */
.viewfinder {
  width: 80%;
  height: 40%;
  border: 4px dashed rgba(255, 255, 255, 0.7);
  border-radius: 20px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5); /* Oscurece el resto */
}

.text-shadow {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}
.object-cover {
  object-fit: cover;
}

:deep(.field-notify-success-industrial) {
  background-color: #000 !important;
  color: #39ff14 !important;
  border: 4px solid #39ff14;
  font-size: 1.2rem;
  font-weight: 900;
  padding: 20px;
  min-width: 280px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}
</style>
