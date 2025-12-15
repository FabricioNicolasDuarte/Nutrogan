<template>
  <div class="glass-hero q-pa-lg column items-center text-center">
    <div class="relative-position q-mb-md">
      <q-avatar size="100px" class="shadow-10 bg-grey-9">
        <img :src="currentAvatarUrl" style="object-fit: cover" @error="imgError = true" />
      </q-avatar>
      <q-btn
        round
        color="primary"
        text-color="black"
        icon="camera_alt"
        size="xs"
        class="absolute-bottom-right"
        style="bottom: 0; right: 0"
        @click="fileInput.pickFiles()"
      />
    </div>

    <div class="full-width q-mb-xs">
      <input
        v-model="profile.nombre_completo"
        class="hero-input text-h6 text-white text-center"
        placeholder="Tu Nombre"
        @blur="saveChanges"
      />
      <q-icon name="edit" size="xs" color="grey-6" class="q-ml-xs" />
    </div>

    <q-badge color="grey-8" text-color="white" class="q-mb-md">
      {{ profile.rol || 'USUARIO' }}
    </q-badge>

    <div class="full-width q-px-sm q-mb-lg">
      <div class="bg-dark-soft rounded-borders q-pa-sm row items-center q-mb-sm">
        <q-icon name="phone" color="grey-5" class="q-mr-sm" />
        <input
          v-model="profile.telefono"
          class="bare-input text-white col"
          placeholder="Añadir teléfono"
          @blur="saveChanges"
        />
      </div>
      <q-btn
        outline
        size="sm"
        color="grey-5"
        label="Cambiar Contraseña"
        class="full-width"
        icon="lock"
        @click="dialogPass = true"
      />
    </div>

    <q-file
      ref="fileInput"
      v-model="avatarFile"
      accept="image/*"
      class="hidden"
      @update:model-value="uploadAvatar"
    />

    <q-dialog v-model="dialogPass">
      <q-card class="bg-grey-10 text-white" style="width: 300px">
        <q-card-section>
          <div class="text-h6">Nueva Contraseña</div>
        </q-card-section>
        <q-form @submit.prevent="cambiarPass">
          <q-card-section class="q-gutter-y-md">
            <q-input
              v-model="newPass"
              type="password"
              filled
              dark
              dense
              label="Contraseña"
              :rules="[(val) => val.length >= 6 || 'Min 6 caracteres']"
            />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancelar" v-close-popup color="grey" />
            <q-btn flat label="Guardar" type="submit" color="primary" :loading="updatingPass" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useAuthStore } from 'stores/auth-store'
import { useQuasar } from 'quasar'
import { supabase } from 'boot/supabase'

const authStore = useAuthStore()
const $q = useQuasar()

const fileInput = ref(null)
const avatarFile = ref(null)
const profile = reactive({ nombre_completo: '', telefono: '', avatar_url: '', rol: '' })
const imgError = ref(false)

const dialogPass = ref(false)
const newPass = ref('')
const updatingPass = ref(false)

const currentAvatarUrl = computed(() => {
  if (imgError.value || !profile.avatar_url) {
    return `https://ui-avatars.com/api/?name=${profile.nombre_completo || 'User'}&background=333&color=fff`
  }
  return profile.avatar_url
})

async function saveChanges() {
  try {
    await supabase
      .from('perfiles_usuarios')
      .update({
        nombre_completo: profile.nombre_completo,
        telefono: profile.telefono,
      })
      .eq('id', authStore.user.id)
    $q.notify({ type: 'positive', message: 'Actualizado', timeout: 1000 })
  } catch (e) {
    // CORREGIDO ESLINT
    console.error(e)
  }
}

async function uploadAvatar(file) {
  if (!file) return
  try {
    const fileName = `avatar-${authStore.user.id}-${Date.now()}`
    const { error } = await supabase.storage.from('avatars').upload(fileName, file)
    if (error) throw error
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
    await supabase
      .from('perfiles_usuarios')
      .update({ avatar_url: data.publicUrl })
      .eq('id', authStore.user.id)
    profile.avatar_url = data.publicUrl
    imgError.value = false
    $q.notify({ type: 'positive', message: 'Avatar actualizado' })
  } catch (e) {
    // CORREGIDO ESLINT
    console.error(e)
    $q.notify({ type: 'negative', message: 'Error al subir imagen' })
  } finally {
    avatarFile.value = null
  }
}

async function cambiarPass() {
  updatingPass.value = true
  // Nota: authStore.updatePassword devuelve { success, error }
  // Asumimos que maneja sus errores internamente o retorna el objeto error
  const res = await authStore.updatePassword(newPass.value)
  if (res.success) {
    $q.notify({ type: 'positive', message: 'Contraseña cambiada' })
    dialogPass.value = false
    newPass.value = ''
  } else {
    $q.notify({ type: 'negative', message: res.error })
  }
  updatingPass.value = false
}

watch(
  () => authStore.profile,
  (p) => {
    if (p) Object.assign(profile, p)
  },
  { immediate: true, deep: true },
)
</script>

<style scoped lang="scss">
.glass-hero {
  background: rgba(20, 20, 20, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
}
.hero-input {
  background: transparent;
  border: none;
  border-bottom: 1px solid transparent;
  width: 80%;
  outline: none;
  transition: border-color 0.3s;
  &:focus {
    border-bottom-color: #39ff14;
  }
}
.bare-input {
  background: transparent;
  border: none;
  outline: none;
  width: 100%;
}
.bg-dark-soft {
  background: rgba(0, 0, 0, 0.3);
}
</style>
