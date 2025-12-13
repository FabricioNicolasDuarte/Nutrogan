<template>
  <q-layout
    view="lHh LpR lFf"
    class="fullscreen bg-black overflow-hidden font-outfit"
    :class="{ 'sidebar-open': rightDrawerOpen }"
  >
    <div class="video-background">
      <video autoplay loop muted playsinline>
        <source src="/videos/video-background-nutrogan.mp4" type="video/mp4" />
      </video>
      <div class="video-overlay"></div>
    </div>

    <svg class="unibody-frame" width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <linearGradient id="frameGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color: #000000; stop-opacity: 1" />
          <stop offset="30%" style="stop-color: #050505; stop-opacity: 1" />
          <stop offset="100%" style="stop-color: #39ff14; stop-opacity: 1" />
        </linearGradient>
        <mask id="frameMask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <rect
            x="20"
            y="20"
            width="calc(100% - 40px)"
            height="calc(100% - 40px)"
            rx="40"
            ry="40"
            fill="black"
          />
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="url(#frameGradient)"
        mask="url(#frameMask)"
      />
    </svg>

    <q-header class="bg-transparent q-pt-none pointer-events-none" style="z-index: 5000">
      <div class="row justify-center relative-position" style="height: 1px">
        <div
          class="notch-container shadow-10 pointer-events-auto cursor-pointer"
          @click="$router.push('/about')"
        >
          <LivingLogo src="/images/nutrogan-logo3.svg" class="notch-content" />
        </div>
      </div>
    </q-header>

    <q-drawer
      v-model="rightDrawerOpen"
      side="right"
      overlay
      behavior="mobile"
      :width="$q.screen.lt.md ? '100%' : 340"
      class="drawer-glass"
      @update:model-value="resetAutoCloseTimer"
    >
      <div
        class="column no-wrap full-height drawer-content relative-position"
        @mousemove="resetAutoCloseTimer"
        @click="resetAutoCloseTimer"
        @touchstart="resetAutoCloseTimer"
      >
        <q-btn
          v-if="$q.screen.lt.md"
          icon="close"
          flat
          round
          dense
          color="white"
          class="absolute-top-right q-ma-md z-max"
          style="top: 15px; right: 15px"
          @click="rightDrawerOpen = false"
        />

        <div class="column items-center text-center q-pt-xl q-pb-lg q-px-md">
          <div class="avatar-container q-mb-md">
            <q-avatar size="90px" class="shadow-10">
              <img :src="userAvatar" style="object-fit: cover" />
            </q-avatar>
            <div class="status-indicator"></div>
          </div>

          <div class="text-h6 font-outfit text-white text-weight-medium q-mb-xs">
            {{ userName }}
          </div>
          <q-badge
            color="transparent"
            class="text-caption text-primary border-neon q-px-sm"
            :label="userRole"
          />
        </div>

        <div class="col scroll q-px-lg relative-position">
          <div class="glass-card q-mb-xl q-pa-md relative-position overflow-hidden">
            <div class="row items-center justify-between q-mb-sm">
              <div class="text-overline text-grey-4 opacity-70" style="line-height: 1">
                ENTORNO ACTUAL
              </div>
              <q-icon name="hub" color="primary" size="xs" />
            </div>

            <div
              class="text-subtitle1 text-white text-weight-bold ellipsis q-mb-xs"
              style="font-size: 1.2rem"
            >
              {{ currentEstName }}
            </div>
            <div class="row items-center text-caption text-grey-4 q-mb-md">
              <q-icon name="place" size="14px" class="q-mr-xs text-primary" />
              {{ currentEstCity || 'Ubicación no def.' }}
            </div>

            <q-btn class="action-btn full-width" unelevated no-caps size="sm">
              <div class="row items-center justify-between full-width">
                <span class="q-pl-xs">Cambiar Establecimiento</span>
                <q-icon name="swap_horiz" size="xs" />
              </div>

              <q-menu
                fit
                anchor="bottom middle"
                self="top middle"
                class="glass-menu"
                :offset="[0, 8]"
                style="z-index: 10000"
              >
                <q-list style="min-width: 220px" dark dense class="q-py-sm">
                  <q-item-label header class="text-grey-5 text-caption font-mono"
                    >DISPONIBLES</q-item-label
                  >
                  <q-item
                    v-for="est in authStore.userEstablishments"
                    :key="est.id"
                    clickable
                    v-close-popup
                    @click="cambiarCampo(est.id)"
                    :class="{
                      'text-primary bg-white-soft':
                        est.id === authStore.profile?.establecimiento_id,
                    }"
                    class="rounded-borders q-mx-xs"
                  >
                    <q-item-section>{{ est.nombre }}</q-item-section>
                    <q-item-section side v-if="est.id === authStore.profile?.establecimiento_id">
                      <q-icon name="radio_button_checked" size="xs" color="primary" />
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>

            <div class="glow-blob"></div>
          </div>

          <div class="text-caption text-grey-5 q-mb-sm font-mono tracking-wider opacity-60 q-pl-xs">
            NAVEGACIÓN
          </div>

          <q-list class="nav-clean-list q-gutter-y-sm">
            <q-item clickable v-ripple to="/profile" active-class="nav-active">
              <q-item-section avatar><q-icon name="person_outline" size="22px" /></q-item-section>
              <q-item-section class="text-body2">Mi Perfil</q-item-section>
              <q-item-section side
                ><q-icon name="chevron_right" size="xs" color="grey-8"
              /></q-item-section>
            </q-item>

            <q-item
              v-if="authStore.isAdmin"
              clickable
              v-ripple
              to="/team"
              active-class="nav-active"
            >
              <q-item-section avatar><q-icon name="people_outline" size="22px" /></q-item-section>
              <q-item-section class="text-body2">Equipo</q-item-section>
              <q-item-section side
                ><q-icon name="chevron_right" size="xs" color="grey-8"
              /></q-item-section>
            </q-item>

            <q-item clickable v-ripple to="/support" active-class="nav-active">
              <q-item-section avatar><q-icon name="headset_mic" size="22px" /></q-item-section>
              <q-item-section class="text-body2">Soporte Técnico</q-item-section>
              <q-item-section side
                ><q-icon name="chevron_right" size="xs" color="grey-8"
              /></q-item-section>
            </q-item>

            <q-item clickable v-ripple to="/about" active-class="nav-active">
              <q-item-section avatar><q-icon name="info_outline" size="22px" /></q-item-section>
              <q-item-section class="text-body2">Información</q-item-section>
              <q-item-section side
                ><q-icon name="chevron_right" size="xs" color="grey-8"
              /></q-item-section>
            </q-item>

            <q-separator dark class="q-my-md opacity-20" />

            <q-item clickable v-ripple @click="handleLogout" class="logout-item-integrated">
              <q-item-section avatar>
                <q-icon name="logout" size="22px" />
              </q-item-section>
              <q-item-section class="text-body2 text-weight-bold"> Cerrar Sesión </q-item-section>
              <q-item-section side>
                <q-icon name="power_settings_new" size="xs" class="logout-icon-side" />
              </q-item-section>
            </q-item>
          </q-list>

          <div class="q-pb-xl"></div>
        </div>
      </div>
    </q-drawer>

    <div
      class="side-notch pointer-events-auto"
      @mouseenter="rightDrawerOpen = true"
      @click="rightDrawerOpen = true"
    >
      <div class="notch-dot"></div>
    </div>

    <q-page-container class="page-padding-fix" v-touch-swipe.left="openDrawer">
      <router-view />
    </q-page-container>

    <q-footer class="bg-transparent q-pb-none pointer-events-none" style="z-index: 5000">
      <div class="footer-wrapper column items-center pointer-events-auto">
        <div class="footer-base-rigid column items-center justify-center">
          <div class="tabs-pill shadow-5 full-width">
            <q-tabs
              v-model="tab"
              class="nav-tabs text-grey-5"
              active-color="primary"
              indicator-color="primary"
              dense
              align="justify"
            >
              <q-route-tab name="inicio" :icon="'img:/icons/icon-home.svg'" to="/" exact />
              <q-route-tab name="lotes" :icon="'img:/icons/icon-lotes.svg'" to="/lotes" exact />
              <q-route-tab
                name="recursos"
                :icon="'img:/icons/icon-recursos.svg'"
                to="/recursos"
                exact
              />
              <q-route-tab
                v-if="authStore.isTecnico"
                name="reportes"
                :icon="'img:/icons/icon-reportes.svg'"
                to="/reportes"
                exact
              />
            </q-tabs>
          </div>
          <div class="field-switch-wrapper q-mt-sm full-width">
            <div class="slide-track shadow-inner relative-position row items-center" ref="trackRef">
              <div
                class="absolute-full row flex-center text-caption text-grey-6 text-weight-bolder text-uppercase pointer-events-none tracking-widest"
                :style="{ opacity: Math.max(0, 1 - sliderProgress * 1.5) }"
              >
                Deslizar para Modo Campo <q-icon name="chevron_right" class="q-ml-xs" />
              </div>
              <div
                class="slide-thumb shadow-3 flex flex-center"
                :style="thumbStyle"
                v-touch-pan.horizontal.prevent.mouse="handlePan"
              >
                <q-icon
                  name="agriculture"
                  size="20px"
                  color="black"
                  :class="{ 'spin-icon': isSuccess }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from 'stores/auth-store'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import LivingLogo from 'components/ui/LivingLogo.vue'

