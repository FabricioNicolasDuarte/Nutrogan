<template>
  <div class="control-wrapper">
    <q-btn-dropdown
      rounded
      no-caps
      class="glass-pill-btn"
      content-class="pro-menu-dropdown"
      :menu-offset="[0, 10]"
      dropdown-icon="more_vert"
    >
      <template v-slot:label>
        <div class="row items-center no-wrap">
          <q-avatar size="28px" class="q-mr-sm border-subtle">
            <img :src="userAvatar" />
            <q-badge floating rounded color="green-13" class="status-dot" />
          </q-avatar>

          <div class="column text-left gt-xs q-mr-xs">
            <span class="text-white text-weight-bold font-mono text-caption leading-none">
              {{ authStore.user?.email?.split('@')[0] }}
            </span>
          </div>
        </div>
      </template>

      <div class="menu-body bg-black text-white">
        <div class="q-px-md q-py-sm border-bottom-subtle">
          <div class="text-caption text-grey-6 text-uppercase font-mono q-mb-xs">
            Establecimiento
          </div>
          <div class="text-subtitle2 text-primary text-weight-bold row items-center">
            <q-icon name="dns" size="xs" class="q-mr-xs" />
            {{ currentEstName }}
          </div>
        </div>

        <q-list class="q-py-xs">
          <q-item clickable v-ripple class="menu-item-pro">
            <q-item-section avatar
              ><q-icon name="swap_horiz" size="xs" color="grey-5"
            /></q-item-section>
            <q-item-section>Cambiar Campo</q-item-section>
            <q-item-section side><q-icon name="chevron_right" size="xs" /></q-item-section>

            <q-menu anchor="top end" self="top start" class="pro-menu-dropdown bg-black">
              <q-list style="min-width: 200px">
                <q-item-label header class="text-grey-6 font-mono text-caption"
                  >MIS CAMPOS</q-item-label
                >
                <q-item
                  v-for="est in authStore.userEstablishments"
                  :key="est.id"
                  clickable
                  v-close-popup
                  @click="cambiarCampo(est.id)"
                  :class="{ 'text-primary': est.id === authStore.profile?.establecimiento_id }"
                >
                  <q-item-section>{{ est.nombre }}</q-item-section>
                  <q-item-section side v-if="est.id === authStore.profile?.establecimiento_id">
                    <q-icon name="check" size="xs" color="primary" />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-item>

          <q-separator dark class="q-my-xs opacity-20" />

          <q-item clickable v-close-popup to="/profile" class="menu-item-pro">
            <q-item-section avatar
              ><q-icon name="person" size="xs" color="grey-5"
            /></q-item-section>
            <q-item-section>Mi Perfil</q-item-section>
          </q-item>

          <q-item v-if="authStore.isAdmin" clickable v-close-popup to="/team" class="menu-item-pro">
            <q-item-section avatar><q-icon name="group" size="xs" color="grey-5" /></q-item-section>
            <q-item-section>Equipo</q-item-section>
          </q-item>

          <q-item clickable v-close-popup to="/support" class="menu-item-pro">
            <q-item-section avatar
              ><q-icon name="headset_mic" size="xs" color="grey-5"
            /></q-item-section>
            <q-item-section>Soporte</q-item-section>
          </q-item>

          <q-separator dark class="q-my-xs opacity-20" />

          <q-item clickable v-close-popup @click="handleLogout" class="menu-item-pro text-red-4">
            <q-item-section avatar><q-icon name="logout" size="xs" /></q-item-section>
            <q-item-section>Desconectar</q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-btn-dropdown>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from 'stores/auth-store'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

const authStore = useAuthStore()
const router = useRouter()
const $q = useQuasar()

const userAvatar = computed(
  () => authStore.profile?.avatar_url || 'https://cdn.quasar.dev/img/boy-avatar.png',
)

const currentEstName = computed(() => {
  const current = authStore.userEstablishments.find(
    (e) => e.id === authStore.profile?.establecimiento_id,
  )
  return current ? current.nombre : 'Sin Selección'
})

async function cambiarCampo(id) {
  if (id === authStore.profile?.establecimiento_id) return
  $q.loading.show({ message: 'Conectando...' })
  await authStore.switchEstablishment(id)
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<style lang="scss">
/* Estilos Globales del Menú (Para que q-menu los tome fuera del scope) */
.pro-menu-dropdown {
  background: rgba(10, 10, 10, 0.95) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.9) !important;
  min-width: 220px;
}
</style>

<style lang="scss" scoped>
.glass-pill-btn {
  background: rgba(255, 255, 255, 0.08); /* Muy sutil */
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 2px 12px 2px 4px; /* Asimétrico para el avatar */
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }
}

.border-subtle {
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.status-dot {
  width: 8px;
  height: 8px;
  top: 2px;
  right: 2px;
  border: 1px solid #000;
}

.menu-item-pro {
  font-size: 0.9rem;
  transition: all 0.2s;
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #39ff14; /* Verde neón al hover */
    .q-icon {
      color: #39ff14 !important;
    }
  }
}

.border-bottom-subtle {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.font-mono {
  font-family: 'Fira Code', monospace;
}
.leading-none {
  line-height: 1;
}
.opacity-20 {
  opacity: 0.2;
}
</style>
