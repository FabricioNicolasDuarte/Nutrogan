<template>
  <q-page class="cc-page text-white q-pa-md">
    <q-header elevated class="bg-dark">
      <q-toolbar>
        <q-btn flat round dense icon="arrow_back" @click="$router.back()" />
        <q-toolbar-title>
          Visión del lote
          <div class="text-caption text-grey-5">{{ lote?.identificacion || 'Lote' }}</div>
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <div class="q-pt-xl q-gutter-y-md" style="max-width: 560px; margin: 0 auto">
      <q-banner v-if="paso === 'modo'" class="bg-grey-10 text-grey-3 rounded-borders" dense>
        La foto propone. Quien está en el campo confirma antes de que quede guardado.
      </q-banner>

      <div v-if="paso === 'modo'" class="column q-gutter-sm">
        <q-btn
          v-for="op in modos"
          :key="op.id"
          unelevated
          color="grey-10"
          text-color="white"
          class="modo-btn"
          align="left"
          no-caps
          @click="elegirModo(op.id)"
        >
          <div class="column items-start">
            <div class="text-subtitle1 text-weight-bold">{{ op.titulo }}</div>
            <div class="text-caption text-grey-5">{{ op.detalle }}</div>
          </div>
        </q-btn>
      </div>

      <div v-else-if="paso === 'foto'" class="column q-gutter-md">
        <div class="text-subtitle1 text-center">{{ tituloModo }}</div>
        <div v-if="camaraAbierta" class="visor">
          <video ref="videoRef" autoplay playsinline muted class="preview" />
          <q-banner v-if="errorCamara" dense class="bg-red-10 text-white q-mt-sm rounded-borders">
            {{ errorCamara }}
          </q-banner>
          <q-btn
            unelevated
            color="primary"
            text-color="black"
            icon="photo_camera"
            label="Sacar foto"
            :disable="!!errorCamara"
            @click="capturar"
          />
          <q-btn flat color="grey-4" label="Cerrar cámara" @click="cerrarCamara" />
        </div>
        <template v-else>
          <img v-if="previewUrl" :src="previewUrl" alt="Foto tomada" class="preview" />
          <q-btn
            unelevated
            color="primary"
            text-color="black"
            icon="photo_camera"
            label="Abrir cámara"
            @click="abrirCamara"
          />
          <q-btn flat color="grey-4" icon="photo_library" label="Elegir una foto" @click="elegirArchivo" />
          <q-btn flat color="grey-5" label="Anotar sin foto" @click="seguirSinFoto" />
        </template>
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFile" />
      </div>

      <div v-else-if="paso === 'sin_senal'" class="column q-gutter-md">
        <q-banner class="bg-grey-10 text-grey-3 rounded-borders">
          Sin señal la foto no se lee ahora. Podés anotar el dato a mano, o dejar la foto para que
          se lea cuando vuelva la red. En ese caso no se guarda nada hasta que confirmes.
        </q-banner>
        <q-btn unelevated color="primary" text-color="black" label="Anotar ahora" @click="paso = 'confirmar'" />
        <q-btn outline color="grey-4" label="Leer la foto cuando haya señal" @click="dejarParaLeer" />
      </div>

      <div v-else-if="paso === 'leyendo'" class="text-center q-pa-xl">
        <q-spinner-dots color="primary" size="3em" />
        <div class="q-mt-md text-grey-4">Leyendo la foto…</div>
      </div>

      <q-card v-else flat bordered class="bg-grey-10">
        <q-card-section class="q-gutter-md">
          <img v-if="previewUrl" :src="previewUrl" alt="Foto a confirmar" class="preview" />
          <div class="text-caption text-grey-5">{{ tituloModo }} · revisá antes de guardar</div>

          <template v-if="modo === 'condicion'">
            <q-banner v-if="!propuestoPorFoto" dense class="bg-dark text-grey-4 rounded-borders">
              La foto no alcanzó para proponer un número. Elegí la condición antes de guardar.
            </q-banner>
            <div class="text-h2 text-primary text-center text-weight-bolder">
              {{ ccConfirmada ? formatCcInta(form.condicion_corporal) : '—' }}
            </div>
            <div v-if="ccConfirmada" class="text-body2 text-grey-4 text-center">{{ describeCcInta(form.condicion_corporal) }}</div>
            <div class="row justify-center q-gutter-md">
              <q-btn round color="grey-8" icon="remove" @click="ajustar(-0.5)" />
              <q-btn round color="primary" text-color="black" icon="add" @click="ajustar(0.5)" />
            </div>
          </template>

          <template v-else-if="modo === 'anomalia'">
            <q-btn-toggle
              v-model="form.gravedad"
              spread
              no-caps
              toggle-color="primary"
              color="grey-9"
              text-color="white"
              :options="[
                { label: 'Poco urgente', value: 'baja' },
                { label: 'Seria', value: 'seria' },
              ]"
            />
            <q-input v-model="form.descripcion" type="textarea" filled dark label="Qué se vio" />
          </template>

          <template v-else>
            <q-select v-model="form.consistencia" filled dark label="Consistencia" :options="consistencias" />
            <q-select v-model="form.color" filled dark label="Color" :options="colores" />
            <q-toggle v-model="form.presencia_parasitos" label="Hay signos visibles de parásitos" color="primary" />
          </template>

          <q-input v-model="form.nota" type="textarea" filled dark label="Nota para el lote" />

          <q-toggle
            v-if="modo !== 'condicion'"
            v-model="form.registrar_evento"
            color="primary"
            label="Dejar también un evento sanitario en el lote"
          />

          <q-btn
            unelevated
            color="primary"
            text-color="black"
            class="full-width"
            label="Guardar en el lote"
            :loading="guardando"
            :disable="!puedeGuardar"
            @click="guardar"
          />
          <q-btn flat color="grey-5" class="full-width" label="Volver a elegir" @click="reiniciar" />
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { supabase } from 'boot/supabase'
import { useDataStore } from 'stores/data-store'
import { useAuthStore } from 'stores/auth-store'
import { clampCcInta, describeCcInta, formatCcInta } from 'src/utils/ccInta'
import { parseVisionProposal } from 'src/utils/visionParse'
import { guardarVisionConfirmada } from 'src/services/visionSave'
import { syncService } from 'src/services/SyncService'

