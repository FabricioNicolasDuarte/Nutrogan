<template>
  <q-page padding class="dashboard-pro-bg">
    <div v-if="loading.lote" class="text-center q-pa-xl">
      <q-spinner-dots color="white" size="3em" />
      <div class="text-caption text-white q-mt-md">Cargando datos del lote...</div>
    </div>

    <div v-if="dataStore.loteActual && !loading.lote" class="text-white">
      <div class="flex items-center">
        <q-btn flat round dense icon="arrow_back" @click="$router.back()" class="q-mr-sm" />
        <q-avatar square size="52px" color="transparent" class="q-mr-md">
          <q-img :src="getLoteIconPath(dataStore.loteActual)" @error="onIconError" />
        </q-avatar>
        <div>
          <div class="text-h4">{{ dataStore.loteActual.identificacion }}</div>
          <div class="text-subtitle1">
            <q-badge :color="getObjetivoColor(dataStore.loteActual.objetivo)">
              {{ dataStore.loteActual.objetivo }}
            </q-badge>
            - {{ dataStore.loteActual.cantidad_animales }} animales
          </div>
        </div>
      </div>

      <DecisionLotePanel v-if="decision" class="q-mt-md" :decision="decision" @cargar="cargarDato" />

      <div class="row q-col-gutter-md q-mt-md">
        <div class="col-12 col-sm-6 col-md-6">
          <q-card flat class="kpi-card">
            <q-card-section>
              <div class="text-caption text-grey-4">Peso Prom. Actual</div>
              <div class="text-h6">{{ kpi_peso_actual }} kg</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-6 col-md-6">
          <q-card flat class="kpi-card">
            <q-card-section>
              <div class="text-caption text-grey-4">GDPV (kg/día)</div>
              <div class="text-h6">{{ kpi_gdpv }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <q-card class="q-mt-lg main-tabs-card">
        <q-tabs
          v-model="tab"
          dense
          class="text-grey-5"
          active-color="primary"
          indicator-color="primary"
          align="justify"
        >
          <q-tab name="evaluacion" label="Evaluación" icon="straighten" />
          <q-tab name="sanidad" label="Sanidad" icon="vaccines" />
          <q-tab name="vision" label="Visión" icon="photo_camera" />
          <q-tab name="reproduccion" label="Reproducción" icon="pets" />
          <q-tab name="consumo" label="Consumo" icon="restaurant" />
          <q-tab name="situacion" label="Situación" icon="edit_note" />
        </q-tabs>

        <q-separator dark />

        <q-tab-panels v-model="tab" animated class="bg-transparent text-white">
          <q-tab-panel name="evaluacion">
            <div class="flex justify-between items-center q-mb-md">
              <div class="text-h6">Historial de Evaluaciones</div>
              <q-btn
                label="Registrar Evaluación"
                color="primary"
                icon="add"
                @click="abrirDialogo('evaluacion')"
              />
            </div>
            <q-list bordered separator dark class="rounded-borders">
              <q-item v-if="dataStore.evaluaciones.length === 0" class="text-grey-6">
                <q-item-section class="text-center q-pa-md"
                  >Sin evaluaciones registradas.</q-item-section
                >
              </q-item>
              <q-item v-for="ev in dataStore.evaluaciones" :key="ev.id">
                <q-item-section avatar><q-icon color="primary" name="straighten" /></q-item-section>
                <q-item-section>
                  <q-item-label>{{ formatearFecha(ev.fecha_evaluacion) }}</q-item-label>
                  <q-item-label caption class="text-grey-4">{{
                    ev.observaciones || 'Sin obs.'
                  }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label class="text-weight-medium"
                    >Peso: {{ ev.peso_promedio_kg }} kg</q-item-label
                  >
                  <q-item-label caption class="text-grey-4"
                    >CC: {{ ev.condicion_corporal || 'N/A' }}</q-item-label
                  >
                </q-item-section>
              </q-item>
            </q-list>
          </q-tab-panel>

          <q-tab-panel name="sanidad">
            <div class="flex justify-between items-center q-mb-md">
              <div class="text-h6">Historial de Sanidad</div>
              <q-btn
                label="Registrar Evento"
                color="primary"
                icon="add"
                @click="abrirDialogo('sanidad')"
              />
            </div>
            <q-list bordered separator dark class="rounded-borders">
              <q-item v-if="dataStore.eventosSanitarios.length === 0" class="text-grey-6">
                <q-item-section class="text-center q-pa-md">Sin eventos sanitarios.</q-item-section>
              </q-item>
              <q-item v-for="ev in dataStore.eventosSanitarios" :key="ev.id">
                <q-item-section avatar><q-icon color="blue-4" name="vaccines" /></q-item-section>
                <q-item-section>
                  <q-item-label>{{ ev.tipo_evento }}</q-item-label>
                  <q-item-label caption class="text-grey-4">{{
                    ev.descripcion || 'Sin descripción'
                  }}</q-item-label>
                </q-item-section>
                <q-item-section side top>
                  <q-item-label caption class="text-grey-4">{{
                    formatearFecha(ev.fecha)
                  }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-tab-panel>

          <q-tab-panel name="vision">
            <div class="flex justify-between items-center q-mb-md">
              <div class="text-h6">Lecturas de visión</div>
              <q-btn
                label="Nueva lectura"
                color="primary"
                icon="photo_camera"
                :to="`/lote/${dataStore.loteActual.id}/scan_cc`"
              />
            </div>
            <q-list bordered separator dark class="rounded-borders">
              <q-item v-if="!visionDelLote.length" class="text-grey-6">
                <q-item-section class="text-center q-pa-md">Todavía no hay fotos confirmadas.</q-item-section>
              </q-item>
              <q-item v-for="row in visionDelLote" :key="row.id">
                <q-item-section avatar v-if="fotosVision[row.id]">
                  <q-img :src="fotosVision[row.id]" width="72px" height="72px" fit="contain" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ etiquetaVision(row.modo) }} · {{ formatearFecha(row.fecha) }}</q-item-label>
                  <q-item-label caption class="text-grey-4">{{ resumenVision(row) }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-tab-panel>

          <q-tab-panel name="reproduccion">
            <div class="flex justify-between items-center q-mb-md">
              <div class="text-h6">Historial Reproductivo</div>
              <q-btn
                label="Registrar Evento"
                color="primary"
                icon="add"
                @click="abrirDialogo('reproduccion')"
              />
            </div>
            <q-list bordered separator dark class="rounded-borders">
              <q-item v-if="dataStore.eventosReproductivos.length === 0" class="text-grey-6">
                <q-item-section class="text-center q-pa-md"
                  >Sin eventos reproductivos.</q-item-section
                >
              </q-item>
              <q-item v-for="ev in dataStore.eventosReproductivos" :key="ev.id">
                <q-item-section avatar><q-icon color="pink-4" name="pets" /></q-item-section>
                <q-item-section>
                  <q-item-label>{{ ev.tipo_evento }}</q-item-label>
                  <q-item-label caption class="text-grey-4">{{
                    ev.descripcion || 'Sin descripción'
                  }}</q-item-label>
                </q-item-section>
                <q-item-section side top>
                  <q-item-label caption class="text-grey-4">{{
                    formatearFecha(ev.fecha)
                  }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-tab-panel>

          <q-tab-panel name="consumo">
            <div class="text-h6 q-mb-sm">Lo que salió de la despensa</div>
            <q-list bordered separator dark class="rounded-borders q-mb-lg">
              <q-item v-if="comidasDelLote.length === 0" class="text-grey-6">
                <q-item-section class="text-center q-pa-md">
                  Todavía no hay una comida con puesto y sobrante.
                </q-item-section>
              </q-item>
              <q-item v-for="m in comidasDelLote" :key="m.id">
                <q-item-section>
                  <q-item-label>{{ m.inventario_items?.nombre || 'Insumo' }}</q-item-label>
                  <q-item-label caption class="text-grey-4">
                    Se pusieron {{ m.cantidad_puesta ?? '—' }} y sobraron {{ m.cantidad_sobrante ?? '—' }}.
                    Se descontaron {{ Math.abs(Number(m.cantidad) || 0) }}.
                  </q-item-label>
                </q-item-section>
                <q-item-section side top>
                  <q-item-label caption class="text-grey-4">{{ formatearFecha(m.fecha) }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
            <div class="flex justify-between items-center q-mb-md">
              <div class="text-h6">Plan de dieta</div>
              <q-btn
                label="Registrar Consumo"
                color="primary"
                icon="add"
                @click="abrirDialogo('consumo')"
              />
            </div>
            <q-list bordered separator dark class="rounded-borders">
              <q-item v-if="dataStore.consumos.length === 0" class="text-grey-6">
                <q-item-section class="text-center q-pa-md"
                  >Sin consumos registrados.</q-item-section
                >
              </q-item>
              <q-item v-for="c in dataStore.consumos" :key="c.id">
                <q-item-section avatar><q-icon color="green-4" name="restaurant" /></q-item-section>
                <q-item-section>
                  <q-item-label
                    >Dieta: {{ c.dietas?.nombre || c.alimentos?.nombre || 'N/A' }}</q-item-label
                  >
                  <q-item-label caption class="text-grey-4">
                    {{ formatearFecha(c.fecha_inicio) }} -
                    {{ c.fecha_fin ? formatearFecha(c.fecha_fin) : 'Actual' }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label class="text-weight-medium"
                    >${{ c.costo_total_periodo || 0 }}</q-item-label
                  >
                </q-item-section>
              </q-item>
            </q-list>
          </q-tab-panel>

          <q-tab-panel name="situacion">
            <div class="flex justify-between items-center q-mb-md">
              <div class="text-h6">Situaciones del lote</div>
              <q-btn label="Anotar situación" color="primary" icon="add" @click="abrirDialogo('situacion')" />
            </div>
            <p class="text-caption text-grey-4 q-mb-md">
              Cualquier hecho que los otros registros no cubren: destete, mortandad, barro, un tipo nuevo.
              Si pedís revisión, entra en la decisión y en las alertas. Si no, queda como contexto.
            </p>
            <q-list bordered separator dark class="rounded-borders">
              <q-item v-if="!situacionesDelLote.length" class="text-grey-6">
                <q-item-section class="text-center q-pa-md">Todavía no hay situaciones.</q-item-section>
              </q-item>
              <q-item v-for="row in situacionesDelLote" :key="row.id">
                <q-item-section>
                  <q-item-label>{{ row.tipo }} · {{ etiquetaAmbito(row.ambito) }}</q-item-label>
                  <q-item-label caption class="text-grey-4">{{ row.detalle || 'Sin detalle' }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-item-label caption>{{ formatearFecha(row.fecha) }}</q-item-label>
                  <q-item-label caption :class="row.pedir_revision ? 'text-orange-4' : 'text-grey-5'">
                    {{ row.pedir_revision ? 'Pide revisión' : 'Solo contexto' }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </div>

    <q-dialog v-model="dialogos.evaluacion" persistent>
      <q-card class="glass-dialog-form" style="width: 450px">
        <q-card-section>
          <div class="text-h6">Registrar Evaluación</div>
        </q-card-section>
        <q-form
          @submit.prevent="
            handleCreate('evaluaciones', newEvaluacion, resetEvaluacion, 'evaluacion')
          "
          class="q-gutter-md"
        >
          <q-card-section class="q-pt-none q-gutter-md">
            <q-input
              filled
              dark
              v-model="newEvaluacion.fecha_evaluacion"
              type="date"
              stack-label
              color="white"
              :rules="[(val) => !!val || 'Requerido']"
            />
            <q-input
              filled
              dark
              v-model.number="newEvaluacion.peso_promedio_kg"
              type="number"
              label="Peso Promedio (kg)"
              step="0.1"
              color="white"
              :rules="[(val) => (val !== null && val >= 0) || 'Requerido (puede ser 0)']"
            />
            <q-item-label header class="q-pl-none text-white"
              >Condición Corporal (CC) (1-9)</q-item-label
            >
            <q-rating
              v-model="newEvaluacion.condicion_corporal"
              max="9"
              size="2.5em"
              color="primary"
              icon="star_border"
              icon-selected="star"
            />
            <q-input
              filled
              dark
              v-model="newEvaluacion.observaciones"
              type="textarea"
              label="Observaciones"
              color="white"
            />
          </q-card-section>
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" v-close-popup />
            <q-btn label="Guardar" type="submit" color="primary" :loading="loading.guardar" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialogos.sanidad" persistent>
      <q-card class="glass-dialog-form" style="width: 450px">
        <q-card-section>
          <div class="text-h6">Registrar Evento Sanitario</div>
        </q-card-section>
        <q-form
          @submit.prevent="
            handleCreate('eventos_sanitarios', newSanitario, resetSanitario, 'sanidad')
          "
          class="q-gutter-md"
        >
          <q-card-section class="q-pt-none q-gutter-md">
            <q-input
              filled
              dark
              v-model="newSanitario.fecha"
              type="date"
              stack-label
              color="white"
              :rules="[(val) => !!val || 'Requerido']"
            />
            <q-input
              filled
              dark
              v-model="newSanitario.tipo_evento"
              label="Tipo de Evento (Ej: Vacunación)"
              color="white"
              :rules="[(val) => !!val || 'Requerido']"
            />
            <q-input
              filled
              dark
              v-model="newSanitario.descripcion"
              type="textarea"
              label="Descripción / Producto"
              color="white"
            />
          </q-card-section>
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" v-close-popup />
            <q-btn label="Guardar" type="submit" color="primary" :loading="loading.guardar" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialogos.reproduccion" persistent>
      <q-card class="glass-dialog-form" style="width: 450px">
        <q-card-section>
          <div class="text-h6">Registrar Evento Reproductivo</div>
        </q-card-section>
        <q-form
          @submit.prevent="
            handleCreate(
              'eventos_reproductivos',
              newReproductivo,
              resetReproductivo,
              'reproduccion',
            )
          "
          class="q-gutter-md"
        >
          <q-card-section class="q-pt-none q-gutter-md">
            <q-input
              filled
              dark
              v-model="newReproductivo.fecha"
              type="date"
              stack-label
              color="white"
              :rules="[(val) => !!val || 'Requerido']"
            />
            <q-select
              filled
              dark
              v-model="newReproductivo.tipo_evento"
              label="Tipo de Evento"
              color="white"
              :options="['Servicio', 'Tacto (Preñada)', 'Tacto (Vacía)', 'Parto', 'Aborto']"
              use-input
              new-value-mode="add-unique"
              :rules="[(val) => !!val || 'Requerido']"
            />
            <q-input
              filled
              dark
              v-model="newReproductivo.descripcion"
              type="textarea"
              label="Descripción (Ej: Toro Nro)"
              color="white"
            />
          </q-card-section>
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" v-close-popup />
            <q-btn label="Guardar" type="submit" color="primary" :loading="loading.guardar" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialogos.consumo">
      <q-card class="glass-dialog-form">
        <q-card-section>
          <div class="text-h6">Registrar Consumo</div>
        </q-card-section>
        <q-card-section>
          <p>Este módulo se gestiona desde "Mi Despensa" (Inventario).</p>
            <p>
            En la despensa, al usar un insumo, anotá cuánto se puso y cuánto sobró. Lo comido se
            descuenta del stock y queda en este lote.
          </p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Entendido" color="primary" v-close-popup />
          <q-btn
            label="Ir a Despensa"
            color="primary"
            @click="$router.push('/recursos/despensa')"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="dialogos.situacion" persistent>
      <q-card class="glass-dialog-form" style="width: 480px; max-width: 92vw">
        <q-card-section>
          <div class="text-h6">Anotar situación</div>
        </q-card-section>
        <q-form @submit.prevent="guardarSituacion" class="q-gutter-md">
          <q-card-section class="q-pt-none q-gutter-md">
            <q-input filled dark v-model="newSituacion.fecha" type="date" stack-label color="white" :rules="[(val) => !!val || 'Requerido']" />
            <q-select
              filled
              dark
              v-model="newSituacion.ambito"
              :options="ambitosSituacion"
              emit-value
              map-options
              label="De qué se trata"
              color="white"
            />
            <q-select
              filled
              dark
              v-model="newSituacion.tipo"
              :options="tiposSituacion"
              use-input
              input-debounce="0"
              new-value-mode="add-unique"
              label="Tipo (podés escribir uno nuevo)"
              color="white"
              @filter="filtrarTipos"
              :rules="[(val) => !!String(val || '').trim() || 'Requerido']"
            />
            <q-input filled dark v-model="newSituacion.detalle" type="textarea" label="Qué pasó" color="white" />
            <q-toggle v-model="newSituacion.pedir_revision" color="primary" label="Pedir revisión en la decisión y en las alertas" />
          </q-card-section>
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" v-close-popup />
            <q-btn label="Guardar" type="submit" color="primary" :loading="loading.guardar" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useDataStore } from 'stores/data-store'
import { supabase } from 'boot/supabase'
import { AMBITOS_SITUACION, decisionDesdeContexto } from 'src/utils/decisionLote'
import DecisionLotePanel from 'src/components/decision/DecisionLotePanel.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const dataStore = useDataStore()
const loteId = route.params.id
const visionDelLote = computed(() =>
  (dataStore.registrosVision || []).filter((row) => row.lote_id === loteId),
)
const comidasDelLote = computed(() =>
  (dataStore.inventarioMovimientos || []).filter(
    (m) => m.lote_id === loteId && String(m.tipo_movimiento || '').toLowerCase() === 'uso',
  ),
)
const situacionesDelLote = computed(() =>
  (dataStore.situaciones || []).filter((row) => row.lote_id === loteId),
)
const ambitosSituacion = AMBITOS_SITUACION
const tiposBase = ['Destete', 'Mortandad', 'Barro', 'Falta de sombra', 'Suplementación', 'Cambio de dieta']
const tiposSituacion = ref(tiposBase)
const fotosVision = ref({})
const decision = computed(() => {
  if (!dataStore.loteActual) return null
  return decisionDesdeContexto(dataStore.loteActual, {
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

const loading = reactive({ lote: true, guardar: false })
const tab = ref('evaluacion')
const fechaHoy = new Date().toISOString().split('T')[0]

// --- NUEVO ESTADO PARA DIÁLOGOS ---
const dialogos = reactive({
  evaluacion: false,
  sanidad: false,
  reproduccion: false,
  consumo: false,
  situacion: false,
})

// --- Modelos de Formularios (Sin cambios) ---
const getNewEvaluacion = () => ({
  lote_id: loteId,
  fecha_evaluacion: fechaHoy,
  peso_promedio_kg: null,
  condicion_corporal: 5, // Default a 5
  observaciones: '',
})
const getNewSanitario = () => ({
  lote_id: loteId,
  fecha: fechaHoy,
  tipo_evento: '',
  descripcion: '',
})
const getNewReproductivo = () => ({
  lote_id: loteId,
  fecha: fechaHoy,
  tipo_evento: null,
  descripcion: '',
})

const newEvaluacion = reactive(getNewEvaluacion())
const newSanitario = reactive(getNewSanitario())
const newReproductivo = reactive(getNewReproductivo())
const newSituacion = reactive({
  fecha: fechaHoy,
  ambito: 'otro',
  tipo: '',
  detalle: '',
  pedir_revision: false,
})

function filtrarTipos(val, update) {
  update(() => {
    const conocidos = [
      ...tiposBase,
      ...situacionesDelLote.value.map((s) => s.tipo).filter(Boolean),
    ]
    const q = String(val || '').toLowerCase()
    tiposSituacion.value = q
      ? [...new Set(conocidos)].filter((t) => t.toLowerCase().includes(q))
      : [...new Set(conocidos)]
  })
}

function etiquetaAmbito(id) {
  return AMBITOS_SITUACION.find((a) => a.id === id)?.label || 'Otro'
}

function cargarDato(id) {
  if (id === 'pesos') abrirDialogo('evaluacion')
  else if (id === 'condicion') router.push(`/lote/${loteId}/scan_cc`)
  else if (id === 'carga') router.push('/recursos/potreros')
  else if (id === 'ocupacion') router.push('/recursos/lluvias')
  else if (id === 'agua') router.push('/recursos/agua')
  else if (id === 'sanidad') router.push(`/lote/${loteId}/scan_cc`)
  else if (id === 'comida') router.push('/recursos/despensa')
  else if (id === 'situacion') {
    tab.value = 'situacion'
    abrirDialogo('situacion')
  }
}

async function guardarSituacion() {
  loading.guardar = true
  try {
    await dataStore.createRegistro('situaciones_lote', {
      lote_id: loteId,
      fecha: newSituacion.fecha,
      ambito: newSituacion.ambito || 'otro',
      tipo: String(newSituacion.tipo || '').trim(),
      detalle: String(newSituacion.detalle || '').trim() || null,
      pedir_revision: !!newSituacion.pedir_revision,
      created_by: null,
    })
    $q.notify({ type: 'positive', message: 'Situación guardada' })
    dialogos.situacion = false
    newSituacion.tipo = ''
    newSituacion.detalle = ''
    newSituacion.pedir_revision = false
  } catch (error) {
    $q.notify({ color: 'negative', message: 'Error: ' + error.message })
  } finally {
    loading.guardar = false
  }
}

// --- Funciones de Reset (Sin cambios) ---
const resetEvaluacion = () => Object.assign(newEvaluacion, getNewEvaluacion())
const resetSanitario = () => Object.assign(newSanitario, getNewSanitario())
const resetReproductivo = () => Object.assign(newReproductivo, getNewReproductivo())

// --- NUEVA FUNCIÓN PARA ABRIR DIÁLOGOS ---
function abrirDialogo(tipo) {
  // Resetea el formulario correspondiente antes de abrir
  if (tipo === 'evaluacion') resetEvaluacion()
  if (tipo === 'sanidad') resetSanitario()
  if (tipo === 'reproduccion') resetReproductivo()

  dialogos[tipo] = true
}

// --- Carga de Datos (Sin cambios) ---
async function cargarFotosVision() {
  const next = {}
  for (const row of visionDelLote.value) {
    if (!row.foto_path || String(row.id).startsWith('local-')) continue
    const { data, error } = await supabase.storage.from('vision').createSignedUrl(row.foto_path, 3600)
    if (!error && data?.signedUrl) next[row.id] = data.signedUrl
  }
  fotosVision.value = next
}

watch(visionDelLote, () => {
  cargarFotosVision()
})

onMounted(async () => {
  loading.lote = true
  try {
    if (!dataStore.lotes?.length) await dataStore.fetchLotes()
    await Promise.all([
      dataStore.ensureMarketPrice(),
      dataStore.fetchPotreros(),
      dataStore.fetchMovimientos(),
      dataStore.fetchRegistrosLluvia(),
      dataStore.fetchFuentesAgua(),
      dataStore.fetchInventarioMovimientos(),
      dataStore.fetchLecturasNdvi(),
      dataStore.fetchLluviaEstimada(),
    ])
    await dataStore.fetchLoteDetalle(loteId)
    await cargarFotosVision()
  } catch (error) {
    $q.notify({ color: 'negative', message: 'Error al cargar el lote: ' + error.message })
    router.back()
  } finally {
    loading.lote = false
  }
})

// --- FUNCIÓN DE GUARDADO ACTUALIZADA ---
async function handleCreate(tabla, dataObject, resetFunction, dialogTipo) {
  loading.guardar = true
  try {
    await dataStore.createRegistro(tabla, dataObject)
    $q.notify({ type: 'positive', message: 'Registro guardado' })
    resetFunction()
    dialogos[dialogTipo] = false // <-- Cierra el diálogo al guardar
  } catch (error) {
    $q.notify({ color: 'negative', message: 'Error: ' + error.message })
  } finally {
    loading.guardar = false
  }
}

// --- Helper de Fecha (Ajuste UTC) ---
function etiquetaVision(modo) {
  if (modo === 'condicion') return 'Condición corporal'
  if (modo === 'anomalia') return 'Anomalía'
  if (modo === 'fecal') return 'Análisis fecal'
  return 'Lectura'
}

function resumenVision(row) {
  if (row.modo === 'condicion') return `CC ${row.condicion_corporal ?? 'sin número'}`
  if (row.modo === 'anomalia') return row.texto_confirmado || row.gravedad || 'Sin nota'
  if (row.modo === 'fecal') {
    const par = row.presencia_parasitos ? 'con signos de parásitos' : 'sin signos de parásitos'
    return `${row.consistencia || '—'}, ${row.color || '—'}, ${par}`
  }
  return row.texto_confirmado || ''
}

function formatearFecha(fechaISO) {
  if (!fechaISO) return 'N/A'
  const date = new Date(fechaISO + 'T00:00:00-03:00') // Asumir hora local
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// --- Helpers Visuales ---
function getLoteIconPath(lote) {
  const objetivo = lote.objetivo ? String(lote.objetivo).toLowerCase() : 'default'
  let iconName = 'default'

  if (objetivo === 'cría') iconName = 'cria'
  else if (objetivo === 'recría') iconName = 'recria'
  else if (objetivo === 'engorde') iconName = 'engorde'

  return `icons/${iconName}.svg`
}

function onIconError(event) {
  event.target.src = 'icons/default.svg'
}

function getObjetivoColor(objetivo) {
  if (objetivo === 'Cría') return 'pink-5'
  if (objetivo === 'Recría') return 'orange-5'
  if (objetivo === 'Engorde') return 'green-5'
  return 'grey-5'
}

// --- KPIs (Lógica actualizada para N/A) ---
const kpi_peso_actual = computed(() => {
  const conPeso = (dataStore.evaluaciones || []).find((e) => {
    const p = parseFloat(e.peso_promedio_kg)
    return Number.isFinite(p) && p > 0
  })
  if (conPeso) return conPeso.peso_promedio_kg
  return dataStore.loteActual?.peso_ingreso_kg || '—'
})
const kpi_gdpv = computed(() => {
  const gdpv = dataStore.getGDPV(dataStore.evaluaciones)
  return gdpv === 0 || gdpv === '0' || gdpv === 'N/A' || gdpv == null ? 'N/A' : gdpv
})
</script>

<style lang="scss" scoped>
.dashboard-pro-bg {
  background-image: url('src/assets/nutrogan-bg.jpg'); // Asegúrate que la ruta sea correcta
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  min-height: 100vh;
}

.kpi-card {
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  height: 100%;
}
.kpi-card-na {
  background: rgba(0, 0, 0, 0.1); // Hacer más sutil si es N/A
  color: rgba(255, 255, 255, 0.4);
}

.main-tabs-card {
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

// Estilo de Diálogo "Glass"
:deep(.glass-dialog-form .q-card) {
  background: rgba(40, 40, 40, 0.8) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}
:deep(.glass-dialog-form .q-field__label) {
  color: rgba(255, 255, 255, 0.7);
}
:deep(.glass-dialog-form .q-field__native) {
  color: white;
}
:deep(.glass-dialog-form .q-item__label--header) {
  color: rgba(255, 255, 255, 0.9);
}
:deep(.glass-dialog-form .q-rating__icon) {
  color: rgba(255, 255, 255, 0.5);
}
</style>
