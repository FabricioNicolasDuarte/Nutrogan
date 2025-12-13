<template>
  <q-page padding class="dashboard-pro-bg text-white">
    <div class="relative-position q-mb-xl q-pt-sm" style="min-height: 60px">
      <div class="absolute-left" style="z-index: 10">
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

      <div class="absolute-center full-width text-center pointer-events-none" style="z-index: 0">
        <div class="page-title-box shadow-5" style="margin: 0; pointer-events: auto">
          Mis Potreros
        </div>
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-xl">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card relative-position overflow-hidden border-neon-left">
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="grid_view" size="3em" color="primary" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              Inventario
            </div>
            <div class="text-h3 text-weight-bold text-primary font-numeric text-glow">
              {{ estadisticas.total }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Lotes de tierra</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card relative-position overflow-hidden border-cyan-left">
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="draw" size="3em" color="cyan-4" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              Digitalizados
            </div>
            <div class="text-h3 text-weight-bold text-cyan-4 font-numeric">
              {{ estadisticas.conGeometria }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Con polígono GPS</div>
          </q-card-section>
          <q-linear-progress
            :value="estadisticas.porcentajeConGeometria"
            color="cyan-4"
            track-color="dark"
            class="absolute-bottom"
            size="4px"
          />
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card relative-position overflow-hidden border-blue-left">
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="satellite_alt" size="3em" color="secondary" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              Monitoreados
            </div>
            <div class="text-h3 text-weight-bold text-secondary font-numeric">
              {{ estadisticas.conNdvi }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Con datos satelitales</div>
          </q-card-section>
          <q-linear-progress
            :value="estadisticas.porcentajeConNdvi"
            color="secondary"
            track-color="dark"
            class="absolute-bottom"
            size="4px"
          />
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card relative-position overflow-hidden border-white-left">
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="layers" size="3em" color="white" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              Superficie
            </div>
            <div class="text-h3 text-weight-bold text-white font-numeric">
              {{ estadisticas.areaTotal.toFixed(0) }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Hectáreas totales</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row items-center justify-between q-mb-lg q-col-gutter-md">
      <div class="col-12 col-md-5">
        <q-input
          v-model="filtro"
          placeholder="Buscar potrero..."
          outlined
          dense
          dark
          color="primary"
          class="glass-input"
        >
          <template v-slot:prepend>
            <q-icon name="search" color="grey-5" />
          </template>
        </q-input>
      </div>

      <div class="col-12 col-md-7 text-right row justify-end q-gutter-x-sm">
        <q-btn-dropdown outline color="white" label="Ordenar" icon="sort" class="glass-btn" no-caps>
          <q-list class="bg-dark text-white border-neon">
            <q-item clickable v-close-popup @click="ordenarPor = 'nombre'">
              <q-item-section>Nombre (A-Z)</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="ordenarPor = 'area'">
              <q-item-section>Superficie (Mayor a Menor)</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="ordenarPor = 'ndvi'">
              <q-item-section>Vigor NDVI (Mayor a Menor)</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <q-btn
          color="primary"
          icon="add"
          label="Nuevo Potrero"
          class="text-black text-weight-bold shadow-glow"
          @click="mostrarDialogoNuevo = true"
        />
      </div>
    </div>

    <div class="row q-col-gutter-lg">
      <div v-for="potrero in potrerosPaginados" :key="potrero.id" class="col-12 col-md-6 col-lg-4">
        <q-card
          class="potrero-card full-height column justify-between"
          :class="!potrero.geometria ? 'border-orange-card' : 'border-neon-card'"
        >
          <q-card-section class="q-pb-sm">
            <div class="row items-center no-wrap">
              <div class="potrero-icon-wrapper q-mr-md">
                <div
                  class="potrero-icon-shape"
                  :style="{
                    '-webkit-mask-image': `url(${getPotreroIconPath(potrero)})`,
                    'mask-image': `url(${getPotreroIconPath(potrero)})`,
                    backgroundColor: getNdviColorHex(potrero.ultimo_ndvi),
                  }"
                ></div>
              </div>

              <div class="col overflow-hidden">
                <div class="text-h6 ellipsis">{{ potrero.nombre }}</div>
                <div class="text-caption text-grey-5 font-mono">
                  {{ potrero.tipo || 'General' }}
                  <span v-if="potrero.ciudad" class="text-cyan-4"> | {{ potrero.ciudad }}</span>
                </div>
              </div>

              <q-btn flat round dense icon="more_vert" color="grey-5">
                <q-menu class="bg-dark text-white border-neon">
                  <q-list dense style="min-width: 140px">
                    <q-item clickable v-close-popup @click="editarPotrero(potrero)">
                      <q-item-section avatar><q-icon name="edit" size="xs" /></q-item-section>
                      <q-item-section>Editar</q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      v-close-popup
                      @click="$router.push(`/recursos/potreros/draw/${potrero.id}`)"
                    >
                      <q-item-section avatar><q-icon name="draw" size="xs" /></q-item-section>
                      <q-item-section>{{
                        potrero.geometria ? 'Editar Polígono' : 'Dibujar'
                      }}</q-item-section>
                    </q-item>
                    <q-separator dark />
                    <q-item
                      clickable
                      v-close-popup
                      @click="confirmarEliminar(potrero)"
                      class="text-red"
                    >
                      <q-item-section avatar><q-icon name="delete" size="xs" /></q-item-section>
                      <q-item-section>Eliminar</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </q-card-section>

          <q-separator dark inset class="opacity-10" />

          <q-card-section class="q-py-md">
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <div class="metric-box">
                  <div class="label text-grey-5">Superficie</div>
                  <div class="value font-numeric text-white">
                    {{ potrero.superficie_ha ? potrero.superficie_ha.toFixed(1) : '0' }}
                    <span class="text-caption">ha</span>
                  </div>
                </div>
              </div>
              <div class="col-6">
                <div class="metric-box">
                  <div class="label text-grey-5">Vigor (NDVI)</div>
                  <div
                    class="value font-numeric"
                    :style="{ color: getNdviColorHex(potrero.ultimo_ndvi) }"
                  >
                    {{
                      typeof potrero.ultimo_ndvi === 'number' ? potrero.ultimo_ndvi.toFixed(2) : '-'
                    }}
                  </div>
                </div>
              </div>
            </div>

            <div v-if="typeof potrero.ultimo_ndvi === 'number'" class="q-mt-md">
              <div class="row justify-between text-caption text-grey-6 font-mono q-mb-xs">
                <span>Salud</span>
                <span>{{ getEstadoPotrero(potrero) }}</span>
              </div>
              <div class="ndvi-track-mini relative-position">
                <div
                  class="ndvi-bar-fill"
                  :style="{
                    width: getNdviPercentage(potrero.ultimo_ndvi) + '%',
                    backgroundColor: getNdviColorHex(potrero.ultimo_ndvi),
                  }"
                ></div>
              </div>
            </div>

            <div v-if="!potrero.geometria" class="q-mt-md text-center">
              <q-chip
                color="orange-9"
                text-color="white"
                icon="warning"
                label="Sin Polígono"
                size="sm"
              />
            </div>
          </q-card-section>

          <div>
            <q-separator dark class="opacity-10" />
            <q-card-actions align="right" class="bg-dark-soft q-py-sm">
              <span class="text-caption text-grey-7 q-mr-auto q-pl-sm font-mono">
                {{ formatearFecha(potrero.fecha_ultimo_ndvi || potrero.updated_at) }}
              </span>

              <q-btn
                v-if="!potrero.geometria"
                flat
                dense
                color="white"
                icon="draw"
                label="Dibujar"
                @click="$router.push(`/recursos/potreros/draw/${potrero.id}`)"
              />
              <template v-else>
                <q-btn
                  flat
                  dense
                  color="primary"
                  icon="satellite_alt"
                  @click="analizarPotrero(potrero)"
                  :loading="analizando[potrero.id]"
                >
                  <q-tooltip class="bg-dark border-neon">Actualizar Satélite</q-tooltip>
                </q-btn>
              </template>
            </q-card-actions>
          </div>
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

    <q-dialog v-model="mostrarDialogoNuevo" persistent class="glass-dialog-form">
      <q-card style="min-width: 400px" class="bg-dark text-white border-neon">
        <q-form @submit="guardarPotrero" class="q-gutter-md">
          <q-card-section class="bg-dark-header">
            <div class="text-h6">{{ potreroEditando ? 'Editar' : 'Nuevo' }} Potrero</div>
          </q-card-section>

          <q-card-section class="q-pt-none q-gutter-md">
            <q-input
              v-model="formPotrero.nombre"
              label="Nombre del potrero"
              outlined
              dark
              color="primary"
              :rules="[(val) => !!val || 'Requerido']"
              autofocus
            />
            <q-select
              v-model="formPotrero.tipo"
              label="Tipo"
              outlined
              dark
              color="primary"
              :options="tiposPotrero"
              emit-value
              map-options
              popup-content-class="glass-dialog-form"
            />
            <q-input
              v-model="formPotrero.descripcion"
              label="Descripción (opcional)"
              type="textarea"
              outlined
              dark
              color="primary"
              rows="3"
            />
            <q-banner inline-actions rounded class="bg-dark-soft text-grey-4 border-white-left">
              <template v-slot:avatar>
                <q-icon name="info" color="white" />
              </template>
              <span class="text-caption">
                La superficie se calculará automáticamente al dibujar el polígono.
              </span>
            </q-banner>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md bg-dark-soft">
            <q-btn flat label="Cancelar" color="white" v-close-popup @click="resetForm" />
            <q-btn label="Guardar" color="primary" type="submit" :loading="guardando" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useDataStore } from 'stores/data-store'
import { useAuthStore } from 'stores/auth-store'
import { supabase } from 'boot/supabase'
import { useQuasar } from 'quasar'
import { useSound } from 'src/composables/useSound'

const dataStore = useDataStore()
const authStore = useAuthStore()
const $q = useQuasar()
const { playNdvi } = useSound()

// --- Paginación ---
const page = ref(1)
const pageSize = 6

const filtro = ref('')
const ordenarPor = ref('nombre')
const mostrarDialogoNuevo = ref(false)
const guardando = ref(false)
const analizando = reactive({})
const potreroEditando = ref(null)

const getFormVacio = () => ({
  nombre: '',
  tipo: null,
  descripcion: '',
})
const formPotrero = reactive(getFormVacio())

const tiposPotrero = [
  { label: 'Pastura', value: 'pastura' },
  { label: 'Campo natural', value: 'campo-natural' },
  { label: 'Verdeo', value: 'verdeo' },
  { label: 'Reserva', value: 'reserva' },
  { label: 'Otro', value: 'otro' },
]

// --- CORRECCIÓN AQUÍ: Aseguramos suma numérica para evitar concatenación de strings ---
const estadisticas = computed(() => {
  const potreros = dataStore.potreros || []
  const total = potreros.length
  const conGeometria = potreros.filter((p) => p.geometria).length
  const conNdvi = potreros.filter((p) => typeof p.ultimo_ndvi === 'number').length

  // Usamos Number() para convertir cualquier string numérico de la DB
  const areaTotal = potreros.reduce((sum, p) => sum + Number(p.superficie_ha || 0), 0)

  return {
    total,
    conGeometria,
    conNdvi,
    areaTotal,
    porcentajeConGeometria: total > 0 ? conGeometria / total : 0,
    porcentajeConNdvi: total > 0 ? conNdvi / total : 0,
  }
})

// --- Lógica de Filtrado y Paginación ---
const potrerosFiltrados = computed(() => {
  let potreros = dataStore.potreros || []

  if (filtro.value) {
    const busqueda = filtro.value.toLowerCase()
    potreros = potreros.filter(
      (p) =>
        p.nombre.toLowerCase().includes(busqueda) ||
        (p.tipo && p.tipo.toLowerCase().includes(busqueda)),
    )
  }

  return [...potreros].sort((a, b) => {
    switch (ordenarPor.value) {
      case 'area':
        return (Number(b.superficie_ha) || 0) - (Number(a.superficie_ha) || 0)
      case 'ndvi':
        return (b.ultimo_ndvi || -1) - (a.ultimo_ndvi || -1)
      default: // nombre
        return a.nombre.localeCompare(b.nombre)
    }
  })
})

const totalPages = computed(() => {
  return Math.ceil(potrerosFiltrados.value.length / pageSize)
})

const potrerosPaginados = computed(() => {
  const start = (page.value - 1) * pageSize
  const end = start + pageSize
  return potrerosFiltrados.value.slice(start, end)
})

watch(filtro, () => {
  page.value = 1
})

// --- Helper Functions Visuales ---
function getPotreroIconPath(potrero) {
  const tipo = potrero.tipo ? potrero.tipo.toLowerCase() : 'otro'
  let iconName = 'otro'

  if (tipo.includes('pastura')) iconName = 'pastura'
  else if (tipo.includes('campo-natural')) iconName = 'campo-natural'
  else if (tipo.includes('verdeo')) iconName = 'verdeo'
  else if (tipo.includes('reserva')) iconName = 'reserva'

  return `/icons/${iconName}.svg`
}

function getNdviColorHex(ndvi) {
  if (typeof ndvi !== 'number') return '#555555' // Gris
  if (ndvi < 0.2) return '#ffffff' // Blanco (Crítico)
  if (ndvi < 0.4) return '#0037ff' // Azul (Bajo)
  if (ndvi < 0.6) return '#00e5ff' // Cian (Regular)
  if (ndvi < 0.7) return '#ccff00' // Lima (Bueno)
  return '#39ff14' // Verde Neón (Excelente)
}

function getEstadoPotrero(potrero) {
  if (!potrero.geometria) return 'Sin mapa'
  if (typeof potrero.ultimo_ndvi !== 'number') return 'Sin datos'
  if (potrero.ultimo_ndvi >= 0.7) return 'Excelente'
  if (potrero.ultimo_ndvi >= 0.5) return 'Bueno'
  if (potrero.ultimo_ndvi >= 0.4) return 'Regular'
  if (potrero.ultimo_ndvi >= 0.2) return 'Bajo'
  return 'Crítico'
}

function getNdviPercentage(ndvi) {
  if (typeof ndvi !== 'number') return 0
  return Math.max(0, Math.min(1, ndvi)) * 100
}

function formatearFecha(fecha) {
  if (!fecha) return 'Nunca'
  const date = new Date(fecha)
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

// --- CRUD Operations ---
function editarPotrero(potrero) {
  potreroEditando.value = potrero
  Object.assign(formPotrero, {
    nombre: potrero.nombre,
    tipo: potrero.tipo,
    descripcion: potrero.descripcion || '',
  })
  mostrarDialogoNuevo.value = true
}

async function guardarPotrero() {
  guardando.value = true
  try {
    const datos = {
      ...formPotrero,
      establecimiento_id: authStore.profile?.establecimiento_id,
    }

    if (potreroEditando.value) {
      await dataStore.updateRegistro('potreros', potreroEditando.value.id, datos)
      $q.notify({ type: 'positive', message: 'Potrero actualizado' })
    } else {
      const datosCrear = { ...datos, superficie_ha: 0 }
      await dataStore.createRegistro('potreros', datosCrear)
      $q.notify({ type: 'positive', message: 'Potrero creado' })
    }
    await dataStore.fetchPotreros()
    mostrarDialogoNuevo.value = false
    resetForm()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error al guardar el potrero',
      caption: error.message,
    })
  } finally {
    guardando.value = false
  }
}

