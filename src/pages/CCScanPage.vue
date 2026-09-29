<template>
  <q-page class="cc-page text-white q-pa-md">
    <q-header elevated class="bg-dark">
      <q-toolbar>
        <q-btn flat round dense icon="arrow_back" @click="$router.back()" />
        <q-toolbar-title>
          Condición corporal
          <div class="text-caption text-grey-5">{{ lote?.identificacion || 'Lote' }}</div>
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <div class="q-pt-xl q-gutter-y-md" style="max-width: 520px; margin: 0 auto">
      <q-banner class="bg-grey-10 text-grey-3 rounded-borders" dense>
        Registro manual con <strong>escala INTA Argentina (1–9)</strong>.
        No hay modelo de IA en el dispositivo: el valor lo carga quien evalúa en el campo.
      </q-banner>

      <q-card flat bordered class="bg-grey-10">
        <q-card-section class="text-center">
          <div class="text-caption text-grey-5 text-uppercase">{{ CC_INTA_LABEL }}</div>
          <div class="text-h2 text-primary text-weight-bolder q-my-sm">
            {{ formatCcInta(form.condicion_corporal) }}
          </div>
          <div class="text-body2 text-grey-4" style="min-height: 3em">
            {{ describeCcInta(form.condicion_corporal) }}
          </div>

          <div class="row justify-center items-center q-gutter-md q-mt-md">
            <q-btn
              round
              color="grey-8"
              icon="remove"
              size="lg"
              @click="ajustar(-0.5)"
            />
            <q-btn
              round
              color="primary"
              text-color="black"
              icon="add"
              size="lg"
              @click="ajustar(0.5)"
            />
          </div>

          <q-slider
            v-model="form.condicion_corporal"
            :min="CC_INTA_MIN"
            :max="CC_INTA_MAX"
            :step="0.5"
            label
            color="primary"
            class="q-mt-lg q-px-md"
          />

          <div class="row justify-between text-caption text-grey-6 q-px-xs">
            <span>1 emaciado</span>
            <span>5 moderado</span>
            <span>9 obeso</span>
          </div>
        </q-card-section>
      </q-card>

      <q-input
        v-model="form.fecha_evaluacion"
        type="date"
        label="Fecha de evaluación"
        stack-label
        filled
        dark
        color="primary"
      />

      <q-input
        v-model="form.observaciones"
        type="textarea"
        label="Observaciones (opcional)"
        filled
        dark
        color="primary"
        autogrow
      />

      <q-btn
        color="primary"
        text-color="black"
        size="lg"
        class="full-width"
        icon="save"
        label="Guardar CC"
        :loading="loading"
        @click="guardarEvaluacion"
      />
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from 'stores/data-store'
import { useQuasar } from 'quasar'
import {
  CC_INTA_DEFAULT,
  CC_INTA_LABEL,
  CC_INTA_MAX,
  CC_INTA_MIN,
  clampCcInta,
  describeCcInta,
  formatCcInta,
} from 'src/utils/ccInta'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const dataStore = useDataStore()

const loteId = route.params.id
const lote = ref(null)
const loading = ref(false)

const form = ref({
  lote_id: loteId,
  fecha_evaluacion: new Date().toISOString().split('T')[0],
  peso_promedio_kg: null,
  condicion_corporal: CC_INTA_DEFAULT,
  observaciones: '',
})

function ajustar(delta) {
  form.value.condicion_corporal = clampCcInta(form.value.condicion_corporal + delta)
}

async function guardarEvaluacion() {
  loading.value = true
  try {
    const cc = clampCcInta(form.value.condicion_corporal)
    const obs =
      form.value.observaciones?.trim() ||
      `CC INTA ${formatCcInta(cc)} — ${describeCcInta(cc)}`
    await dataStore.createRegistro('evaluaciones', {
      ...form.value,
      condicion_corporal: cc,
      observaciones: obs,
    })
    $q.notify({
      type: 'positive',
      message: 'Condición corporal guardada',
      caption: `${lote.value.identificacion} · CC INTA ${formatCcInta(cc)}`,
    })
    router.back()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error al guardar',
      caption: error.message,
    })
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (dataStore.lotes.length === 0) {
    await dataStore.fetchLotes()
  }
  const found = dataStore.lotes.find((l) => l.id === loteId)
  if (found) {
    lote.value = found
  } else {
    $q.notify({ type: 'negative', message: 'No se encontró el lote' })
    router.back()
  }
})
</script>

<style scoped>
.cc-page {
  background: #0a0a0a;
  min-height: 100vh;
}
</style>
