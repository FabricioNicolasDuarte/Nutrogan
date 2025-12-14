<template>
  <q-page padding class="dashboard-pro-bg font-outfit text-white">
    <div class="row items-center q-mb-lg">
      <q-btn flat round icon="arrow_back" color="white" @click="$router.back()" class="q-mr-sm" />
      <div>
        <div class="text-h4 text-weight-bold leading-none">Mi Perfil</div>
        <div class="text-caption text-primary tracking-widest text-uppercase">
          {{ authStore.currentRole || 'Usuario' }}
        </div>
      </div>
    </div>

    <div class="row q-col-gutter-lg q-pb-xl">
      <div class="col-12 col-md-4">
        <ProfileHero :user="authStore.user" :profile="authStore.profile" />
      </div>

      <div class="col-12 col-md-8">
        <q-card class="glass-card bg-transparent no-shadow">
          <q-tabs
            v-model="tab"
            dense
            class="text-grey-5"
            active-color="primary"
            indicator-color="primary"
            align="left"
            narrow-indicator
          >
            <q-tab name="personal" label="Mis Datos" icon="person" />

            <q-tab
              v-if="authStore.canManageTeam"
              name="team"
              label="Gestión de Equipo"
              icon="groups"
            />
            <q-tab
              v-if="authStore.canViewEstablishmentData"
              name="establishment"
              label="Establecimiento"
              icon="settings"
            />
          </q-tabs>

          <q-separator dark class="q-mb-md opacity-20" />

          <q-tab-panels v-model="tab" animated class="bg-transparent text-white">
            <q-tab-panel name="personal" class="q-px-none">
              <div class="text-h6 q-mb-md">Información de Cuenta</div>
              <div class="glass-panel q-pa-md q-mb-md">
                <q-input
                  dark
                  filled
                  v-model="authStore.profile.nombre_completo"
                  label="Nombre Completo"
                  readonly
                  color="primary"
                >
                  <template v-slot:prepend><q-icon name="badge" /></template>
                </q-input>
                <q-input
                  dark
                  filled
                  :model-value="authStore.user?.email"
                  label="Correo Electrónico"
                  readonly
                  class="q-mt-md"
                  color="primary"
                >
                  <template v-slot:prepend><q-icon name="email" /></template>
                </q-input>
              </div>
              <q-btn
                outline
                color="red-4"
                label="Cerrar Sesión"
                icon="logout"
                @click="authStore.logout"
              />
            </q-tab-panel>

            <q-tab-panel name="team" class="q-px-none" v-if="authStore.canManageTeam">
              <TeamManager />
            </q-tab-panel>

            <q-tab-panel
              name="establishment"
              class="q-px-none"
              v-if="authStore.canViewEstablishmentData"
            >
              <EstablishmentSettings />
              <div class="q-mt-lg"><EmergencyUnit /></div>
            </q-tab-panel>
          </q-tab-panels>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from 'stores/auth-store'
import ProfileHero from 'components/profile/ProfileHero.vue'
import TeamManager from 'components/profile/TeamManager.vue'
import EstablishmentSettings from 'components/profile/EstablishmentSettings.vue'
import EmergencyUnit from 'components/profile/EmergencyUnit.vue'

const authStore = useAuthStore()
const tab = ref('personal')
</script>

<style scoped>
.dashboard-pro-bg {
  background-image: url('src/assets/nutrogan-bg4.png');
  background-size: cover;
  background-attachment: fixed;
}
.glass-card {
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.opacity-20 {
  opacity: 0.2;
}
.font-outfit {
  font-family: 'Outfit', sans-serif;
}
</style>