const tab = ref('inicio')
const rightDrawerOpen = ref(false)

const authStore = useAuthStore()
const router = useRouter()
const $q = useQuasar()

// --- DATOS USUARIO ---
const userAvatar = computed(
  () => authStore.profile?.avatar_url || 'https://cdn.quasar.dev/img/boy-avatar.png',
)
const userName = computed(() => {
  if (authStore.profile?.nombre_completo) return authStore.profile.nombre_completo
  if (authStore.user?.email) return authStore.user.email.split('@')[0]
  return 'Usuario'
})
const userRole = computed(() =>
  authStore.currentRole ? authStore.currentRole.toUpperCase() : 'INVITADO',
)

const currentEstName = computed(() => {
  const current = authStore.userEstablishments.find(
    (e) => e.id === authStore.profile?.establecimiento_id,
  )
  return current ? current.nombre : 'Sin Selección'
})
const currentEstCity = computed(() => {
  const current = authStore.userEstablishments.find(
    (e) => e.id === authStore.profile?.establecimiento_id,
  )
  return current ? current.ciudad : ''
})

// --- AUTO-CIERRE ---
let autoCloseTimer = null
function resetAutoCloseTimer() {
  if (autoCloseTimer) clearTimeout(autoCloseTimer)
  // Solo en PC
  if (rightDrawerOpen.value && !$q.screen.lt.md) {
    autoCloseTimer = setTimeout(() => {
      rightDrawerOpen.value = false
    }, 5000)
  }
}
watch(rightDrawerOpen, (isOpen) => {
  if (isOpen) resetAutoCloseTimer()
  else if (autoCloseTimer) clearTimeout(autoCloseTimer)
})

