<template>
  <q-page class="dashboard-pro-bg">
    <div class="backdrop-overlay"></div>

    <div class="central-stage full-width relative-position z-10 q-pa-md q-pb-xl">
      <div class="row items-center justify-between q-mb-md animate-slide-down">
        <div
          class="row items-center col-12 col-md-auto q-mb-sm-md q-mb-md-none"
          :class="{ 'justify-center text-center': $q.screen.lt.md }"
        >
          <q-btn round flat icon="arrow_back" color="white" to="/" class="glass-btn q-mr-md" />
          <div>
            <div class="text-h4 font-display text-white leading-none">Centro de Mando</div>
            <div class="text-caption text-primary font-mono tracking-widest q-mt-xs">
              USUARIO | PANEL DE CONTROL AVANZADO
            </div>
          </div>
        </div>

        <div class="row q-gutter-x-md items-center gt-xs">
          <q-btn
            flat
            round
            icon="bug_report"
            color="cyan-4"
            class="glass-btn"
            @click="dialogoPruebas = true"
          >
            <q-tooltip class="bg-dark border-cyan">Simular Notificaciones</q-tooltip>
          </q-btn>

          <div class="glass-pill row items-center q-px-md">
            <div class="status-dot" :class="isOnline ? 'bg-green-500' : 'bg-red-500'"></div>
            <span class="q-ml-sm text-caption text-white font-mono">
              {{ isOnline ? 'ONLINE' : 'OFFLINE' }}
            </span>
          </div>
        </div>
      </div>

      <div class="bento-grid-wrapper">
        <div class="grid-area-profile">
          <ProfileHero />
        </div>

        <div class="grid-area-team">
          <TeamInteractiveBoard />
        </div>

        <div class="grid-area-actions column q-gutter-y-md">
          <div class="col-12 col-md map-wrapper-mobile">
            <EstablishmentMapCard />
          </div>
          <div class="col-12 col-md-auto">
            <EmergencyUnit />
          </div>
        </div>
      </div>
    </div>

    <q-dialog v-model="dialogoPruebas" backdrop-filter="blur(8px)">
      <q-card
        class="glass-dialog"
        style="min-width: 600px; max-width: 95vw; border: 1px solid #00e5ff"
      >
        <q-card-section class="row items-center justify-between bg-dark-header">
          <div class="text-h6 text-cyan-4 font-mono">
            <q-icon name="terminal" class="q-mr-sm" /> TEST_CONSOLE_V1
          </div>
          <q-btn icon="close" flat round dense v-close-popup color="grey-5" />
        </q-card-section>

        <q-card-section class="q-pa-lg">
          <div class="text-grey-4 q-mb-lg">Simuladores de eventos del sistema.</div>
          <div class="row q-col-gutter-md q-mb-lg">
            <div class="col-12 col-sm-4">
              <q-btn
                outline
                color="blue"
                icon="thunderstorm"
                label="Lluvia"
                class="full-width"
                @click="simularEvento('lluvia')"
                :loading="simulando === 'lluvia'"
              />
            </div>
            <div class="col-12 col-sm-4">
              <q-btn
                outline
                color="yellow"
                icon="medical_services"
                label="Sanidad"
                class="full-width"
                @click="simularEvento('sanidad')"
                :loading="simulando === 'sanidad'"
              />
            </div>
            <div class="col-12 col-sm-4">
              <q-btn
                outline
                color="primary"
                icon="inventory_2"
                label="Stock"
                class="full-width"
                @click="simularEvento('stock')"
                :loading="simulando === 'stock'"
              />
            </div>
          </div>

          <div
            class="bg-black q-pa-md rounded-borders font-mono text-caption text-grey-5 scroll"
            style="height: 150px; border: 1px solid #333"
          >
            <div v-for="(log, i) in logsSimulacion" :key="i" class="q-mb-xs">
              <span class="text-cyan">[{{ log.hora }}]</span> {{ log.mensaje }}
            </div>
            <div v-if="logsSimulacion.length === 0">> Sistema listo... Esperando simulación.</div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import ProfileHero from 'components/profile/ProfileHero.vue'
import TeamInteractiveBoard from 'components/profile/TeamManager.vue'
import EmergencyUnit from 'components/profile/EmergencyUnit.vue'
import EstablishmentMapCard from 'components/profile/EstablishmentSettings.vue'
import { useDataStore } from 'stores/data-store'
import { useQuasar } from 'quasar'
import { supabase } from 'boot/supabase'

const dataStore = useDataStore()
const $q = useQuasar()
const isOnline = ref(navigator.onLine)
const dialogoPruebas = ref(false)
const simulando = ref(null)
const logsSimulacion = ref([])

