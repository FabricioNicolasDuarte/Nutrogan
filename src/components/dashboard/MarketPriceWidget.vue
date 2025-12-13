<template>
  <q-card class="glass-widget column justify-between full-height">
    <div class="row items-center justify-between q-mb-sm relative-position z-10">
      <div class="row items-center">
        <div class="icon-box q-mr-sm">
          <q-icon name="show_chart" color="white" size="xs" />
        </div>
        <div class="column">
          <span
            class="text-caption text-grey-5 font-mono text-uppercase tracking-wider line-height-tight"
          >
            REFERENCIA
          </span>
          <span class="text-caption text-white font-weight-bold line-height-tight">
            {{ dataStore.marketPrice.source }}
          </span>
        </div>
      </div>

      <div class="row items-center">
        <q-btn flat round dense icon="help_outline" color="grey-6" size="sm" class="q-mr-xs">
          <q-tooltip
            class="bg-dark-glass border-neon text-white q-pa-md"
            style="max-width: 280px; font-size: 0.85rem"
            anchor="bottom middle"
            self="top middle"
            :offset="[0, 10]"
          >
            <div class="text-subtitle2 text-green-13 q-mb-xs font-outfit">Contexto del Valor</div>
            <p class="text-caption text-grey-3 q-mb-sm">
              Precio base del kilogramo vivo utilizado para calcular la valuación total de tu
              hacienda.
            </p>

            <div class="bg-white-05 q-pa-xs rounded-borders q-mb-sm">
              <div class="text-caption text-grey-4">
                <q-icon name="dataset" size="xs" class="q-mr-xs" />
                Origen del Dato:
              </div>
              <div class="text-body2 text-white font-weight-bold">
                {{
                  dataStore.marketPrice.mode === 'auto'
                    ? 'Mercado Agroganadero (API)'
                    : 'Estimación Propia (Manual)'
                }}
              </div>
              <div class="text-caption text-grey-5" style="font-size: 0.7rem">
                {{
                  dataStore.marketPrice.mode === 'auto'
                    ? 'Sincronizado en tiempo real.'
                    : 'Valor fijado por el usuario.'
                }}
              </div>
            </div>

            <div class="text-subtitle2 text-green-13 q-mb-xs font-outfit">Impacto:</div>
            <ul class="q-pl-md q-ma-0 text-caption text-grey-3">
              <li>Valuación patrimonial del stock.</li>
              <li>Cálculo de márgenes de rentabilidad.</li>
            </ul>
          </q-tooltip>
        </q-btn>

        <q-btn flat round dense icon="settings" color="grey-6" size="sm">
          <q-menu class="bg-dark-glass text-white border-neon" :offset="[0, 10]">
            <q-list style="min-width: 220px">
              <q-item-label header class="text-grey-5 font-mono text-caption q-pb-xs">
                MODO DE PRECIO
              </q-item-label>

              <q-item clickable v-ripple @click="toggleAutoMode">
                <q-item-section avatar>
                  <q-icon
                    :name="dataStore.marketPrice.mode === 'auto' ? 'cloud_sync' : 'edit_off'"
                    :color="dataStore.marketPrice.mode === 'auto' ? 'green-13' : 'grey-5'"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Automático</q-item-label>
                  <q-item-label caption class="text-grey-6">Sincronizar con Mercado</q-item-label>
                </q-item-section>
                <q-item-section side v-if="dataStore.marketPrice.mode === 'auto'">
                  <q-icon name="check" color="green-13" size="xs" />
                </q-item-section>
              </q-item>

              <q-item clickable v-ripple @click="activarManual">
                <q-item-section avatar>
                  <q-icon
                    name="edit"
                    :color="dataStore.marketPrice.mode === 'manual' ? 'green-13' : 'grey-5'"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Manual</q-item-label>
                  <q-item-label caption class="text-grey-6">Fijar valor fijo</q-item-label>
                </q-item-section>
                <q-item-section side v-if="dataStore.marketPrice.mode === 'manual'">
                  <q-icon name="check" color="green-13" size="xs" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </div>

    <div class="column justify-center q-py-md relative-position z-10">
      <div class="row items-baseline justify-center">
        <span class="text-h3 font-numeric text-weight-bold text-white q-mr-xs text-glow">
          $ {{ formatPrice(dataStore.marketPrice.value) }}
        </span>
        <span class="text-h6 text-grey-5 font-mono">/kg</span>
      </div>

      <div class="row justify-center q-mt-xs">
        <q-badge
          :color="isLive ? 'green-13' : 'blue-grey-8'"
          text-color="black"
          class="font-mono text-weight-bold q-px-sm"
          rounded
        >
          <q-icon :name="isLive ? 'wifi' : 'lock'" size="10px" class="q-mr-xs" />
          {{ isLive ? 'LIVE' : 'FIJO' }}
        </q-badge>
      </div>
    </div>

    <div class="row items-center justify-between border-top-soft q-pt-sm relative-position z-10">
      <span class="text-caption text-grey-6 font-mono">Actualizado:</span>
      <span class="text-caption text-white font-mono">{{ lastUpdate }}</span>
    </div>

    <q-inner-loading :showing="loading" dark class="bg-dark-glass">
      <q-spinner-bars color="green-13" size="2em" />
    </q-inner-loading>

    <div class="bg-gradient"></div>

    <q-dialog v-model="showEditDialog" persistent backdrop-filter="blur(4px)">
      <q-card class="bg-dark text-white border-neon shadow-neon" style="min-width: 300px">
        <q-card-section class="bg-dark-header row items-center">
          <q-icon name="edit" color="green-13" size="sm" class="q-mr-sm" />
          <div class="text-h6 font-outfit">Fijar Precio Manual</div>
        </q-card-section>

        <q-card-section class="q-pt-lg">
          <div class="text-caption text-grey-4 q-mb-sm">
            Ingrese el valor de referencia (ARS/kg):
          </div>
          <q-input
            v-model.number="tempPrice"
            type="number"
            outlined
            dark
            color="green-13"
            autofocus
            class="input-neon font-numeric text-h6"
            prefix="$"
            @keyup.enter="saveManual"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md bg-dark-soft">
          <q-btn flat label="Cancelar" color="white" v-close-popup />
          <q-btn
            unelevated
            label="Confirmar"
            color="green-13"
            text-color="black"
            class="text-weight-bold"
            @click="saveManual"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDataStore } from 'stores/data-store'
