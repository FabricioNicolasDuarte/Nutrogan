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
          Mi Despensa
        </div>
      </div>
    </div>

    <div class="row q-col-gutter-md q-mb-xl">
      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card relative-position overflow-hidden border-neon-left">
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="monetization_on" size="3em" color="primary" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              Valuación
            </div>
            <div class="text-h3 text-weight-bold text-primary font-numeric text-glow">
              ${{ formatCurrency(kpiResumen.valorTotal) }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Capital en insumos</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card relative-position overflow-hidden border-cyan-left">
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="inventory" size="3em" color="cyan-4" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              Disponibilidad
            </div>
            <div class="text-h3 text-weight-bold text-cyan-4 font-numeric">
              {{ kpiResumen.itemsOperativos }} / {{ kpiResumen.totalItems }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Items con stock operativo</div>
          </q-card-section>
          <q-linear-progress
            :value="safeDivision(kpiResumen.itemsOperativos, kpiResumen.totalItems)"
            color="cyan-4"
            track-color="dark"
            class="absolute-bottom"
            size="4px"
          />
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card flat class="kpi-card relative-position overflow-hidden border-white-left">
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="production_quantity_limits" size="3em" color="white" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              Reposición
            </div>
            <div class="text-h3 text-weight-bold text-white font-numeric">
              {{ kpiResumen.criticos }}
            </div>
            <div class="text-caption text-grey-5 q-mt-xs">Items en punto de pedido</div>
          </q-card-section>
          <q-linear-progress
            :value="safeDivision(kpiResumen.criticos, kpiResumen.totalItems)"
            color="white"
            track-color="dark"
            class="absolute-bottom"
            size="4px"
          />
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-md-3">
        <q-card
          flat
          class="kpi-card relative-position overflow-hidden border-blue-left cursor-pointer kpi-sync"
          v-ripple
          @click="abrirHistorial"
        >
          <div class="absolute-right q-ma-md opacity-20">
            <q-icon name="history" size="3em" color="secondary" />
          </div>
          <q-card-section>
            <div class="text-caption text-grey-4 text-uppercase font-mono tracking-wide">
              Logística
            </div>
            <div class="text-h4 text-weight-bold text-white q-mt-xs">Historial</div>
            <div class="text-caption text-secondary q-mt-xs font-mono">
              Ver movimientos <q-icon name="arrow_forward" size="xs" />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row items-center justify-between q-mb-lg q-col-gutter-md">
      <div class="col-12 col-md-4">
        <q-input
          v-model="filtroNombre"
          placeholder="Buscar insumo..."
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
      <div class="col-12 col-md-3">
        <q-select
          v-model="filtroCategoria"
          :options="['Todas', 'Alimento', 'Medicina', 'Suplemento', 'Vacuna', 'Otro']"
          label="Categoría"
          outlined
          dense
          dark
          color="primary"
          popup-content-class="glass-dialog-form"
          options-dense
        />
      </div>
      <div class="col-12 col-md-5 text-right row justify-end q-gutter-x-sm">
        <q-btn
          color="primary"
          icon="add"
          label="Nuevo Insumo"
          class="text-black text-weight-bold shadow-glow"
          @click="abrirFormItem(null)"
        />
      </div>
    </div>

    <div class="row q-col-gutter-lg">
      <div v-if="itemsFiltrados.length === 0" class="col-12 text-center text-grey-6 q-pa-xl">
        <q-icon name="inventory_2" size="5em" class="opacity-50" />
        <div class="text-h6 q-mt-md">Inventario vacío o sin resultados.</div>
      </div>

      <div v-for="item in itemsPaginados" :key="item.id" class="col-12 col-sm-6 col-md-4 col-lg-3">
        <q-card
          class="stock-card full-height column justify-between"
          :class="getStockBorderClass(item)"
        >
          <q-card-section class="q-pb-xs">
            <div class="row items-center no-wrap">
              <div
                class="stock-icon-wrapper q-mr-md"
                :class="getCategoryColorClass(item.categoria)"
              >
                <q-icon :name="getCategoryIcon(item.categoria)" size="24px" />
              </div>

              <div class="col overflow-hidden">
                <div class="text-subtitle1 text-weight-bold ellipsis text-white">
                  {{ item.nombre }}
                </div>
                <div class="text-caption text-grey-5 font-mono text-uppercase">
                  {{ item.categoria }}
                </div>
              </div>

              <q-btn flat round dense icon="more_vert" color="grey-5">
                <q-menu class="bg-dark text-white border-neon">
                  <q-list dense style="min-width: 140px">
                    <q-item clickable v-close-popup @click="abrirFormItem(item)">
                      <q-item-section avatar><q-icon name="edit" size="xs" /></q-item-section>
                      <q-item-section>Editar</q-item-section>
                    </q-item>
                    <q-item
                      clickable
                      v-close-popup
                      @click="confirmarEliminar(item)"
                      class="text-red"
                    >
                      <q-item-section avatar><q-icon name="delete" size="xs" /></q-item-section>
                      <q-item-section>Desactivar</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </q-card-section>

          <q-card-section class="q-py-md">
            <div class="row items-baseline justify-center">
              <span class="text-h3 font-numeric text-weight-bold" :class="getStockTextClass(item)">
                {{ formatStock(item.stock_actual) }}
              </span>
              <span class="text-subtitle2 text-grey-6 q-ml-sm font-mono">{{ item.unidad }}</span>
            </div>

            <div class="text-center text-caption text-grey-5 q-mb-md font-mono">
              ${{ formatCurrency(item.precio_unitario) }} / {{ item.unidad }}
            </div>

            <div class="q-px-sm">
              <div
                class="row justify-between text-caption text-grey-6 q-mb-xs"
                style="font-size: 0.7em"
              >
                <span>Crit: {{ formatStock(item.stock_minimo_alerta) }}</span>
                <span>{{ getStockStatusLabel(item) }}</span>
              </div>
              <div class="stock-track relative-position">
                <div
                  class="stock-bar"
                  :style="{
                    width: getStockPercentage(item) + '%',
                    backgroundColor: getStockColorHex(item),
                  }"
                ></div>
              </div>
            </div>
          </q-card-section>

          <q-separator dark class="opacity-10" />
          <q-card-actions class="bg-dark-soft row q-col-gutter-sm q-pa-sm">
            <div class="col-6">
              <q-btn
                flat
                color="white"
                class="full-width font-weight-bold bg-white-10"
                icon="remove"
                label="Usar"
                size="sm"
                @click="abrirFormMovimiento(item, 'uso')"
              />
            </div>
            <div class="col-6">
              <q-btn
                flat
                color="primary"
                class="full-width font-weight-bold bg-primary-10"
                icon="add"
                label="Comprar"
                size="sm"
                @click="abrirFormMovimiento(item, 'compra')"
              />
            </div>
          </q-card-actions>
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

    <q-dialog v-model="dialogos.formItem" persistent class="glass-dialog-form">
      <FormInventarioItem :item-editar="itemSeleccionado" @close="dialogos.formItem = false" />
    </q-dialog>

    <q-dialog v-model="dialogos.formMovimiento" persistent class="glass-dialog-form">
      <FormMovimientoInventario
        v-if="itemSeleccionado"
        :item="itemSeleccionado"
        :tipo="tipoMovimiento"
        @close="dialogos.formMovimiento = false"
      />
    </q-dialog>

    <q-dialog v-model="dialogos.historial" class="glass-dialog-form">
      <q-card class="bg-dark text-white border-neon" style="width: 700px; max-width: 90vw">
        <q-card-section class="row items-center justify-between bg-dark-header">
          <div class="text-h6 font-outfit">Logística de Insumos</div>
          <q-btn icon="close" flat round dense v-close-popup color="grey-5" />
        </q-card-section>
        <q-card-section class="q-pa-none">
          <q-list dark separator class="scroll" style="max-height: 50vh">
            <q-item v-for="mov in dataStore.inventarioMovimientos" :key="mov.id">
              <q-item-section avatar>
                <q-avatar
                  :color="mov.tipo_movimiento === 'Compra' ? 'green-9' : 'grey-8'"
                  text-color="white"
                  :icon="mov.tipo_movimiento === 'Compra' ? 'add' : 'remove'"
                  size="md"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold">{{
                  mov.inventario_items?.nombre
                }}</q-item-label>
                <q-item-label caption class="text-grey-4">
                  <span
                    :class="mov.tipo_movimiento === 'Compra' ? 'text-green-4' : 'text-orange-4'"
                  >
                    {{ mov.cantidad > 0 ? '+' : '' }}{{ formatStock(mov.cantidad) }}
                    {{ mov.inventario_items?.unidad }}
                  </span>
                  <span v-if="mov.lotes"> • Destino: {{ mov.lotes.identificacion }}</span>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-item-label caption class="text-grey-5 font-mono">{{
                  formatearFecha(mov.fecha)
                }}</q-item-label>
                <q-item-label v-if="mov.costo_total > 0" class="text-green-4 font-mono text-caption"
                  >${{ formatCurrency(mov.costo_total) }}</q-item-label
                >
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useDataStore } from 'stores/data-store'
import { useQuasar } from 'quasar'

