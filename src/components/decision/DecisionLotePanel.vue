<template>
  <q-card flat :class="tone === 'light' ? 'bg-white text-black decision-card' : 'decision-card kpi-card text-white'">
    <q-card-section>
      <div class="text-caption" :class="tone === 'light' ? 'text-grey-8' : 'text-grey-4'">
        Qué se puede decidir hoy
      </div>
      <div class="text-h6 q-mt-xs">{{ decision.titulo }}</div>
      <q-badge class="q-mt-sm" :color="colorVeredicto" :text-color="tone === 'light' ? 'white' : 'black'">
        {{ etiquetaVeredicto }}
      </q-badge>
      <div class="q-mt-sm">
        <q-btn
          flat
          dense
          no-caps
          color="primary"
          label="Redactar parte"
          :loading="redactando"
          @click="redactar"
        />
      </div>
      <p v-if="parte" class="q-mt-sm q-mb-none text-body2">{{ parte }}</p>
    </q-card-section>
    <q-separator :dark="tone !== 'light'" />
    <q-list dense separator>
      <q-item v-for="linea in decision.lineas" :key="linea.id">
        <q-item-section>
          <q-item-label class="text-weight-medium">
            {{ linea.titulo }}
            <span class="text-caption" :class="tone === 'light' ? 'text-grey-7' : 'text-grey-5'">
              · {{ linea.oficio }}
            </span>
          </q-item-label>
          <q-item-label caption :class="tone === 'light' ? 'text-grey-9' : 'text-grey-4'">
            {{ linea.lectura }}
          </q-item-label>
          <q-item-label v-if="linea.hueco" caption class="text-orange-8">
            {{ linea.hueco }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn
            v-if="etiquetaCarga(linea.id)"
            flat
            dense
            no-caps
            color="primary"
            :label="etiquetaCarga(linea.id)"
            @click.stop="$emit('cargar', linea.id)"
          />
          <q-icon :name="icono(linea.estado)" :color="colorLinea(linea.estado)" />
        </q-item-section>
      </q-item>
    </q-list>
  </q-card>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { supabase } from 'boot/supabase'

const props = defineProps({
  decision: { type: Object, required: true },
  tone: { type: String, default: 'dark' },
})

defineEmits(['cargar'])

const $q = useQuasar()
const parte = ref('')
const redactando = ref(false)

watch(
  () => props.decision?.titulo,
  () => {
    parte.value = ''
  },
)

async function redactar() {
  redactando.value = true
  try {
    const { data, error } = await supabase.functions.invoke('parte-decision', {
      body: {
        titulo: props.decision.titulo,
        veredicto: props.decision.veredicto,
        lineas: props.decision.lineas,
      },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    parte.value = data?.parte || ''
  } catch (error) {
    $q.notify({ type: 'warning', message: 'No se pudo redactar el parte', caption: error.message })
  } finally {
    redactando.value = false
  }
}

function etiquetaCarga(id) {
  const map = {
    pesos: 'Pesar',
    condicion: 'Condición',
    carga: 'Potrero',
    ocupacion: 'Lluvia',
    agua: 'Agua',
    sanidad: 'Visión',
    comida: 'Despensa',
    situacion: 'Anotar',
  }
  return map[id] || ''
}

const etiquetaVeredicto = computed(() => {
  const map = {
    seguir: 'Seguir',
    rotar: 'Rotar o aliviar',
    revisar: 'Revisar',
    el_kilo_no_cierra: 'El kilo no cierra',
    faltan_datos: 'Faltan datos',
  }
  return map[props.decision.veredicto] || 'Decisión'
})

const colorVeredicto = computed(() => {
  const map = {
    seguir: 'positive',
    rotar: 'warning',
    revisar: 'negative',
    el_kilo_no_cierra: 'warning',
    faltan_datos: 'grey-7',
  }
  return map[props.decision.veredicto] || 'grey'
})

function icono(estado) {
  if (estado === 'atencion') return 'priority_high'
  if (estado === 'falta') return 'hourglass_empty'
  return 'check'
}

function colorLinea(estado) {
  if (estado === 'atencion') return 'negative'
  if (estado === 'falta') return 'orange-8'
  return 'positive'
}
</script>

<style scoped>
.decision-card {
  border-radius: 12px;
}
</style>
