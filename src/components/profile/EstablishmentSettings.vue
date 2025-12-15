<template>
  <div class="row q-col-gutter-lg">
    <div class="col-12 col-md-6">
      <q-card class="bg-transparent no-shadow border-dim q-pa-md">
        <div class="row items-center q-mb-lg">
          <q-icon name="domain" color="primary" size="sm" class="q-mr-sm" />
          <div class="text-h6">Configuración</div>
        </div>

        <q-form @submit.prevent="guardar" class="q-gutter-y-md">
          <q-input
            v-model="form.nombre"
            label="Nombre del Establecimiento"
            filled
            dark
            color="primary"
            :rules="[(val) => !!val || 'Requerido']"
          />
          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-input v-model="form.ciudad" label="Ciudad" filled dark color="primary" />
            </div>
            <div class="col-12 col-sm-6">
              <q-input v-model="form.provincia" label="Provincia" filled dark color="primary" />
            </div>
          </div>

          <div class="row justify-end q-mt-md">
            <q-btn
              label="Guardar Cambios"
              type="submit"
              color="primary"
              text-color="black"
              class="full-width"
              :loading="loading"
              unelevated
            />
          </div>
        </q-form>
      </q-card>
    </div>

    <div class="col-12 col-md-6">
      <q-card class="bg-transparent no-shadow border-dim q-pa-md full-height">
        <div class="text-subtitle1 q-mb-md text-grey-4 text-uppercase font-outfit">
          Actividad Reciente
        </div>

        <div
          v-if="events.length === 0"
          class="flex flex-center full-height text-grey-7"
          style="min-height: 200px"
        >
          <div class="text-center">
            <q-icon name="history" size="md" class="q-mb-sm opacity-50" />
            <div>Sin registros recientes</div>
          </div>
        </div>

        <q-timeline v-else color="primary" dark class="q-pl-sm">
          <q-timeline-entry
            v-for="ev in events"
            :key="ev.id"
            :title="ev.titulo"
            :subtitle="ev.fecha"
            :color="ev.color"
            :icon="ev.icon"
          >
            <div class="text-weight-bold text-white font-mono">
              {{ ev.valor }} <span class="text-grey-5 text-caption">{{ ev.unidad }}</span>
            </div>
          </q-timeline-entry>
        </q-timeline>
      </q-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useDataStore } from 'stores/data-store'
import { useQuasar } from 'quasar'
import { supabase } from 'boot/supabase'

const store = useDataStore()
const $q = useQuasar()
const loading = ref(false)
const form = reactive({ nombre: '', ciudad: '', provincia: '' })

const events = computed(() => {
  const arr = []

  const lluvias = store.registrosLluvia || []
  const evaluaciones = store.evaluaciones || []

  lluvias.forEach((r) =>
    arr.push({
      id: 'r' + r.id,
      titulo: 'Registro Lluvia',
      fecha: formatDate(r.fecha),
      valor: r.milimetros,
      unidad: 'mm',
      color: 'cyan',
      icon: 'water_drop',
    }),
  )

  evaluaciones.forEach((e) =>
    arr.push({
      id: 'e' + e.id,
      titulo: 'Pesaje Ganado',
      fecha: formatDate(e.fecha_evaluacion),
      valor: e.peso_promedio_kg,
      unidad: 'kg Avg',
      color: 'green',
      icon: 'scale',
    }),
  )

  return arr.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5)
})

function formatDate(d) {
  if (!d) return '-'
  // CORREGIDO ESLINT: Ignoramos el primer elemento (year) usando una coma vacía
  const [, month, day] = d.split('T')[0].split('-')
  return `${day}/${month}`
}

async function guardar() {
  loading.value = true
  try {
    const { error } = await supabase
      .from('establecimientos')
      .update(form)
      .eq('id', store.establecimientoActual.id)

    if (error) throw error

    Object.assign(store.establecimientoActual, form)
    $q.notify({ type: 'positive', message: 'Datos actualizados' })
  } catch (e) {
    // CORREGIDO ESLINT: Usamos la variable 'e'
    console.error(e)
    $q.notify({ type: 'negative', message: 'Error al guardar' })
  }
  loading.value = false
}

onMounted(() => {
  if (store.establecimientoActual) {
    Object.assign(form, store.establecimientoActual)
  }
  if (!store.registrosLluvia?.length) store.fetchLluvias?.()
  if (!store.evaluaciones?.length) store.fetchAllEvaluaciones?.()
})

watch(
  () => store.establecimientoActual,
  (newVal) => {
    if (newVal) Object.assign(form, newVal)
  },
  { deep: true },
)
</script>

<style scoped>
.border-dim {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
.font-mono {
  font-family: monospace;
}
.opacity-50 {
  opacity: 0.5;
}
</style>