import FormInventarioItem from 'components/despensa/FormInventarioItem.vue'
import FormMovimientoInventario from 'components/despensa/FormMovimientoInventario.vue'

const dataStore = useDataStore()
const $q = useQuasar()

// --- Estados UI ---
const page = ref(1)
const pageSize = 8
const filtroNombre = ref('')
const filtroCategoria = ref('Todas')

const dialogos = reactive({
  formItem: false,
  formMovimiento: false,
  historial: false,
})
const itemSeleccionado = ref(null)
const tipoMovimiento = ref('uso')

// --- KPIS Inteligentes (CORREGIDO) ---
const kpiResumen = computed(() => {
  // Aseguramos reactividad usando directamente la referencia del store
  const items = dataStore.inventarioItems || []

  const valorTotal = items.reduce((acc, item) => {
    // Evitamos sumar valuación negativa si el stock es negativo por error de uso
    // CORRECCIÓN: Convertimos todo a Number()
    const stockValido = Math.max(0, Number(item.stock_actual || 0))
    const precio = Number(item.precio_unitario || 0)
    return acc + stockValido * precio
  }, 0)

  // CORRECCIÓN: Conversión explícita para evitar comparación de strings
  const criticos = items.filter(
    (i) => Number(i.stock_actual || 0) <= Number(i.stock_minimo_alerta || 0),
  ).length

  // Stock operativo: Items que tienen más del minimo
  const itemsOperativos = items.filter(
    (i) => Number(i.stock_actual || 0) > Number(i.stock_minimo_alerta || 0),
  ).length

  return {
    valorTotal,
    totalItems: items.length,
    criticos,
    itemsOperativos,
  }
})

