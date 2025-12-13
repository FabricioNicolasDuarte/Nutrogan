<template>
  <div>
    <q-btn-dropdown
      flat
      no-caps
      class="est-selector-btn q-ml-sm"
      content-class="bg-dark-glass text-white border-neon"
      :menu-offset="[0, 10]"
      dense
    >
      <template v-slot:label>
        <div class="row items-center no-wrap">
          <q-icon name="domain" size="20px" class="q-mr-sm text-primary" />
          <div
            class="column items-start text-left ellipsis"
            style="line-height: 1.1; max-width: 120px"
          >
            <span class="text-weight-bold text-white text-body2 ellipsis full-width">
              {{ currentEstName }}
            </span>
            <span class="text-caption text-grey-5 gt-xs" style="font-size: 0.7rem">
              {{ currentRoleName }}
            </span>
          </div>
        </div>
      </template>

      <q-list style="min-width: 250px">
        <q-item-label header class="text-grey-5 text-uppercase font-mono text-caption">
          Mis Establecimientos
        </q-item-label>

        <q-item
          v-for="est in authStore.userEstablishments"
          :key="est.id"
          clickable
          v-close-popup
          @click="cambiarCampo(est.id)"
          :active="est.id === authStore.profile?.establecimiento_id"
          active-class="text-primary bg-primary-soft"
        >
          <q-item-section avatar>
            <q-icon
              :name="
                est.id === authStore.profile?.establecimiento_id
                  ? 'radio_button_checked'
                  : 'radio_button_unchecked'
              "
            />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ est.nombre }}</q-item-label>
            <q-item-label caption class="text-grey-5">{{
              est.ciudad || 'Sin ubicación'
            }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge
              :color="getRoleColor(est.rol)"
              text-color="black"
              :label="est.rol ? est.rol.substring(0, 3).toUpperCase() : 'UNK'"
            />
          </q-item-section>
        </q-item>

        <q-separator dark class="q-my-xs" />

        <q-item clickable v-close-popup @click="abrirDialogoCrear">
          <q-item-section avatar>
            <q-icon name="add_circle" color="primary" />
          </q-item-section>
          <q-item-section class="text-primary">Nuevo Establecimiento</q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>

    <q-dialog v-model="showCreateDialog">
      <q-card class="bg-dark text-white border-neon" style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">Crear Nuevo Campo</div>
          <div class="text-caption text-grey-5">
            Se creará un espacio vacío donde serás Administrador.
          </div>
        </q-card-section>

        <q-form @submit.prevent="guardarNuevo">
          <q-card-section class="q-pt-none">
            <q-input
              v-model="newEstName"
              label="Nombre del Establecimiento"
              placeholder="Ej: La Estancia"
              outlined
              dark
              color="primary"
              :rules="[(val) => !!val || 'Requerido']"
              autofocus
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn label="Crear" type="submit" color="primary" :loading="loading" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from 'stores/auth-store'
import { useQuasar } from 'quasar'

const authStore = useAuthStore()
const $q = useQuasar()

// Estados
const showCreateDialog = ref(false)
const newEstName = ref('')
const loading = ref(false)

const currentEstName = computed(() => {
  const current = authStore.userEstablishments.find(
    (e) => e.id === authStore.profile?.establecimiento_id,
  )
  return current ? current.nombre : 'Seleccionar'
})

const currentRoleName = computed(() => {
  return authStore.currentRole ? authStore.currentRole.toUpperCase() : 'INVITADO'
})

function getRoleColor(rol) {
  if (rol === 'admin') return 'primary'
  if (rol === 'tecnico') return 'cyan'
  return 'grey-5'
}

async function cambiarCampo(id) {
  if (id === authStore.profile?.establecimiento_id) return

  $q.loading.show({ message: 'Cambiando de establecimiento...' })
  await authStore.switchEstablishment(id)
}

function abrirDialogoCrear() {
  newEstName.value = ''
  showCreateDialog.value = true
}

async function guardarNuevo() {
  if (!newEstName.value.trim()) return

  loading.value = true
  try {
    await authStore.crearEstablecimiento(newEstName.value)
    $q.notify({ type: 'positive', message: '¡Establecimiento creado exitosamente!' })
    showCreateDialog.value = false
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error al crear: ' + e.message })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.est-selector-btn {
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.4);
  transition: all 0.3s;

  /* Ajuste para móvil: reducir padding agresivamente */
  @media (max-width: 599px) {
    padding: 2px 4px;
    margin-left: 0 !important; /* Quitar margen izquierdo en móvil */
    .q-mr-sm {
      margin-right: 4px !important; /* Reducir espacio icono */
    }
  }

  &:hover {
    border-color: #39ff14;
    background: rgba(0, 0, 0, 0.7);
  }
}

.bg-dark-glass {
  background: rgba(15, 15, 20, 0.95) !important;
  backdrop-filter: blur(10px);
}
.border-neon {
  border: 1px solid rgba(57, 255, 20, 0.3);
}
.bg-primary-soft {
  background: rgba(57, 255, 20, 0.1);
}
.font-mono {
  font-family: 'Fira Code', monospace;
}
</style>
