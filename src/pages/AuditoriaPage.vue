<template>
  <q-page class="q-pa-md q-pa-md-lg">
    <div class="row items-end q-mb-md">
      <div class="col">
        <div class="text-h5 text-white">Auditoría</div>
        <div class="text-caption text-grey-5">
          Quién hizo cada carga, cambio o borrado. Solo el superadmin ve este listado.
        </div>
      </div>
    </div>

    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-sm-4">
        <q-input v-model="busca" dense filled dark label="Persona o correo" clearable />
      </div>
      <div class="col-6 col-sm-4">
        <q-select
          v-model="accion"
          :options="acciones"
          dense
          filled
          dark
          emit-value
          map-options
          label="Acción"
          clearable
        />
      </div>
      <div class="col-6 col-sm-4">
        <q-select
          v-model="tabla"
          :options="tablas"
          dense
          filled
          dark
          emit-value
          map-options
          label="Qué"
          clearable
        />
      </div>
    </div>

    <q-banner v-if="error" class="bg-red-10 text-white q-mb-md" rounded>{{ error }}</q-banner>

    <q-list v-if="filtradas.length" bordered separator class="bg-grey-10 rounded-borders">
      <q-item v-for="fila in filtradas" :key="fila.id">
        <q-item-section>
          <q-item-label class="text-white">
            {{ etiquetaAccion(fila.accion) }} · {{ etiquetaTabla(fila.tabla) }}
          </q-item-label>
          <q-item-label caption class="text-grey-5">
            {{ fila.email || 'Usuario sin correo' }}
          </q-item-label>
        </q-item-section>
        <q-item-section side class="text-grey-4 text-caption">
          {{ cuando(fila.created_at) }}
        </q-item-section>
      </q-item>
    </q-list>

    <div v-else-if="!cargando" class="text-grey-5 q-pa-lg text-center">
      Todavía no hay acciones con ese filtro.
    </div>

    <q-inner-loading :showing="cargando" />
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { supabase } from 'boot/supabase'

const ACCIONES = {
  insert: 'Cargó',
  update: 'Editó',
  delete: 'Borró',
  login: 'Entró',
  logout: 'Salió',
}

const TABLAS = {
  evaluaciones: 'un pesaje',
  eventos_sanitarios: 'un evento sanitario',
  eventos_reproductivos: 'un evento reproductivo',
  movimientos_de_lotes: 'un movimiento de lote',
  registros_lluvia: 'una lluvia',
  registros_vision: 'una lectura de visión',
  situaciones_lote: 'una situación del lote',
  inventario_items: 'un ítem de despensa',
  inventario_movimientos: 'una comida o movimiento de stock',
  analisis_de_agua: 'un análisis de agua',
  fuentes_de_agua: 'una aguada',
  consumos_de_dieta: 'un plan de dieta',
  miembros_establecimiento: 'un miembro del equipo',
  lotes: 'un lote',
  potreros: 'un potrero',
  sesion: 'la sesión',
}

const filas = ref([])
const cargando = ref(true)
const error = ref('')
const busca = ref('')
const accion = ref(null)
const tabla = ref(null)

const acciones = Object.entries(ACCIONES).map(([value, label]) => ({ value, label }))
const tablas = Object.entries(TABLAS).map(([value, label]) => ({
  value,
  label: label.charAt(0).toUpperCase() + label.slice(1),
}))

const filtradas = computed(() => {
  const q = (busca.value || '').trim().toLowerCase()
  return filas.value.filter((f) => {
    if (accion.value && f.accion !== accion.value) return false
    if (tabla.value && f.tabla !== tabla.value) return false
    if (!q) return true
    return (f.email || '').toLowerCase().includes(q)
  })
})

function etiquetaAccion(valor) {
  return ACCIONES[valor] || valor
}

function etiquetaTabla(valor) {
  return TABLAS[valor] || valor
}

function cuando(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(async () => {
  const { data, error: err } = await supabase
    .from('auditoria')
    .select('id, email, accion, tabla, created_at')
    .order('created_at', { ascending: false })
    .limit(300)
  cargando.value = false
  if (err) {
    error.value = 'No se pudo leer la auditoría.'
    return
  }
  filas.value = data || []
})
</script>