// --- Filtrado y Paginación ---
const itemsFiltrados = computed(() => {
  return dataStore.inventarioItems.filter((item) => {
    const matchNombre = filtroNombre.value
      ? item.nombre.toLowerCase().includes(filtroNombre.value.toLowerCase())
      : true
    const matchCat =
      filtroCategoria.value !== 'Todas' ? item.categoria === filtroCategoria.value : true
    return matchNombre && matchCat
  })
})

const totalPages = computed(() => Math.ceil(itemsFiltrados.value.length / pageSize))
const itemsPaginados = computed(() => {
  const start = (page.value - 1) * pageSize
  return itemsFiltrados.value.slice(start, start + pageSize)
})

watch([filtroNombre, filtroCategoria], () => (page.value = 1))

// --- Helpers Visuales (Paleta Pro) ---

function getCategoryIcon(categoria) {
  switch (categoria) {
    case 'Alimento':
      return 'grain'
    case 'Medicina':
      return 'medication'
    case 'Suplemento':
      return 'science'
    case 'Vacuna':
      return 'vaccines'
    default:
      return 'inventory_2'
  }
}

function getCategoryColorClass(categoria) {
  switch (categoria) {
    case 'Alimento':
      return 'icon-lime'
    case 'Medicina':
      return 'icon-blue'
    case 'Vacuna':
      return 'icon-neon'
    case 'Suplemento':
      return 'icon-cyan'
    default:
      return 'icon-grey'
  }
}

function getStockBorderClass(item) {
  const stock = Number(item.stock_actual || 0)
  const min = Number(item.stock_minimo_alerta || 0)

  if (stock <= 0) return 'border-red-card'
  if (stock <= min) return 'border-white-card' // Alerta alta
  return 'border-neon-card' // Normal
}

function getStockTextClass(item) {
  const stock = Number(item.stock_actual || 0)
  const min = Number(item.stock_minimo_alerta || 0)

  if (stock <= 0) return 'text-red-5'
  if (stock <= min) return 'text-white'
  return 'text-primary'
}

function getStockColorHex(item) {
  const stock = Number(item.stock_actual || 0)
  const min = Number(item.stock_minimo_alerta || 0)

  if (stock <= 0) return '#ff1744' // Rojo
  if (stock <= min) return '#ffffff' // Blanco (Crítico)
  return '#39ff14' // Verde Neon (OK)
}