function resetForm() {
  potreroEditando.value = null
  Object.assign(formPotrero, getFormVacio())
}

async function confirmarEliminar(potrero) {
  $q.dialog({
    title: 'Confirmar eliminación',
    message: `¿Estás seguro de eliminar el potrero "${potrero.nombre}"?`,
    cancel: true,
    persistent: true,
    ok: {
      label: 'Eliminar',
      color: 'negative',
    },
    dark: true,
    class: 'glass-dialog-form',
  }).onOk(async () => {
    try {
      await dataStore.deactivateRegistro('potreros', potrero.id)
      $q.notify({ type: 'positive', message: 'Potrero eliminado correctamente' })
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Error al eliminar el potrero',
        caption: error.message,
      })
    }
  })
}

async function analizarPotrero(potrero) {
  playNdvi()
  analizando[potrero.id] = true
  try {
    const { data, error } = await supabase.functions.invoke('analizar-ndvi', {
      body: {
        establecimiento_id: authStore.profile?.establecimiento_id,
        potrero_ids: [potrero.id],
      },
    })
    if (error) throw error
    if (data.resultados && data.resultados.length > 0) {
      const resultado = data.resultados[0]
      if (resultado.estado === 'exitoso') {
        const potreroEnStore = dataStore.potreros.find((p) => p.id === potrero.id)
        if (potreroEnStore) {
          potreroEnStore.ultimo_ndvi = resultado.ndvi
          potreroEnStore.fecha_ultimo_ndvi = resultado.fecha
        }
        $q.notify({
          type: 'positive',
          message: 'Análisis completado',
          caption: `NDVI: ${resultado.ndvi.toFixed(2)}`,
        })
      } else {
        $q.notify({
          type: 'info',
          message: 'Datos aún no disponibles (Nubes)',
          caption: 'Intenta en unos minutos.',
        })
      }
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Error al analizar',
      caption: error.message,
    })
  } finally {
    analizando[potrero.id] = false
  }
}