import { useQuasar, date } from 'quasar'

const dataStore = useDataStore()
const $q = useQuasar()
const loading = ref(false)
const showEditDialog = ref(false)
const tempPrice = ref(0)

const isLive = computed(() => dataStore.marketPrice.mode === 'auto')

const lastUpdate = computed(() => {
  if (!dataStore.marketPrice.lastUpdated) return '--:--'
  return date.formatDate(dataStore.marketPrice.lastUpdated, 'DD/MM HH:mm')
})

function formatPrice(val) {
  return val
    ? val.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : '0'
}

function activarManual() {
  tempPrice.value = dataStore.marketPrice.value
  showEditDialog.value = true
}

function saveManual() {
  if (tempPrice.value > 0) {
    dataStore.setManualPrice(tempPrice.value)
    showEditDialog.value = false
    $q.notify({
      type: 'positive',
      message: 'Precio fijado manualmente',
      icon: 'check_circle',
      timeout: 1500,
    })
  }
}

async function toggleAutoMode() {
  if (dataStore.marketPrice.mode === 'auto') {
    loading.value = true
    try {
      await dataStore.fetchMarketPriceAuto()
      $q.notify({
        type: 'positive',
        message: 'Sincronizado con Mercado',
        icon: 'cloud_sync',
        timeout: 1000,
      })
    } catch {
      $q.notify({ type: 'negative', message: 'Error de conexión' })
    } finally {
      loading.value = false
    }
  } else {
    loading.value = true
    try {
      await dataStore.fetchMarketPriceAuto()
      if (dataStore.marketPrice.mode !== 'auto') {
        // Fallback si el store no actualizó el modo automáticamente
      }
      $q.notify({
        type: 'positive',
        message: 'Modo Automático Activado',
        icon: 'auto_mode',
      })
    } catch {
      $q.notify({ type: 'negative', message: 'No se pudo conectar al mercado' })
    } finally {
      loading.value = false
    }
  }
}
</script>

<style lang="scss" scoped>
/* Estilos Glassmorphism Unificados */
.glass-widget {
  background: rgba(15, 15, 20, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(57, 255, 20, 0.3); /* Verde Neón al hover */
    box-shadow: 0 0 20px rgba(57, 255, 20, 0.1);
  }
}

.icon-box {
  width: 28px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bg-gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 100% 0%, rgba(57, 255, 20, 0.08) 0%, transparent 50%);
  pointer-events: none;
}

/* Tipografía */
.font-mono {
  font-family: 'Fira Code', monospace;
}
.font-numeric {
  font-family: 'Outfit', sans-serif;
}
.font-outfit {
  font-family: 'Outfit', sans-serif;
}
.text-glow {
  text-shadow: 0 0 20px rgba(57, 255, 20, 0.4);
}
.line-height-tight {
  line-height: 1.1;
}
.tracking-wider {
  letter-spacing: 1px;
}

.border-top-soft {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* Menú & Tooltip Glass */
.bg-dark-glass {
  background: rgba(15, 15, 20, 0.95) !important;
  backdrop-filter: blur(10px);
}
.border-neon {
  border: 1px solid rgba(57, 255, 20, 0.3);
}
.bg-dark-header {
  background: #0a0a0a;
}
.bg-dark-soft {
  background: rgba(255, 255, 255, 0.05);
}
.shadow-neon {
  box-shadow: 0 0 20px rgba(57, 255, 20, 0.2);
}
.bg-white-05 {
  background: rgba(255, 255, 255, 0.05);
}

/* Input Neon */
.input-neon :deep(.q-field__control:before) {
  border-color: rgba(255, 255, 255, 0.3);
}
.input-neon :deep(.q-field__control:after) {
  border-color: #39ff14; /* Verde Neón */
  border-width: 2px;
}
.input-neon :deep(.q-field__native) {
  font-weight: bold;
  letter-spacing: 1px;
}
</style>
