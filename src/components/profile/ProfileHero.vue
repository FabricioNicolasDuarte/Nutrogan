<template>
  <q-card
    class="profile-card column no-shadow relative-position overflow-hidden"
    :class="{ 'full-height': !$q.screen.lt.md }"
  >
    <div class="card-header relative-position">
      <div class="brand-accent"></div>
      <q-btn
        flat
        round
        dense
        icon="logout"
        color="white"
        class="absolute-top-right q-ma-md z-10 opacity-hover"
        @click="confirmarSalida"
      >
        <q-tooltip>Cerrar Sesión</q-tooltip>
      </q-btn>
    </div>

    <q-card-section
      class="column items-center relative-position"
      :class="$q.screen.lt.md ? 'q-pb-lg' : 'col-grow'"
      style="margin-top: -50px"
    >
      <div class="avatar-wrapper q-mb-md relative-position">
        <q-avatar size="110px" class="profile-avatar shadow-5">
          <img
            :src="currentAvatarUrl"
            style="object-fit: cover; background: #000"
            @error="onAvatarError"
          />
        </q-avatar>
        <q-btn
          round
          color="grey-9"
          text-color="white"
          icon="camera_alt"
          size="xs"
          class="edit-badge"
          @click="triggerFilePicker"
        />
      </div>

      <div class="text-center full-width q-px-md">
        <div class="editable-input-wrapper q-mb-xs">
          <input
            v-model="profile.nombre_completo"
            class="text-h6 font-modern text-white text-center bg-transparent no-border full-width ellipsis"
            placeholder="Tu Nombre"
            @blur="saveChanges"
          />
          <q-icon name="edit" size="12px" color="grey-6" class="edit-icon" />
        </div>

        <div class="row justify-center items-center q-gutter-x-sm q-mb-md">
          <q-badge color="primary" text-color="black" class="text-weight-bold">
            {{ (profile.rol || 'ADMINISTRADOR').toUpperCase() }}
          </q-badge>
          <span class="text-caption text-grey-6">|</span>
          <span class="text-caption text-grey-5">Plan PRO</span>
        </div>
      </div>

      <q-separator dark class="full-width q-my-md opacity-20" />

      <div class="full-width q-px-lg q-gutter-y-md">
        <div class="info-row">
          <div class="text-caption text-grey-5 q-mb-xs">Teléfono / Móvil</div>
          <q-input
            v-model="profile.telefono"
            dense
            borderless
            class="input-clean text-body2"
            placeholder="Sin asignar"
            color="primary"
            @blur="saveChanges"
          >
            <template v-slot:prepend><q-icon name="phone" size="xs" color="primary" /></template>
          </q-input>
        </div>

        <div class="info-row">
          <div class="text-caption text-grey-5 q-mb-xs">Cuenta de Acceso</div>
          <div class="row items-center q-py-xs text-grey-3">
            <q-icon name="mail" size="xs" color="grey-6" class="q-mr-sm" />
            <div class="ellipsis" style="font-size: 0.9rem">{{ authStore.user?.email }}</div>
          </div>
        </div>

        <div class="q-mt-lg">
          <q-btn
            outline
            color="grey-5"
            label="Cambiar Contraseña"
            icon="lock_reset"
            class="full-width border-neon-hover"
            size="sm"
            @click="dialogPass = true"
          />
        </div>
      </div>
    </q-card-section>

    <div class="bg-dark-lighter q-py-sm q-px-md text-center">
      <div class="text-caption text-grey-7" style="font-size: 0.7rem">
        Miembro desde {{ memberSince }}
      </div>
    </div>

    <q-file
      ref="fileInput"
      v-model="avatarFile"
      accept="image/*"
      class="hidden"
      @update:model-value="uploadAvatar"
    />

    <q-dialog v-model="dialogPass">
      <q-card class="bg-dark text-white border-neon" style="width: 300px">
        <q-card-section class="bg-dark-header">
          <div class="text-subtitle1 text-weight-bold">Seguridad</div>
          <div class="text-caption text-grey-5">Establece tu nueva clave</div>
        </q-card-section>
        <q-form @submit.prevent="cambiarPass">
          <q-card-section class="q-gutter-y-md">
            <q-input
              v-model="newPass"
              label="Nueva Contraseña"
              type="password"
              outlined
              dense
              dark
              color="primary"
              :rules="[(val) => val.length >= 6 || 'Mínimo 6 caracteres']"
            />
          </q-card-section>
          <q-card-actions align="right" class="bg-dark-soft">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn label="Actualizar" color="primary" type="submit" :loading="updatingPass" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useAuthStore } from 'stores/auth-store'
import { useQuasar } from 'quasar'
import { supabase } from 'boot/supabase'
// Eliminado: import { useRouter } from 'vue-router' <-- CAUSABA EL ERROR

const authStore = useAuthStore()
const $q = useQuasar()
// Eliminado: const router = useRouter() <-- CAUSABA EL ERROR