onMounted(() => {
  if (dataStore.potreros.length === 0) {
    dataStore.fetchPotreros()
  }
})
</script>

<style lang="scss" scoped>
/* Estilos anteriores se mantienen igual... */
/* Fondo Pro */
.dashboard-pro-bg {
  background-image: url('src/assets/nutrogan-bg.jpg');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  min-height: 100vh;
}

.page-title-box {
  background: #000000;
  color: #ffffff;
  border: 2px solid #ffffff;
  border-radius: 20px;
  padding: 8px 24px;
  display: inline-block;
  font-family: 'Outfit', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
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

/* Potrero Cards */
.potrero-card {
  background: rgba(10, 10, 12, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  transition: all 0.3s ease;
  overflow: hidden;
  &:hover {
    box-shadow: 0 0 20px rgba(57, 255, 20, 0.15);
    background: rgba(15, 15, 20, 0.9);
  }
}

.border-orange-card {
  border-left: 4px solid #ff9800; /* Alerta si no tiene geo */
}
.border-neon-card {
  border-left: 4px solid #39ff14; /* OK */
}

/* Iconos Mask */
.potrero-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.potrero-icon-shape {
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

/* Mini Barra NDVI */
.ndvi-track-mini {
  height: 4px;
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}
.ndvi-bar-fill {
  height: 100%;
}

/* Utils */
.font-mono {
  font-family: 'Fira Code', monospace;
}
.font-numeric {
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

/* Estilos Dialog Glass */
:deep(.glass-dialog-form .q-card) {
  background: rgba(40, 40, 40, 0.85) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
}
:deep(.glass-dialog-form .q-field__label) {
  color: rgba(255, 255, 255, 0.7);
}
:deep(.glass-dialog-form .q-field__native) {
  color: white;
}
</style>
