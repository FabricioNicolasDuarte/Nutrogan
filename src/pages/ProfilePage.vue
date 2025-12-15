<template>
  <q-page class="profile-bg text-white font-outfit">
    <div class="fixed-full bg-overlay"></div>

    <div class="relative-position z-10 q-pa-md container-limit">
      <div class="row items-center q-mb-lg">
        <q-btn flat round icon="arrow_back" color="white" @click="$router.back()" class="q-mr-sm" />
        <div class="text-h5 text-weight-bold">Mi Cuenta</div>
      </div>

      <div class="row q-col-gutter-lg">
        <div class="col-12 col-md-4 col-lg-3">
          <div class="sticky-sidebar column q-gutter-y-md">
            <ProfileHero />

            <div class="gt-sm bg-glass rounded-borders overflow-hidden">
              <q-list separator dark>
                <q-item
                  clickable
                  v-ripple
                  :active="tab === 'personal'"
                  active-class="text-primary bg-active"
                  @click="tab = 'personal'"
                >
                  <q-item-section avatar><q-icon name="person" /></q-item-section>
                  <q-item-section>Mis Datos</q-item-section>
                </q-item>

                <q-item
                  v-if="authStore.canManageTeam"
                  clickable
                  v-ripple
                  :active="tab === 'team'"
                  active-class="text-primary bg-active"
                  @click="tab = 'team'"
                >
                  <q-item-section avatar><q-icon name="groups" /></q-item-section>
                  <q-item-section>Equipo</q-item-section>
                </q-item>

                <q-item
                  v-if="authStore.canViewEstablishmentData"
                  clickable
                  v-ripple
                  :active="tab === 'establishment'"
                  active-class="text-primary bg-active"
                  @click="tab = 'establishment'"
                >
                  <q-item-section avatar><q-icon name="domain" /></q-item-section>
                  <q-item-section>Establecimiento</q-item-section>
                </q-item>
              </q-list>
            </div>

            <EmergencyUnit />
          </div>
        </div>

        <div class="col-12 col-md-8 col-lg-9">
          <div class="lt-md q-mb-md">
            <div class="row q-gutter-sm no-wrap scroll-x">
              <q-btn
                :flat="tab !== 'personal'"
                :color="tab === 'personal' ? 'primary' : 'white'"
                :text-color="tab === 'personal' ? 'black' : 'white'"
                label="Datos"
                icon="person"
                @click="tab = 'personal'"
                rounded
                no-caps
              />

              <q-btn
                v-if="authStore.canManageTeam"
                :flat="tab !== 'team'"
                :color="tab === 'team' ? 'primary' : 'white'"
                :text-color="tab === 'team' ? 'black' : 'white'"
                label="Equipo"
                icon="groups"
                @click="tab = 'team'"
                rounded
                no-caps
              />

              <q-btn
                v-if="authStore.canViewEstablishmentData"
                :flat="tab !== 'establishment'"
                :color="tab === 'establishment' ? 'primary' : 'white'"
                :text-color="tab === 'establishment' ? 'black' : 'white'"
                label="Establecimiento"
                icon="domain"
                @click="tab = 'establishment'"
                rounded
                no-caps
              />
            </div>
          </div>

          <q-tab-panels
            v-model="tab"
            animated
            transition-prev="fade"
            transition-next="fade"
            class="bg-transparent text-white"
          >
            <q-tab-panel name="personal" class="q-pa-none">
              <div class="bg-glass q-pa-lg rounded-borders">
                <div class="text-h6 q-mb-lg">Información Básica</div>

                <div class="row q-col-gutter-md">
                  <div class="col-12">
                    <label class="text-caption text-grey-5 q-mb-xs block">Identificación</label>
                    <q-input
                      v-model="authStore.profile.nombre_completo"
                      filled
                      dark
                      readonly
                      class="input-dark"
                    >
                      <template v-slot:prepend><q-icon name="badge" color="grey-6" /></template>
                    </q-input>
                  </div>

                  <div class="col-12">
                    <label class="text-caption text-grey-5 q-mb-xs block"
                      >Credencial de Acceso (Email)</label
                    >
                    <q-input
                      :model-value="authStore.user?.email"
                      filled
                      dark
                      readonly
                      class="input-dark"
                    >
                      <template v-slot:prepend><q-icon name="email" color="grey-6" /></template>
                      <template v-slot:append
                        ><q-icon name="lock" size="xs" color="grey-7"
                      /></template>
                    </q-input>
                  </div>
                </div>

                <div class="q-mt-xl text-caption text-grey-6 text-center">
                  Para cerrar sesión, utiliza el botón en la barra lateral del sistema.
                </div>
              </div>
            </q-tab-panel>

            <q-tab-panel name="team" class="q-pa-none">
              <TeamManager />
            </q-tab-panel>

            <q-tab-panel name="establishment" class="q-pa-none">
              <EstablishmentSettings />
            </q-tab-panel>
          </q-tab-panels>
        </div>
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
.profile-bg {
  background: #050505;
  min-height: 100vh;
}
.bg-overlay {
  background-image: url('src/assets/nutrogan-bg4.png');
  background-size: cover;
  background-attachment: fixed;
  opacity: 0.3;
  z-index: 0;
}
.container-limit {
  max-width: 1400px;
  margin: 0 auto;
}
.sticky-sidebar {
  position: sticky;
  top: 24px;
  z-index: 50;
}
.bg-glass {
  background: rgba(20, 20, 20, 0.85); /* Más oscuro para legibilidad */
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.bg-active {
  background: rgba(57, 255, 20, 0.1);
  border-right: 3px solid #39ff14;
  font-weight: 600;
}
.input-dark :deep(.q-field__control) {
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
}
.scroll-x {
  overflow-x: auto;
  white-space: nowrap;
  padding-bottom: 4px;
}
.font-outfit {
  font-family: 'Outfit', sans-serif;
}
</style>