const modos = [
  {
    id: 'condicion',
    titulo: 'Condición corporal',
    detalle: 'Propone un número del 1 al 9. Queda en la evaluación del lote.',
  },
  {
    id: 'anomalia',
    titulo: 'Anomalía',
    detalle: 'Lesión, pasto o instalación. Si es seria, puede quedar como evento sanitario.',
  },
  {
    id: 'fecal',
    titulo: 'Análisis fecal',
    detalle: 'Consistencia, color y parásitos. Si hay signos, puede quedar el evento sanitario.',
  },
]

const consistencias = ['Normal', 'Blanda', 'Dura', 'Diarrea']
const colores = ['Marrón', 'Verde', 'Pálido', 'Sanguinolento']

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const dataStore = useDataStore()
const authStore = useAuthStore()

const loteId = route.params.id
const lote = ref(null)
const paso = ref('modo')
const modo = ref(null)
const fileInput = ref(null)
const videoRef = ref(null)
const camaraAbierta = ref(false)
const errorCamara = ref('')
let stream = null
const previewUrl = ref('')
const fotoBlob = ref(null)
const propuestoPorFoto = ref(false)
const ccConfirmada = ref(false)
const guardando = ref(false)
const form = ref(formVacio())

const tituloModo = computed(() => modos.find((m) => m.id === modo.value)?.titulo || 'Visión')
const puedeGuardar = computed(() => {
  if (modo.value === 'condicion') return ccConfirmada.value
  if (modo.value === 'anomalia') return !!form.value.descripcion?.trim()
  return !!form.value.consistencia && !!form.value.color
})

