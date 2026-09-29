<template>
  <div class="fullscreen bg-black overflow-hidden flex flex-center welcome-shell">
    <transition name="fade">
      <div v-if="showSplash" class="splash absolute-full flex flex-center column">
        <img src="/images/nutrogan-logo.svg" alt="Nutrogan" class="logo q-mb-md" />
        <div class="text-h5 text-white text-weight-medium q-mb-xs">Nutrogan</div>
        <div class="text-caption text-grey-5 text-uppercase tracking-wide">
          Ganadería de precisión, también sin señal
        </div>
        <q-btn
          flat
          color="white"
          label="Entrar"
          icon-right="arrow_forward"
          class="glass-btn q-mt-xl"
          @click="irAlDashboard"
        />
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const showSplash = ref(true)
let timer = null

function irAlDashboard() {
  showSplash.value = false
  if (timer) clearTimeout(timer)
  setTimeout(() => {
    router.replace('/')
  }, 280)
}

onMounted(() => {
  // Splash liviano (sin video de ~19 MB). Auto-entra en 2.2s.
  timer = setTimeout(irAlDashboard, 2200)
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style scoped>
.welcome-shell {
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.75)),
    url('/images/nutrogan-bg.png') center / cover no-repeat;
}
.logo {
  width: 72px;
  height: 72px;
}
.glass-btn {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 30px;
  padding: 8px 20px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.tracking-wide {
  letter-spacing: 0.12em;
}
</style>