const updateStatus = () => (isOnline.value = navigator.onLine)

async function simularEvento(tipo) {
  simulando.value = tipo
  const hora = new Date().toLocaleTimeString()
  logsSimulacion.value.push({
    hora,
    mensaje: `Iniciando protocolo de prueba: ${tipo.toUpperCase()}`,
  })

  const destinatarios = dataStore.equipo.filter(
    (m) => m.config_notificaciones && m.config_notificaciones[tipo],
  )

  if (destinatarios.length === 0) {
    logsSimulacion.value.push({
      hora,
      mensaje: `⚠ ALERTA: Nadie en el equipo está suscrito a '${tipo}'.`,
    })
    simulando.value = null
    return
  }

  logsSimulacion.value.push({ hora, mensaje: `Destinatarios encontrados: ${destinatarios.length}` })

  try {
    const payload = {
      tipo: tipo,
      mensaje: 'Esta es una prueba de notificación desde el Panel Administrativo.',
      destinatarios: destinatarios.map((d) => ({
        nombre: d.nombre_completo,
        email: d.email,
        canal: 'email',
      })),
    }

    await new Promise((r) => setTimeout(r, 800))

    const { error } = await supabase.functions.invoke('send-alert', { body: payload })
    if (error) throw error

    logsSimulacion.value.push({ hora, mensaje: `✅ ÉXITO: Notificaciones enviadas correctamente.` })
    $q.notify({ type: 'positive', message: 'Prueba completada', icon: 'check_circle' })
  } catch (e) {
    logsSimulacion.value.push({ hora, mensaje: `❌ ERROR: ${e.message}` })
    logsSimulacion.value.push({
      hora,
      mensaje: `(Nota: Asegúrate de que la Edge Function 'send-alert' esté desplegada)`,
    })
  } finally {
    simulando.value = null
  }
}

onMounted(() => {
  window.addEventListener('online', updateStatus)
  window.addEventListener('offline', updateStatus)
})
onUnmounted(() => {
  window.removeEventListener('online', updateStatus)
  window.removeEventListener('offline', updateStatus)
})
</script>

<style lang="scss" scoped>
.dashboard-pro-bg {
  background-image: url('src/assets/nutrogan-bg4.png');
  background-size: cover;
  background-position: center;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

.backdrop-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 0;
}

.central-stage {
  width: 100%;
  height: auto;
  display: flex;
  flex-direction: column;
}

/* LAYOUT DE GRILLA */
.bento-grid-wrapper {
  display: grid;
  grid-template-columns: 340px 1fr 380px;
  gap: 24px;
  width: 100%;
  min-height: calc(100vh - 130px);
}

.grid-area-profile {
  grid-column: 1;
}
.grid-area-team {
  grid-column: 2;
}
.grid-area-actions {
  grid-column: 3;
  display: flex;
  flex-direction: column;
}

/* --- TABLET --- */
@media (max-width: 1400px) {
  .bento-grid-wrapper {
    grid-template-columns: 320px 1fr;
    grid-template-rows: auto auto;
    min-height: auto;

    .grid-area-profile {
      grid-column: 1;
      grid-row: 1;
    }
    .grid-area-actions {
      grid-column: 2;
      grid-row: 1;
    }
    .grid-area-team {
      grid-column: 1 / span 2;
      grid-row: 2;
      min-height: 500px;
    }
  }
}

/* --- MÓVIL (CORRECCIÓN DEFINITIVA) --- */
@media (max-width: 900px) {
  .bento-grid-wrapper {
    display: flex;
    flex-direction: column;
    gap: 24px;
    height: auto !important;
    min-height: auto !important;
  }

  /* IMPORTANTE: Altura automática para que crezca según su contenido (las tarjetas apiladas).
    Antes tenía height: 600px !important, eso lo rompía.
  */
  .grid-area-team {
    height: auto !important;
    min-height: auto !important;
  }

  .map-wrapper-mobile {
    height: 550px !important;
  }

  .grid-area-profile,
  .grid-area-team,
  .grid-area-actions {
    width: 100%;
  }
}

/* Estilos Generales */
.glass-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.glass-pill {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  height: 32px;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 10px currentColor;
}
.bg-green-500 {
  background: #39ff14;
  color: #39ff14;
}
.bg-red-500 {
  background: #ff1744;
  color: #ff1744;
}
.font-display {
  font-family: 'Outfit', sans-serif;
  font-weight: 800;
  letter-spacing: -1px;
}
.font-mono {
  font-family: 'Fira Code', monospace;
}
.animate-slide-down {
  animation: slideDown 0.5s ease-out;
}
@keyframes slideDown {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