function formVacio() {
  return {
    condicion_corporal: 5,
    nota: '',
    descripcion: '',
    gravedad: 'baja',
    consistencia: 'Normal',
    color: 'Marrón',
    presencia_parasitos: false,
    registrar_evento: false,
    texto_modelo: '',
  }
}

function elegirModo(id) {
  modo.value = id
  paso.value = 'foto'
  propuestoPorFoto.value = false
  ccConfirmada.value = false
  form.value = formVacio()
}

function elegirArchivo() {
  fileInput.value?.click()
}

function detenerCamara() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }
  if (videoRef.value) videoRef.value.srcObject = null
}

function cerrarCamara() {
  detenerCamara()
  camaraAbierta.value = false
  errorCamara.value = ''
}

async function abrirCamara() {
  errorCamara.value = ''
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    errorCamara.value = 'Este navegador no abre la cámara acá. Podés elegir una foto.'
    camaraAbierta.value = true
    return
  }
  camaraAbierta.value = true
  await nextTick()
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' } },
    })
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      await videoRef.value.play()
    }
  } catch (error) {
    detenerCamara()
    const sinPermiso = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError'
    if (!sinPermiso) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true })
        if (videoRef.value) {
          videoRef.value.srcObject = stream
          await videoRef.value.play()
        }
        return
      } catch {
        /* sigue al aviso */
      }
    }
    errorCamara.value = sinPermiso
      ? 'El navegador no dio permiso para la cámara. Habilitala en el candado de la barra, o elegí una foto.'
      : 'No se pudo abrir la cámara. Podés elegir una foto.'
  }
}

function capturar() {
  const video = videoRef.value
  if (!video || !video.videoWidth) {
    $q.notify({ type: 'warning', message: 'La cámara todavía no muestra imagen' })
    return
  }
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0)
  canvas.toBlob(
    async (blob) => {
      if (!blob) {
        $q.notify({ type: 'negative', message: 'No se pudo sacar la foto' })
        return
      }
      cerrarCamara()
      await usarFoto(blob)
    },
    'image/jpeg',
    0.92,
  )
}

function seguirSinFoto() {
  fotoBlob.value = null
  propuestoPorFoto.value = false
  paso.value = 'confirmar'
}

function ajustar(delta) {
  const base = ccConfirmada.value ? form.value.condicion_corporal : 5
  form.value.condicion_corporal = clampCcInta(ccConfirmada.value ? base + delta : base)
  ccConfirmada.value = true
}

async function onFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  await usarFoto(file)
}

async function usarFoto(file) {
  try {
    fotoBlob.value = await comprimir(file)
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = URL.createObjectURL(fotoBlob.value)
    await analizar()
  } catch (error) {
    $q.notify({ type: 'negative', message: 'No se pudo usar la foto', caption: error.message })
  }
}

function comprimir(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const max = 1280
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          if (!blob) reject(new Error('No se pudo preparar la foto'))
          else resolve(blob)
        },
        'image/jpeg',
        0.72,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la foto'))
    }
    img.src = url
  })
}

