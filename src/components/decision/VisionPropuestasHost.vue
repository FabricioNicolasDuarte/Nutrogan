<template>
  <q-dialog v-model="abierto" persistent>
    <q-card class="bg-grey-10 text-white" style="width: 460px; max-width: 92vw">
      <q-card-section>
        <div class="text-h6">Foto lista para confirmar</div>
        <div class="text-caption text-grey-5">
          La lectura volvió con señal. No queda guardada hasta que la confirmes.
        </div>
      </q-card-section>
      <q-card-section v-if="actual" class="q-gutter-md">
        <div class="text-subtitle2">{{ tituloModo }}</div>
        <div v-if="actual.modo === 'condicion'" class="column items-center">
          <div class="text-h3 text-primary">{{ cc == null ? '—' : cc }}</div>
          <div class="row q-gutter-sm">
            <q-btn round color="grey-8" icon="remove" @click="moverCc(-0.5)" />
            <q-btn round color="primary" text-color="black" icon="add" @click="moverCc(0.5)" />
          </div>
        </div>
        <div v-else-if="actual.modo === 'anomalia'">
          <div>Gravedad: {{ form.gravedad === 'seria' ? 'Seria' : 'Baja' }}</div>
          <div class="text-caption text-grey-4">{{ form.descripcion }}</div>
        </div>
        <div v-else>
          <div>{{ form.consistencia }} · {{ form.color }}</div>
          <div class="text-caption text-grey-4">
            {{ form.presencia_parasitos ? 'Marca signos de parásitos' : 'Sin signos de parásitos' }}
          </div>
        </div>
        <q-input v-model="form.nota" dark filled type="textarea" autogrow label="Nota" />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat color="grey-5" label="Descartar" @click="descartar" />
        <q-btn
          unelevated
          color="primary"
          text-color="black"
          label="Confirmar en el lote"
          :disable="actual?.modo === 'condicion' && cc == null"
          :loading="guardando"
          @click="confirmar"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useDataStore } from 'stores/data-store'
import { listarPropuestasVision, quitarPropuestaVision } from 'src/services/visionPendiente'
import { guardarVisionConfirmada } from 'src/services/visionSave'

const $q = useQuasar()
const dataStore = useDataStore()
const propuestas = ref([])
const abierto = ref(false)
const guardando = ref(false)
const cc = ref(null)
const form = ref({})

const actual = computed(() => propuestas.value[0] || null)
const tituloModo = computed(() => {
  if (actual.value?.modo === 'condicion') return 'Condición corporal'
  if (actual.value?.modo === 'anomalia') return 'Anomalía'
  return 'Análisis fecal'
})

function aplicar(item) {
  const propuesta = item?.propuesta || {}
  form.value = { ...propuesta }
  cc.value = propuesta.condicion_corporal ?? null
}

async function recargar() {
  propuestas.value = await listarPropuestasVision()
  if (actual.value) {
    aplicar(actual.value)
    abierto.value = true
  } else {
    abierto.value = false
  }
}

function moverCc(delta) {
  if (cc.value == null) {
    cc.value = 5
    return
  }
  const next = Math.round((cc.value + delta) * 2) / 2
  cc.value = Math.min(9, Math.max(1, next))
}

async function descartar() {
  if (!actual.value) return
  await quitarPropuestaVision(actual.value.id)
  await recargar()
}

function blobDesdeBase64(base64) {
  if (!base64) return null
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: 'image/jpeg' })
}

async function confirmar() {
  if (!actual.value) return
  guardando.value = true
  try {
    const propuesta = {
      ...form.value,
      condicion_corporal: actual.value.modo === 'condicion' ? cc.value : null,
      nota: form.value.nota?.trim() || '',
    }
    await guardarVisionConfirmada({
      loteId: actual.value.lote_id,
      modo: actual.value.modo,
      fotoBlob: blobDesdeBase64(actual.value.image_base64),
      propuesta,
      userId: actual.value.user_id || null,
    })
    await quitarPropuestaVision(actual.value.id)
    await dataStore.fetchLoteDetalle?.(actual.value.lote_id)
    $q.notify({ type: 'positive', message: 'Lectura confirmada en el lote' })
    await recargar()
  } catch (error) {
    $q.notify({ type: 'negative', message: 'No se pudo guardar', caption: error.message })
  } finally {
    guardando.value = false
  }
}

onMounted(() => {
  recargar()
  window.addEventListener('vision-propuesta', recargar)
})
onUnmounted(() => window.removeEventListener('vision-propuesta', recargar))
</script>