function openDrawer() {
  rightDrawerOpen.value = true
}

async function cambiarCampo(id) {
  if (id === authStore.profile?.establecimiento_id) return
  $q.loading.show({ message: 'Conectando...' })
  await authStore.switchEstablishment(id)
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

// --- SLIDER LOGIC ---
const trackRef = ref(null)
const sliderX = ref(0)
const isDragging = ref(false)
const isSuccess = ref(false)
const sliderProgress = computed(() => {
  if (!trackRef.value) return 0
  const max = trackRef.value.clientWidth - 52
  return Math.min(Math.max(sliderX.value / max, 0), 1)
})
const thumbStyle = computed(() => ({
  transform: `translateX(${sliderX.value}px)`,
  transition: isDragging.value ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.8, 0.5, 1)',
  backgroundColor: isSuccess.value ? '#ffffff' : '#39ff14',
}))
function handlePan(details) {
  if (isSuccess.value) return
  const trackWidth = trackRef.value.clientWidth
  const maxDrag = trackWidth - 44 - 8
  if (details.isFirst) isDragging.value = true
  let newX = sliderX.value + details.delta.x
  if (newX < 0) newX = 0
  if (newX > maxDrag) newX = maxDrag
  sliderX.value = newX
  if (details.isFinal) {
    isDragging.value = false
    if (newX > maxDrag * 0.6) {
      sliderX.value = maxDrag
      isSuccess.value = true
      setTimeout(() => {
        router.push('/field')
        setTimeout(() => {
          isSuccess.value = false
          sliderX.value = 0
        }, 1000)
      }, 300)
    } else {
      sliderX.value = 0
    }
  }
}
</script>