function getStockStatusLabel(item) {
  const stock = Number(item.stock_actual || 0)
  const min = Number(item.stock_minimo_alerta || 0)

  if (stock <= 0) return 'AGOTADO'
  if (stock <= min) return 'BAJO STOCK'
  return 'OPTIMO'
}

function getStockPercentage(item) {
  const stock = Number(item.stock_actual || 0)
  const min = Number(item.stock_minimo_alerta || 0)

  if (stock <= 0) return 0

  // Referencia visual: El 100% de la barra es 3 veces el mínimo, o 100 si no hay mínimo.
  const baseRef = min * 3 || 100
  const pct = (stock / baseRef) * 100
  return Math.min(pct, 100)
}

function safeDivision(a, b) {
  if (!b || b === 0) return 0
  return a / b
}

function formatCurrency(val) {
  return (val || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatStock(val) {
  // Muestra hasta 2 decimales si es necesario, si es entero no muestra decimales
  return Number(val || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })
}

function formatearFecha(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

// --- Acciones CRUD ---

function abrirFormItem(item) {
  itemSeleccionado.value = item
  dialogos.formItem = true
}

function abrirFormMovimiento(item, tipo) {
  itemSeleccionado.value = item
  tipoMovimiento.value = tipo
  dialogos.formMovimiento = true
}

async function abrirHistorial() {
  await dataStore.fetchInventarioMovimientos()
  dialogos.historial = true
}

function confirmarEliminar(item) {
  $q.dialog({
    title: 'Desactivar Item',
    message: `¿Ocultar "${item.nombre}" del inventario?`,
    dark: true,
    cancel: true,
    class: 'glass-dialog-form',
  }).onOk(async () => {
    await dataStore.deleteInventarioItem(item.id)
    $q.notify({ type: 'positive', message: 'Item desactivado' })
  })
}

onMounted(() => {
  if (dataStore.inventarioItems.length === 0) dataStore.fetchInventarioItems()
})
</script>

<style lang="scss" scoped>
/* Fondo Pro */
.dashboard-pro-bg {
  background-image: url('src/assets/nutrogan-bg.jpg');
  background-size: cover;
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
.border-cyan-left {
  border-left: 4px solid #00e5ff;
}
.border-white-left {
  border-left: 4px solid #ffffff;
}
.border-blue-left {
  border-left: 4px solid #0037ff;
}

/* Stock Cards */
.stock-card {
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

/* Bordes de Estado */
.border-neon-card {
  border-left: 3px solid #39ff14;
}
.border-white-card {
  border-left: 3px solid #ffffff;
} /* Crítico/Alerta */
.border-red-card {
  border-left: 3px solid #ff1744;
} /* Agotado */

/* Icon Wrappers (Categorías) */
.stock-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  &.icon-lime {
    color: #ccff00;
    background: rgba(204, 255, 0, 0.1);
  }
  &.icon-blue {
    color: #0037ff;
    background: rgba(0, 55, 255, 0.1);
  }
  &.icon-neon {
    color: #39ff14;
    background: rgba(57, 255, 20, 0.1);
  }
  &.icon-cyan {
    color: #00e5ff;
    background: rgba(0, 229, 255, 0.1);
  }
  &.icon-grey {
    color: #bdbdbd;
    background: rgba(255, 255, 255, 0.05);
  }
}

/* Barra de Stock */
.stock-track {
  height: 6px;
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 4px;
}
.stock-bar {
  height: 100%;
  transition: width 0.5s ease;
}

/* Utilidades */
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
.bg-dark-soft {
  background: rgba(0, 0, 0, 0.3);
}
.bg-dark-header {
  background: #050505;
}
.bg-white-10 {
  background: rgba(255, 255, 255, 0.1);
}
.bg-primary-10 {
  background: rgba(57, 255, 20, 0.1);
}

/* Inputs */
.glass-input :deep(.q-field__control) {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(5px);
  border-radius: 8px;
}

/* Pagination */
:deep(.glass-pagination .q-btn) {
  background: rgba(0, 0, 0, 0.3) !important;
  backdrop-filter: blur(4px);
}
:deep(.glass-pagination .q-btn.text-black) {
  background: #39ff14 !important;
  color: black !important;
  font-weight: bold;
}
</style>
