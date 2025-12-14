<template>
  <div class="login-container flex flex-center">
    <InteractiveBackground />
    <div class="ambient-glow absolute-center"></div>

    <q-card class="login-card glass-panel relative-position">
      <div class="text-center q-mb-lg relative-position logo-wrapper">
        <InteractiveLogo />
        <div class="text-h5 text-white text-weight-bold q-mt-sm tracking-wide">
          Nutrogan <span class="text-primary"></span>
        </div>
        <div class="text-caption text-grey-5">Acceso Corporativo</div>
      </div>

      <div class="q-pa-md">
        <q-form @submit.prevent="handleLogin" class="q-gutter-y-md">
          <q-input
            v-model="form.email"
            placeholder="usuario@cedeva.com.ar"
            outlined
            dark
            color="primary"
            class="input-pro"
            type="email"
            :disable="loading"
            :rules="[(val) => !!val || 'Requerido']"
          >
            <template v-slot:prepend><q-icon name="person" color="grey-6" /></template>
          </q-input>

          <q-input
            v-model="form.password"
            placeholder="Contraseña"
            outlined
            dark
            color="primary"
            class="input-pro"
            :type="showPassword ? 'text' : 'password'"
            :disable="loading"
            :rules="[(val) => !!val || 'Requerida']"
          >
            <template v-slot:prepend><q-icon name="lock" color="grey-6" /></template>
            <template v-slot:append>
              <q-icon
                :name="showPassword ? 'visibility' : 'visibility_off'"
                class="cursor-pointer"
                @click="showPassword = !showPassword"
              />
            </template>
          </q-input>

          <q-btn
            type="submit"
            :loading="loading"
            class="btn-neon full-width q-mt-md"
            unelevated
            no-caps
          >
            <div class="row items-center no-wrap">
              <span class="text-weight-bold q-mr-sm">INICIAR SESIÓN</span>
              <q-icon name="login" size="xs" />
            </div>
            <template v-slot:loading><q-spinner-dots /></template>
          </q-btn>
        </q-form>

        <div class="text-caption text-center text-grey-6 q-mt-lg">
          Sistema privado.<br />
          <span style="font-size: 0.75rem; opacity: 0.7"
            >Contacte al administrador para obtener credenciales.</span
          >
        </div>
      </div>

      <q-slide-transition>
        <div v-if="errorMsg" class="error-box q-mt-md row items-center bg-red-glass">
          <q-icon name="error_outline" color="red-5" class="q-mr-sm" />
          <span class="text-white text-caption">{{ errorMsg }}</span>
        </div>
      </q-slide-transition>
    </q-card>

    <div class="absolute-bottom text-center footer-gradient text-grey-5 text-caption">
      &copy; 2025 Nutrogan | Ganadería de Precisión.
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useAuthStore } from 'stores/auth-store'
import { useRouter } from 'vue-router'
import InteractiveBackground from 'components/login/InteractiveBackground.vue'
import InteractiveLogo from 'components/login/InteractiveLogo.vue'

const authStore = useAuthStore()
const router = useRouter()

const loading = ref(false)
const errorMsg = ref(null)
const showPassword = ref(false)
const form = reactive({ email: '', password: '' })

const handleLogin = async () => {
  loading.value = true
  errorMsg.value = null

  const res = await authStore.loginWithPassword(form.email, form.password)

  if (res.success) {
    router.push('/')
  } else {
    errorMsg.value = 'Credenciales inválidas o acceso no autorizado.'
  }
  loading.value = false
}
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  background-color: #050505;
  background-image: url('src/assets/nutrogan-bg.jpg');
  background-size: cover;
  background-position: center;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 80px;
}
.ambient-glow {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(0, 55, 255, 0.15) 0%, transparent 70%);
  filter: blur(100px);
  z-index: 0;
  pointer-events: none;
  animation: breath 8s infinite ease-in-out;
}
@keyframes breath {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 0.8;
  }
}
.login-card {
  width: 90%;
  max-width: 420px;
  padding: 40px;
  border-radius: 24px;
  z-index: 1;
  overflow: hidden;
  background: rgba(20, 20, 25, 0.75);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}
@media (max-width: 600px) {
  .login-card {
    width: 95%;
    padding: 24px;
    margin-top: 20px;
  }
}
.input-pro :deep(.q-field__control) {
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.4) !important;
  height: 56px;
}
.btn-neon {
  background: linear-gradient(135deg, $primary 0%, #32cd32 100%);
  color: #000;
  font-weight: 800;
  border-radius: 12px;
  padding: 12px;
}
.footer-gradient {
  width: 100%;
  background: linear-gradient(to top, rgba(0, 0, 0, 1) 30%, rgba(0, 0, 0, 0) 100%);
  padding: 24px 0;
  z-index: 2;
}
.error-box {
  border: 1px solid rgba(255, 0, 0, 0.3);
  padding: 12px;
  border-radius: 8px;
}
.bg-red-glass {
  background: rgba(255, 0, 0, 0.15);
  backdrop-filter: blur(5px);
}
</style>
