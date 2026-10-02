<template>
  <q-page padding class="dashboard-pro-bg text-white">
    <div class="text-h5 q-mb-sm">Qué se puede decidir hoy</div>
    <p class="text-body2 text-grey-4 q-mb-lg">
      Cada lote junta el peso, la condición, la carga, el potrero, el agua, la sanidad vista y la
      comida. Si falta un dato, el renglón lo dice. El satélite no se convierte en kilos de pasto y
      la foto no diagnostica.
    </p>

    <div v-if="cargando" class="text-center q-pa-xl">
      <q-spinner-dots color="white" size="3em" />
    </div>

    <div v-else-if="!filas.length" class="text-grey-5">No hay lotes activos.</div>

    <div v-else class="column q-gutter-md">
      <q-card
        v-for="fila in filas"
        :key="fila.lote.id"
        flat
        class="cursor-pointer"
        @click="router.push(`/lote/${fila.lote.id}`)"
      >
        <q-card-section class="row items-center justify-between">
          <div>
            <div class="text-subtitle1 text-white">{{ fila.lote.identificacion }}</div>
            <div class="text-caption text-grey-5">{{ fila.decision.titulo }}</div>
          </div>
          <q-icon name="chevron_right" color="grey-5" />
        </q-card-section>
        <DecisionLotePanel :decision="fila.decision" />
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from 'stores/data-store'
import { decisionDesdeContexto } from 'src/utils/decisionLote'
import DecisionLotePanel from 'src/components/decision/DecisionLotePanel.vue'

const router = useRouter()
const dataStore = useDataStore()
const cargando = ref(true)

const filas = computed(() =>
  (dataStore.lotes || [])
    .filter((lote) => lote.activo !== false)
    .map((lote) => ({
      lote,
      decision: decisionDesdeContexto(lote, contexto()),
    })),
)

function contexto() {
  return {
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
  }
}

onMounted(async () => {
  try {
    await dataStore.fetchLotes()
    await Promise.all([
      dataStore.ensureMarketPrice(),
      dataStore.fetchPotreros(),
      dataStore.fetchMovimientos(),
      dataStore.fetchRegistrosLluvia(),
      dataStore.fetchFuentesAgua(),
      dataStore.fetchInventarioMovimientos(),
      dataStore.fetchAllEvaluaciones(),
      dataStore.fetchAllRegistrosVision(),
      dataStore.fetchAllSituaciones(),
      dataStore.fetchAllEventosReproductivos(),
      dataStore.fetchLecturasNdvi(),
      dataStore.fetchLluviaEstimada(),
    ])
  } finally {
    cargando.value = false
  }
})
</script>
