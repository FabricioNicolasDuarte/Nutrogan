<template>
  <q-card class="bg-red-gradient text-white q-mt-lg no-shadow overflow-hidden relative-position">
    <div class="row items-center justify-between q-pa-md relative-position z-10">
      <div class="row items-center">
        <q-icon name="warning" size="md" class="q-mr-md text-white" />
        <div>
          <div class="text-subtitle1 text-weight-bold">Unidad de Emergencia</div>
          <div class="text-caption opacity-80">
            {{ config.nombre || 'Configurar número' }} - {{ config.valor || '---' }}
          </div>
        </div>
      </div>

      <div class="row q-gutter-x-sm">
        <q-btn flat round icon="settings" @click="dialog = true" />
        <q-btn
          :href="config.valor ? `tel:${config.valor}` : '#'"
          color="white"
          text-color="red"
          label="Llamar"
          icon="call"
          :disable="!config.valor"
        />
      </div>
    </div>

    <q-dialog v-model="dialog">
      <q-card class="bg-grey-10 text-white" style="width: 300px">
        <q-card-section class="bg-red-9">Configuración</q-card-section>
        <q-card-section class="q-gutter-y-md q-pt-lg">
          <q-input v-model="temp.nombre" label="Nombre" filled dark />
          <q-input v-model="temp.valor" label="Teléfono" filled dark />
          <q-btn label="Guardar" color="red" class="full-width" @click="guardar" />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useDataStore } from 'stores/data-store'

const store = useDataStore()
const dialog = ref(false)
const config = reactive({ nombre: 'Emergencias', valor: '' })
const temp = reactive({ ...config })

async function guardar() {
  Object.assign(config, temp)
  await store.updateConfigEmergencia(config)
  dialog.value = false
}

onMounted(() => {
  if (store.establecimientoActual?.emergencia_config) {
    Object.assign(config, store.establecimientoActual.emergencia_config)
    Object.assign(temp, config)
  }
})
</script>

<style scoped>
.bg-red-gradient {
  background: linear-gradient(90deg, #b71c1c 0%, #d32f2f 100%);
  border-radius: 12px;
}
.opacity-80 {
  opacity: 0.8;
}
</style>