<style scoped lang="scss">
.font-outfit {
  font-family: 'Outfit', sans-serif !important;
}

/* --- DRAWER REDESIGN: GLASSMORPHISM --- */

:deep(.q-drawer) {
  background: transparent !important;
  box-shadow: none !important;
}

.drawer-glass {
  background: rgba(10, 10, 12, 0.95) !important;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: -15px 0 50px rgba(0, 0, 0, 0.8) !important;

  /* CRÍTICO: Z-Index muy alto para estar sobre el Footer */
  z-index: 10000 !important;
}

.drawer-content {
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.832) 0%, rgba(0, 0, 0, 0.6) 100%);
  height: 100%;
}

/* --- EFECTO DE DESENFOQUE (BLUR) --- */
.sidebar-open {
  /* Al abrirse el drawer, todo lo demás se desenfoca */
  .video-background,
  .unibody-frame,
  .q-header,
  .q-page-container,
  .q-footer,
  .side-notch {
    filter: blur(8px) brightness(0.6);
    transition: filter 0.4s ease-out;
    pointer-events: none !important; /* Evita clicks accidentales en el fondo */
  }
}

/* Transición suave al cerrar */
.video-background,
.unibody-frame,
.q-header,
.q-page-container,
.q-footer,
.side-notch {
  transition: filter 0.3s ease-in;
  filter: blur(0px) brightness(1);
}

/* --- ESTILOS DE COMPONENTES --- */
.avatar-container {
  position: relative;
  display: inline-block;
  padding: 4px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
}
.status-indicator {
  position: absolute;
  bottom: 5px;
  right: 5px;
  width: 14px;
  height: 14px;
  background: #39ff14;
  border-radius: 50%;
  border: 2px solid #1a1a1a;
  box-shadow: 0 0 10px #39ff14;
}

.glass-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.02) 100%);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition:
    transform 0.3s ease,
    border-color 0.3s ease;
  &:hover {
    border-color: rgba(57, 255, 20, 0.4);
    transform: translateY(-2px);
    .glow-blob {
      opacity: 0.25;
    }
  }
}
.glow-blob {
  position: absolute;
  top: -30px;
  right: -30px;
  width: 120px;
  height: 120px;
  background: #39ff14;
  filter: blur(50px);
  opacity: 0.1;
  pointer-events: none;
  transition: opacity 0.5s ease;
}

.action-btn {
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 8px 12px;
  transition: all 0.2s;
  &:hover {
    background: rgba(57, 255, 20, 0.15);
    border-color: #39ff14;
    color: #39ff14;
  }
}

.nav-clean-list .q-item {
  border-radius: 12px;
  color: #999;
  margin-bottom: 4px;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.5, 1);
  border: 1px solid transparent;
  &:hover {
    color: white;
    background: rgba(255, 255, 255, 0.05);
    padding-left: 20px;
  }
}
.nav-active {
  color: #39ff14 !important;
  background: rgba(57, 255, 20, 0.08) !important;
  border-color: rgba(57, 255, 20, 0.1) !important;
  font-weight: 500;
  padding-left: 20px !important;
  .q-icon {
    color: #39ff14 !important;
    filter: drop-shadow(0 0 8px rgba(57, 255, 20, 0.4));
  }
}