async function analizar() {
  if (!navigator.onLine) {
    paso.value = 'sin_senal'
    return
  }
  paso.value = 'leyendo'
  try {
    const image_base64 = await blobToBase64(fotoBlob.value)
    const { data, error } = await supabase.functions.invoke('analizar-vision', {
      body: { modo: modo.value, lote_id: loteId, image_base64 },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    const propuesta = parseVisionProposal(modo.value, data.texto)
    aplicarPropuesta(propuesta)
    paso.value = 'confirmar'
  } catch (error) {
    propuestoPorFoto.value = false
    paso.value = 'confirmar'
    $q.notify({
      type: 'warning',
      message: 'La foto no se pudo leer',
      caption: error.message || 'Completá los datos a mano.',
    })
  }
}

function aplicarPropuesta(propuesta) {
  form.value.nota = propuesta.nota || ''
  form.value.texto_modelo = propuesta.texto_modelo || ''
  form.value.registrar_evento = !!propuesta.registrar_evento
  if (modo.value === 'condicion') {
    propuestoPorFoto.value = propuesta.condicion_corporal != null
    ccConfirmada.value = propuesta.condicion_corporal != null
    form.value.condicion_corporal = propuesta.condicion_corporal ?? 5
  } else if (modo.value === 'anomalia') {
    form.value.gravedad = propuesta.gravedad || 'baja'
    form.value.descripcion = propuesta.descripcion || ''
    propuestoPorFoto.value = !!propuesta.descripcion
  } else {
    form.value.consistencia = propuesta.consistencia
    form.value.color = propuesta.color
    form.value.presencia_parasitos = !!propuesta.presencia_parasitos
    propuestoPorFoto.value = true
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '')
    reader.onerror = () => reject(new Error('No se pudo preparar la foto'))
    reader.readAsDataURL(blob)
  })
}

async function dejarParaLeer() {
  if (!fotoBlob.value) {
    $q.notify({ type: 'warning', message: 'Primero sacá la foto' })
    return
  }
  const image_base64 = await blobToBase64(fotoBlob.value)
  await syncService.addAction('vision_lectura', {
    lote_id: loteId,
    modo: modo.value,
    image_base64,
    user_id: authStore.user?.id || null,
  })
  $q.notify({
    type: 'info',
    message: 'Foto en espera',
    caption: 'Cuando haya señal vas a ver la propuesta y recién ahí se guarda.',
  })
  router.back()
}

async function guardar() {
  const propuesta = {
    ...form.value,
    nota: form.value.nota?.trim() || '',
    descripcion: form.value.descripcion?.trim() || '',
  }
  const image_base64 = fotoBlob.value ? await blobToBase64(fotoBlob.value) : null
  if (!navigator.onLine) {
    await syncService.addAction('vision', {
      lote_id: loteId,
      modo: modo.value,
      propuesta,
      image_base64,
      user_id: authStore.user?.id || null,
    })
    $q.notify({
      type: 'info',
      message: 'Lectura guardada en el teléfono',
      caption: 'La foto y el dato suben al lote cuando vuelva la señal.',
    })
    router.back()
    return
  }
  guardando.value = true
  try {
    await guardarVisionConfirmada({
      loteId,
      modo: modo.value,
      fotoBlob: fotoBlob.value,
      userId: authStore.user?.id || null,
      propuesta,
    })
    await dataStore.fetchLoteDetalle?.(loteId)
    $q.notify({ type: 'positive', message: 'Lectura guardada en el lote' })
    router.back()
  } catch (error) {
    $q.notify({ type: 'negative', message: 'No se pudo guardar', caption: error.message })
  } finally {
    guardando.value = false
  }
}

function reiniciar() {
  cerrarCamara()
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  fotoBlob.value = null
  modo.value = null
  paso.value = 'modo'
}

onBeforeUnmount(() => {
  detenerCamara()
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})

onMounted(async () => {
  if (dataStore.lotes.length === 0) await dataStore.fetchLotes()
  const found = dataStore.lotes.find((l) => l.id === loteId)
  if (!found) {
    $q.notify({ type: 'negative', message: 'No se encontró el lote' })
    router.back()
    return
  }
  lote.value = found
})
</script>

<style scoped>
.cc-page {
  background: #121212;
  min-height: 100vh;
}
.modo-btn {
  min-height: 72px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.preview {
  width: 100%;
  max-height: 320px;
  object-fit: contain;
  border-radius: 12px;
  background: #000;
}
.hidden {
  display: none;
}
</style>
