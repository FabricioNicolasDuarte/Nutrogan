<template>
  <div class="fullscreen bg-black flex flex-center font-outfit text-white text-center">
    <div class="q-pa-md relative-position z-10" style="max-width: 400px">
      <div class="icon-container q-mb-xl">
        <div class="glow-ring"></div>
        <q-icon name="verified_user" size="80px" color="primary" class="animate-bounce" />
      </div>

      <div class="text-h4 font-weight-bold q-mb-md">¡Cuenta Verificada!</div>

      <p class="text-grey-4 q-mb-xl text-body1">
        Tu identidad ha sido confirmada correctamente. Ya tienes acceso completo al sistema
        Nutrogan.
      </p>

      <q-btn
        to="/"
        label="Ingresar al Dashboard"
        color="primary"
        text-color="black"
        rounded
        unelevated
        size="lg"
        class="full-width shadow-glow font-weight-bold"
        icon="arrow_forward"
      />
    </div>

    <div class="absolute-full overflow-hidden no-pointer-events">
      <div class="bg-gradient"></div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from 'stores/auth-store'

const authStore = useAuthStore()

onMounted(async () => {
  // Refrescamos la sesión para confirmar que Supabase ya tiene el usuario activo
  await authStore.checkAuth()
})
</script>

<style scoped>
.font-outfit {
  font-family: 'Outfit', sans-serif;
}

.icon-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.glow-ring {
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 2px solid #39ff14;
  opacity: 0;
  animation: ripple 2s infinite;
}

.shadow-glow {
  box-shadow: 0 0 30px rgba(57, 255, 20, 0.4);
  transition: transform 0.2s;
}
.shadow-glow:hover {
  transform: scale(1.05);
}

.bg-gradient {
  background: radial-gradient(circle at 50% 50%, rgba(57, 255, 20, 0.15) 0%, transparent 60%);
  width: 100%;
  height: 100%;
}

@keyframes ripple {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
.animate-bounce {
  animation: bounce 2s infinite ease-in-out;
}
</style>