/* --- ESTILO ITEM CERRAR SESIÓN (CYAN NEON) --- */
.logout-item-integrated {
  border-radius: 12px;
  color: #00e5ff; /* Cyan Neon */
  border: 1px solid rgba(0, 229, 255, 0.15);
  background: rgba(0, 229, 255, 0.05);
  margin-bottom: 4px;
  transition: all 0.3s ease;

  .logout-icon-side {
    color: #00e5ff;
    opacity: 0.7;
    transition: all 0.3s;
  }

  &:hover {
    background: rgba(0, 229, 255, 0.15);
    border-color: #00e5ff;
    box-shadow: 0 0 15px rgba(0, 229, 255, 0.2);
    padding-left: 15px;

    .logout-icon-side {
      opacity: 1;
      transform: scale(1.2);
      filter: drop-shadow(0 0 5px #00e5ff);
    }
  }
}

.glass-menu {
  background: rgba(15, 15, 18, 0.95) !important;
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
}
.bg-white-soft {
  background: rgba(57, 255, 20, 0.1);
  color: #39ff14;
}

.border-neon {
  border: 1px solid rgba(57, 255, 20, 0.3);
}
.opacity-70 {
  opacity: 0.7;
}
.opacity-60 {
  opacity: 0.6;
}
.opacity-20 {
  opacity: 0.2;
}
.font-mono {
  font-family: 'Fira Code', monospace;
}
.tracking-wider {
  letter-spacing: 1.5px;
}
.z-max {
  z-index: 9999;
}

/* --- ELEMENTOS DE LAYOUT EXISTENTES --- */
.unibody-frame {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 4000;
  pointer-events: none;
}
.video-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
}
.video-background video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.video-overlay {
  position: absolute;
  inset: 0;
  background: transparent;
}

.notch-container {
  position: relative;
  background-color: #000000;
  width: 500px;
  height: 90px;
  border-bottom-left-radius: 40px;
  border-bottom-right-radius: 40px;
  border: 1px solid rgba(51, 255, 0, 0.15);
  border-top: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  z-index: 5001;
  overflow: hidden;
  padding: 0;
}
.notch-content {
  width: 70%;
  height: 70%;
}
@media (max-width: 600px) {
  .notch-container {
    width: 220px;
    height: 70px;
    border-bottom-left-radius: 24px;
    border-bottom-right-radius: 24px;
  }
}

.side-notch {
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 60px;
  background-color: #000000;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-right: none;
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
  z-index: 6000;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.3s ease;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.5);
  &:hover {
    width: 24px;
    .notch-dot {
      transform: scale(1.5);
      box-shadow: 0 0 10px #39ff14;
    }
  }
}
.notch-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: #39ff14;
  transition: all 0.5s ease;
}

.page-padding-fix {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.footer-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
  position: relative;
  padding-bottom: 0;
}
.footer-base-rigid {
  background-color: #39ff14;
  width: 500px;
  min-width: 500px;
  padding: 15px 25px 20px 25px;
  border-top-left-radius: 40px;
  border-top-right-radius: 40px;
  box-shadow: 0 -5px 40px rgba(57, 255, 20, 0.3);
  margin-bottom: -2px;
  @media (max-width: 520px) {
    transform: scale(0.95);
    transform-origin: bottom center;
    width: 100%;
    min-width: auto;
    border-radius: 0;
  }
}
.tabs-pill {
  background-color: #0a0a0a;
  border-radius: 100px;
  padding: 4px 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}
.nav-tabs {
  height: 50px;
}
:deep(.q-tab__icon img) {
  width: 24px;
  height: 24px;
  filter: grayscale(1) brightness(1.5);
  opacity: 0.6;
}
:deep(.q-tab--active .q-tab__icon img) {
  opacity: 1;
  filter: drop-shadow(0 0 5px #39ff14);
}
.field-switch-wrapper {
  width: 100%;
}
.slide-track {
  width: 100%;
  height: 52px;
  background: #151515;
  border-radius: 26px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 4px;
  overflow: hidden;
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.5);
  position: relative;
}
.slide-thumb {
  width: 44px;
  height: 44px;
  background: #39ff14;
  border-radius: 50%;
  cursor: grab;
  z-index: 10;
  box-shadow: 0 0 15px rgba(57, 255, 20, 0.3);
  background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, transparent 50%);
}
.slide-thumb:active {
  cursor: grabbing;
  transform: scale(0.95);
}
.spin-icon {
  animation: spin 0.5s ease-in-out;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