const fileInput = ref(null)
const avatarFile = ref(null)
const profile = reactive({ nombre_completo: '', telefono: '', avatar_url: '', rol: '' })
const imgError = ref(false)

// Estados para cambio de contraseña
const dialogPass = ref(false)
const newPass = ref('')
const updatingPass = ref(false)

const memberSince = computed(() => {
  if (authStore.user?.created_at) {
    return new Date(authStore.user.created_at).toLocaleDateString('es-ES', {
      month: 'short',
      year: 'numeric',
    })
  }
  return '---'
})

const currentAvatarUrl = computed(() => {
  if (imgError.value || !profile.avatar_url) {
    return `https://ui-avatars.com/api/?name=${profile.nombre_completo || 'User'}&background=1d1d1d&color=fff&size=128`
  }
  return profile.avatar_url
})

function onAvatarError() {
  imgError.value = true
}
function triggerFilePicker() {
  fileInput.value.pickFiles()
}

async function saveChanges() {
  try {
    await supabase
      .from('perfiles_usuarios')
      .update({ nombre_completo: profile.nombre_completo, telefono: profile.telefono })
      .eq('id', authStore.user.id)
    $q.notify({ type: 'positive', message: 'Datos actualizados', icon: 'check', timeout: 1000 })
  } catch (e) {
    console.error(e)
  }
}

async function uploadAvatar(file) {
  if (!file) return
  const notif = $q.notify({
    type: 'ongoing',
    message: 'Subiendo foto...',
    spinner: true,
    timeout: 0,
  })
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `avatar-${authStore.user.id}-${Date.now()}.${fileExt}`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
    await supabase
      .from('perfiles_usuarios')
      .update({ avatar_url: data.publicUrl })
      .eq('id', authStore.user.id)
    profile.avatar_url = data.publicUrl
    imgError.value = false
    notif({
      type: 'positive',
      message: 'Foto actualizada correctamente',
      spinner: false,
      icon: 'check',
      timeout: 2500,
    })
  } catch (e) {
    console.error(e)
    notif({
      type: 'negative',
      message: 'Error al subir imagen',
      spinner: false,
      icon: 'error',
      timeout: 4000,
    })
  } finally {
    avatarFile.value = null
  }
}

// NUEVA FUNCIÓN: Cambiar Contraseña
async function cambiarPass() {
  updatingPass.value = true
  const res = await authStore.updatePassword(newPass.value)
  if (res.success) {
    $q.notify({ type: 'positive', message: 'Contraseña actualizada con éxito' })
    dialogPass.value = false
    newPass.value = ''
  } else {
    $q.notify({ type: 'negative', message: 'Error: ' + res.error })
  }
  updatingPass.value = false
}

function confirmarSalida() {
  $q.dialog({
    title: 'Cerrar Sesión',
    message: '¿Estás seguro?',
    cancel: true,
    persistent: true,
    dark: true,
    class: 'border-neon',
    ok: { label: 'Salir', flat: true, color: 'red' },
  }).onOk(async () => {
    // El store maneja la redirección forzada, no necesitamos el router aquí
    await authStore.logout()
  })
}

watch(
  () => authStore.profile,
  (newProfile) => {
    if (newProfile) Object.assign(profile, newProfile)
  },
  { immediate: true, deep: true },
)
</script>

<style scoped lang="scss">
.profile-card {
  background: #121214;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.card-header {
  height: 100px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.brand-accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, transparent, #39ff14, transparent);
  opacity: 0.8;
}
.profile-avatar {
  border: 4px solid #121214;
  background: #222;
}
.edit-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  border: 2px solid #121214;
}
.input-clean :deep(.q-field__control) {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 0 8px;
}
.input-clean:hover :deep(.q-field__control) {
  background: rgba(255, 255, 255, 0.08);
}
.input-clean :deep(.q-field__native) {
  color: white;
}
.editable-input-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
  input {
    outline: none;
    transition: color 0.2s;
  }
  input:focus {
    color: #39ff14;
  }
  .edit-icon {
    position: absolute;
    top: 50%;
    right: 10px;
    transform: translateY(-50%);
    opacity: 0;
    transition: opacity 0.2s;
  }
  &:hover .edit-icon {
    opacity: 1;
  }
}
.bg-dark-lighter {
  background: rgba(255, 255, 255, 0.03);
}
.bg-dark-soft {
  background: rgba(0, 0, 0, 0.3);
}
.bg-dark-header {
  background: #000;
}
.opacity-20 {
  opacity: 0.2;
}
.opacity-hover {
  opacity: 0.6;
  transition: opacity 0.2s;
  &:hover {
    opacity: 1;
  }
}
.font-modern {
  font-family: 'Outfit', sans-serif;
}
.border-neon {
  border: 1px solid #39ff14;
}
.border-neon-hover:hover {
  border: 1px solid #39ff14;
  color: #39ff14 !important;
}
</style>
