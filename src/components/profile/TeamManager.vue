<template>
  <q-card
    class="interactive-board column no-shadow relative-position"
    :class="{ 'full-height': !$q.screen.lt.md }"
  >
    <div class="row items-center justify-between q-pa-md border-b glass-header" style="gap: 10px">
      <div class="col-12 col-sm-auto">
        <div class="text-h6 text-white leading-none">Gestión de Equipo</div>
        <div class="text-caption text-grey-5 q-mt-xs">Roles y alertas</div>
      </div>

      <div class="row q-gutter-sm col-12 col-sm-auto justify-end">
        <q-btn
          unelevated
          rounded
          color="primary"
          text-color="black"
          icon="campaign"
          label="NOTIF"
          class="text-weight-bold shadow-glow"
          size="sm"
          @click="abrirAlertas"
        />

        <q-btn
          flat
          rounded
          color="white"
          icon="person_add"
          label="Invitar"
          class="glass-btn"
          size="sm"
          @click="showInviteDialog = true"
        />
      </div>
    </div>

    <div class="board-content col column q-pa-md">
      <div
        class="scroll relative-position q-mb-md team-list-container"
        :class="$q.screen.lt.md ? '' : 'col-grow'"
      >
        <div
          v-if="dataStore.miembrosEquipo.length === 0"
          class="absolute-center text-center text-grey-6"
        >
          <q-spinner-dots size="3em" class="q-mb-sm" />
          <div class="q-mt-sm">Cargando equipo...</div>
        </div>

        <div v-else class="team-grid">
          <div
            v-for="miembro in dataStore.miembrosEquipo"
            :key="miembro.id"
            class="member-card cursor-grab"
            draggable="true"
            @dragstart="onDragStart($event, miembro)"
          >
            <div class="row items-center justify-between">
              <div
                class="row items-center no-wrap cursor-pointer"
                @click="abrirEditarPerfil(miembro)"
              >
                <q-avatar
                  :color="getColor(miembro.rol)"
                  text-color="black"
                  size="md"
                  font-size="12px"
                  class="q-mr-sm"
                >
                  {{ getIniciales(miembro.nombre_completo) }}
                </q-avatar>
                <div class="column">
                  <span
                    class="text-white text-weight-bold text-body2 ellipsis"
                    style="max-width: 110px"
                    >{{ miembro.nombre_completo }}</span
                  >
                  <span
                    class="text-primary text-caption text-uppercase"
                    style="font-size: 0.65rem"
                    >{{ miembro.rol }}</span
                  >
                </div>
              </div>

              <q-btn-dropdown
                flat
                round
                dense
                :color="getColor(miembro.rol)"
                size="sm"
                icon="settings"
              >
                <q-list class="bg-dark text-white border-neon">
                  <q-item-label header>ACCIONES</q-item-label>
                  <q-item clickable v-close-popup @click="abrirEditarPerfil(miembro)">
                    <q-item-section avatar><q-icon name="edit" color="white" /></q-item-section>
                    <q-item-section>Editar Datos</q-item-section>
                  </q-item>
                  <q-separator dark />
                  <q-item-label header>ROLES</q-item-label>
                  <q-item clickable v-close-popup @click="cambiarRol(miembro, 'admin')">
                    <q-item-section avatar><q-icon name="shield" color="primary" /></q-item-section>
                    <q-item-section>Admin</q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="cambiarRol(miembro, 'tecnico')">
                    <q-item-section avatar
                      ><q-icon name="engineering" color="cyan"
                    /></q-item-section>
                    <q-item-section>Técnico</q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="cambiarRol(miembro, 'operario')">
                    <q-item-section avatar
                      ><q-icon name="agriculture" color="grey"
                    /></q-item-section>
                    <q-item-section>Operario</q-item-section>
                  </q-item>
                  <q-separator dark />
                  <q-item
                    clickable
                    v-close-popup
                    @click="eliminarMiembro(miembro)"
                    class="text-red"
                  >
                    <q-item-section avatar><q-icon name="person_remove" /></q-item-section>
                    <q-item-section>Quitar</q-item-section>
                  </q-item>
                </q-list>
              </q-btn-dropdown>
            </div>

            <div class="row q-mt-sm q-gutter-x-xs justify-end">
              <div
                v-if="miembro.config_notificaciones?.lluvia"
                class="dot-indicator bg-cyan-4"
              ></div>
              <div
                v-if="miembro.config_notificaciones?.sanidad"
                class="dot-indicator bg-yellow-500"
              ></div>
              <div
                v-if="miembro.config_notificaciones?.stock"
                class="dot-indicator bg-primary"
              ></div>
              <div
                v-if="miembro.config_notificaciones?.general"
                class="dot-indicator bg-white"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <q-separator dark class="q-mb-md opacity-20" />

      <div class="text-subtitle2 text-grey-5 q-mb-sm font-mono text-uppercase">
        Canales de Suscripción
      </div>

      <div class="row q-col-gutter-md hub-container">
        <div class="col-12 col-sm-6 col-lg-3" v-for="cat in categoriasHub" :key="cat.id">
          <div
            class="notification-hub column"
            :class="`hub-${cat.color}`"
            @dragover.prevent
            @drop="onDrop($event, cat.id)"
          >
            <div class="hub-header" :class="`text-${cat.text_color}`">
              <div class="row items-center justify-center">
                <q-icon :name="cat.icon" size="xs" class="q-mr-xs" /> {{ cat.label }}
              </div>
            </div>

            <div class="hub-body col relative-position scroll q-pa-sm">
              <div v-if="getSubscribers(cat.id).length > 0" class="q-gutter-y-xs full-width">
                <div
                  v-for="(m, index) in getSubscribers(cat.id)"
                  :key="m.id"
                  class="tech-chip row items-center justify-between animate-pop"
                  :class="`border-${cat.color}`"
                >
                  <div class="row items-center no-wrap col ellipsis">
                    <div
                      class="index-box font-mono"
                      :class="`bg-${cat.color}-glass text-${cat.text_color}`"
                    >
                      {{ (index + 1).toString().padStart(2, '0') }}
                    </div>
                    <span class="text-caption text-white q-ml-sm ellipsis">{{
                      m.nombre_completo
                    }}</span>
                  </div>
                  <q-btn
                    flat
                    round
                    dense
                    icon="close"
                    size="xs"
                    color="grey-6"
                    class="hover-red"
                    @click="unsubscribe(m, cat.id)"
                  >
                    <q-tooltip class="bg-red text-white">Desvincular</q-tooltip>
                  </q-btn>
                </div>
              </div>

              <div
                v-else
                class="absolute-center text-center opacity-30 full-width pointer-events-none"
              >
                <q-icon :name="cat.icon" size="2em" />
                <div class="text-caption text-uppercase q-mt-xs" style="font-size: 0.6rem">
                  Arrastra Aquí
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <q-dialog
      v-model="dialogoAlertas"
      full-width
      full-height
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card class="bg-dark text-white column">
        <q-toolbar class="bg-dark-header border-b">
          <q-icon name="campaign" color="primary" size="md" />
          <q-toolbar-title class="font-display">Centro de Comunicaciones</q-toolbar-title>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-toolbar>

        <div class="row col">
          <div class="col-12 col-md-6 border-r q-pa-md scroll">
            <q-tabs
              v-model="alertTab"
              dense
              class="text-grey"
              active-color="primary"
              indicator-color="primary"
              align="left"
            >
              <q-tab name="nueva" label="Redactar Alerta" icon="edit" />
              <q-tab name="historial" label="Historial" icon="history" />
            </q-tabs>

            <q-tab-panels v-model="alertTab" animated class="bg-transparent q-mt-md">
              <q-tab-panel name="nueva" class="q-pa-none">
                <q-form @submit.prevent="enviarAlertaManual" class="q-gutter-y-md">
                  <div class="row q-col-gutter-md">
                    <div class="col-12 col-sm-6">
                      <q-select
                        v-model="alertaForm.categoria"
                        :options="categoriasHub.map((c) => ({ label: c.label, value: c.id }))"
                        label="Canal Destino"
                        outlined
                        dark
                        color="primary"
                        emit-value
                        map-options
                      />
                    </div>
                    <div class="col-12 col-sm-6">
                      <q-select
                        v-model="alertaForm.prioridad"
                        :options="[
                          { label: 'Urgente (Inmediato)', value: 'urgente' },
                          { label: 'Solo Guardar', value: 'programado' },
                        ]"
                        label="Prioridad"
                        outlined
                        dark
                        color="primary"
                        emit-value
                        map-options
                      />
                    </div>
                  </div>
                  <q-input
                    v-model="alertaForm.titulo"
                    label="Asunto"
                    outlined
                    dark
                    color="primary"
                    :rules="[(val) => !!val || 'Requerido']"
                  />
                  <q-editor
                    v-model="alertaForm.mensaje"
                    min-height="150px"
                    dark
                    content-class="bg-dark-soft text-grey-3"
                    toolbar-text-color="white"
                    toolbar-toggle-color="primary"
                    placeholder="Escribe tu mensaje aquí..."
                  />

                  <div class="row justify-end q-pt-md">
                    <q-btn
                      label="Enviar Notificación"
                      type="submit"
                      color="primary"
                      text-color="black"
                      icon="send"
                      :loading="loadingAlert"
                    />
                  </div>
                </q-form>
              </q-tab-panel>

              <q-tab-panel name="historial" class="q-pa-none">
                <div
                  v-if="dataStore.notifications.length === 0"
                  class="text-center q-pa-lg text-grey-6"
                >
                  <q-icon name="inbox" size="3em" />
                  <div>No hay notificaciones enviadas.</div>
                </div>
                <q-list separator dark v-else>
                  <q-item v-for="notif in dataStore.notifications" :key="notif.id">
                    <q-item-section>
                      <q-item-label>{{ notif.titulo }}</q-item-label>
                      <q-item-label caption class="text-grey-5">
                        {{ new Date(notif.created_at).toLocaleDateString() }} •
                        {{ notif.categoria }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <div class="row items-center">
                        <q-badge :color="notif.estado === 'enviado' ? 'green' : 'orange'">{{
                          notif.estado
                        }}</q-badge>
                        <q-btn
                          flat
                          round
                          dense
                          icon="delete"
                          color="red"
                          size="sm"
                          @click="eliminarNotificacion(notif.id)"
                          class="q-ml-sm"
                        />
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-tab-panel>
            </q-tab-panels>
          </div>

          <div
            class="col-12 col-md-6 q-pa-xl bg-black flex flex-center relative-position overflow-hidden gt-sm"
          >
            <div class="text-overline absolute-top-left q-ma-md text-grey-7">VISTA PREVIA</div>
            <div class="email-mockup bg-white full-width shadow-10">
              <div
                class="email-header q-pa-md text-center"
                style="border-top: 4px solid #39ff14; background: #0a0a0a"
              >
                <div class="row justify-center items-center q-mb-sm">
                  <q-icon name="eco" color="primary" size="32px" class="q-mr-sm" />
                  <div class="text-h6 text-white font-display tracking-wide">NUTROGAN</div>
                </div>
                <div class="text-caption text-grey-5 font-mono">AVISO IMPORTANTE</div>
              </div>
              <div class="q-pa-xl text-black">
                <div class="text-subtitle1 text-weight-bold q-mb-sm">
                  {{ alertaForm.titulo || 'Asunto del mensaje' }}
                </div>
                <div
                  class="text-body1 text-grey-8"
                  v-html="alertaForm.mensaje || 'Aquí se mostrará el contenido del correo...'"
                ></div>
                <div class="q-mt-xl q-pt-md border-t text-center">
                  <q-btn
                    style="background: #39ff14; color: #000"
                    label="Acceder al Panel"
                    unelevated
                    rounded
                    class="text-weight-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showInviteDialog">
      <q-card class="bg-dark text-white border-neon" style="width: 400px">
        <q-card-section>
          <div class="text-h6">Invitar Nuevo Miembro</div>
          <div class="text-caption text-grey-5">El usuario debe estar registrado en la app.</div>
        </q-card-section>
        <q-form @submit.prevent="enviarInvitacion">
          <q-card-section class="q-gutter-md">
            <q-input
              v-model="inviteForm.email"
              label="Correo Electrónico"
              outlined
              dark
              color="primary"
              type="email"
              :rules="[(val) => !!val || 'Requerido']"
            />
            <q-select
              v-model="inviteForm.rol"
              :options="roleOptions"
              label="Rol Asignado"
              outlined
              dark
              color="primary"
              emit-value
              map-options
            />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn label="Invitar" type="submit" color="primary" :loading="inviteLoading" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showEditDialog">
      <q-card class="bg-dark text-white border-neon" style="width: 400px">
        <q-card-section>
          <div class="text-h6">Editar Ficha de Usuario</div>
          <div class="text-caption text-grey-5">{{ editForm.email }}</div>
        </q-card-section>

        <q-form @submit.prevent="guardarEdicionPerfil">
          <q-card-section class="q-gutter-md">
            <q-input
              v-model="editForm.nombre_completo"
              label="Nombre Completo"
              outlined
              dark
              color="primary"
              :rules="[(val) => !!val || 'Requerido']"
            />
            <q-input
              v-model="editForm.telefono"
              label="Teléfono / Celular"
              outlined
              dark
              color="primary"
              mask="(###) ### - ####"
              unmasked-value
              hint="Ej: (370) 412 - 3456"
            />
            <q-input
              v-model="editForm.direccion"
              label="Dirección / Ubicación"
              outlined
              dark
              color="primary"
              type="textarea"
              autogrow
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn label="Guardar Cambios" type="submit" color="primary" :loading="editLoading" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useDataStore } from 'stores/data-store'
import { useQuasar } from 'quasar'

const dataStore = useDataStore()
const $q = useQuasar()

// --- ESTADOS ---
const showInviteDialog = ref(false)
const showEditDialog = ref(false)
const dialogoAlertas = ref(false)
const alertTab = ref('nueva')
const inviteLoading = ref(false)
const editLoading = ref(false)
const loadingAlert = ref(false)

const roleOptions = [
  { label: 'Administrador', value: 'admin' },
  { label: 'Técnico', value: 'tecnico' },
  { label: 'Operario', value: 'operario' },
]

const categoriasHub = [
  { id: 'lluvia', label: 'CLIMA', icon: 'thunderstorm', color: 'cyan', text_color: 'cyan-4' },
  {
    id: 'sanidad',
    label: 'SANIDAD',
    icon: 'medical_services',
    color: 'red',
    text_color: 'yellow-7',
  },
  { id: 'stock', label: 'STOCK', icon: 'inventory_2', color: 'green', text_color: 'primary' },
  { id: 'general', label: 'GENERAL', icon: 'notifications', color: 'white', text_color: 'white' },
]

// Formularios
const inviteForm = reactive({ email: '', rol: 'operario' })
const editForm = reactive({
  usuario_id: null,
  nombre_completo: '',
  email: '',
  telefono: '',
  direccion: '',
})
const alertaForm = reactive({
  titulo: '',
  mensaje: '',
  categoria: 'general',
  prioridad: 'urgente',
  fecha_programada: null,
})

// --- HELPERS ---
function getIniciales(text) {
  return text ? text.substring(0, 2).toUpperCase() : 'NN'
}
function getColor(rol) {
  if (rol === 'admin') return 'primary'
  if (rol === 'tecnico') return 'cyan-4'
  return 'blue-grey-4'
}

// --- LOGICA DE SUSCRIPCIONES ---
function getSubscribers(tipo) {
  return dataStore.miembrosEquipo.filter(
    (m) => m.config_notificaciones && m.config_notificaciones[tipo],
  )
}

// 1. Acciones de Equipo
function abrirEditarPerfil(miembro) {
  editForm.usuario_id = miembro.usuario_id
  editForm.nombre_completo = miembro.nombre_completo
  editForm.email = miembro.email
  editForm.telefono = miembro.telefono || ''
  editForm.direccion = miembro.direccion || ''
  showEditDialog.value = true
}

async function guardarEdicionPerfil() {
  editLoading.value = true
  try {
    await dataStore.updatePerfilMiembro(editForm.usuario_id, {
      nombre_completo: editForm.nombre_completo,
      telefono: editForm.telefono,
      direccion: editForm.direccion,
    })
    $q.notify({ type: 'positive', message: 'Datos actualizados' })
    showEditDialog.value = false
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error: ' + e.message })
  } finally {
    editLoading.value = false
  }
}

async function enviarInvitacion() {
  inviteLoading.value = true
  try {
    await dataStore.invitarMiembro(inviteForm.email, inviteForm.rol)
    $q.notify({ type: 'positive', message: 'Usuario invitado correctamente' })
    showInviteDialog.value = false
    inviteForm.email = ''
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error: ' + e.message })
  } finally {
    inviteLoading.value = false
  }
}

async function cambiarRol(miembro, nuevoRol) {
  try {
    await dataStore.updateMiembroRol(miembro.id, nuevoRol)
    $q.notify({ type: 'positive', message: 'Rol actualizado' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error: ' + e.message })
  }
}

async function eliminarMiembro(miembro) {
  $q.dialog({
    title: 'Desvincular',
    message: `¿Quitar a ${miembro.nombre_completo}?`,
    dark: true,
    cancel: true,
  }).onOk(async () => {
    try {
      await dataStore.removeMiembro(miembro.id)
      $q.notify({ type: 'info', message: 'Miembro eliminado' })
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Error: ' + e.message })
    }
  })
}

// 2. Drag & Drop
function onDragStart(event, miembro) {
  event.dataTransfer.setData('text/plain', JSON.stringify(miembro))
}

async function onDrop(event, tipo) {
  try {
    const rawData = event.dataTransfer.getData('text/plain')
    if (!rawData) return
    const miembroData = JSON.parse(rawData)

    const miembroReal = dataStore.miembrosEquipo.find((m) => m.id === miembroData.id)

    if (miembroReal) {
      if (!miembroReal.config_notificaciones) miembroReal.config_notificaciones = {}

      if (!miembroReal.config_notificaciones[tipo]) {
        miembroReal.config_notificaciones[tipo] = true
        $q.notify({
          type: 'positive',
          message: `Asignado a ${tipo.toUpperCase()}`,
          caption: `Usuario: ${miembroReal.nombre_completo}`,
        })
      } else {
        $q.notify({ type: 'warning', message: 'Ya está suscrito', timeout: 500 })
      }
    }
  } catch (e) {
    console.error(e)
  }
}

async function unsubscribe(miembro, tipo) {
  if (miembro.config_notificaciones) {
    miembro.config_notificaciones[tipo] = false
    $q.notify({ type: 'info', message: 'Desvinculado', timeout: 500 })
  }
}

// 3. Notificaciones
function abrirAlertas() {
  dataStore.fetchNotifications()
  dialogoAlertas.value = true
}

async function enviarAlertaManual() {
  loadingAlert.value = true
  try {
    const dest = dataStore.miembrosEquipo.map((m) => ({
      nombre: m.nombre_completo,
      email: m.email,
    }))
    const notifData = {
      ...alertaForm,
      destinatarios_snapshot: JSON.stringify(dest),
    }
    await dataStore.createNotification(notifData)
    $q.notify({ type: 'positive', message: 'Alerta Enviada', icon: 'send' })
    alertaForm.titulo = ''
    alertaForm.mensaje = ''
    alertTab.value = 'historial'
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error: ' + e.message })
  } finally {
    loadingAlert.value = false
  }
}

function eliminarNotificacion(id) {
  dataStore.deleteNotification(id)
}

onMounted(() => {
  dataStore.fetchMiembrosEquipo()
})
</script>

<style scoped lang="scss">
.interactive-board {
  background: rgba(20, 20, 25, 0.75);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  overflow: hidden;
}
.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
.member-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  transition: all 0.2s;
  &:hover {
    border-color: #39ff14;
    background: rgba(255, 255, 255, 0.08);
  }
}
.border-neon {
  border: 1px solid #39ff14;
}
.glass-btn {
  background: rgba(255, 255, 255, 0.1);
}
.glass-header {
  background: rgba(0, 0, 0, 0.4);
}
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* --- ESTILOS MÓVIL ESPECÍFICOS PARA LISTA --- */
@media (max-width: 1023px) {
  .team-list-container {
    height: 300px;
    overflow-y: auto;
    margin-bottom: 20px;
    padding-right: 5px; /* Espacio para scrollbar si aparece */
  }

  /* Asegurar que las tarjetas de suscripción se vean bien apiladas */
  .hub-container {
    padding-bottom: 20px;
  }
}

/* Hubs Estilo "Pro" */
.notification-hub {
  border-radius: 16px;
  height: 100%;
  min-height: 220px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.2);
  transition: all 0.3s;
}
.hub-cyan {
  border-color: rgba(0, 229, 255, 0.3);
}
.hub-red {
  border-color: rgba(201, 255, 23, 0.3);
}
.hub-green {
  border-color: rgba(57, 255, 20, 0.3);
}
.hub-white {
  border-color: rgba(255, 255, 255, 0.3);
}

/* Colores chips */
.bg-cyan-glass {
  background: rgba(0, 229, 255, 0.15);
}
.bg-red-glass {
  background: rgba(212, 255, 23, 0.15);
}
.bg-green-glass {
  background: rgba(57, 255, 20, 0.15);
}
.bg-white-glass {
  background: rgba(255, 255, 255, 0.15);
}

.border-cyan {
  border-left: 3px solid #00e5ff;
}
.border-red {
  border-left: 3px solid #aeff17;
}
.border-green {
  border-left: 3px solid #39ff14;
}
.border-white {
  border-left: 3px solid #ffffff;
}

.tech-chip {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  padding: 4px 6px;
  margin-bottom: 4px;
  transition: background 0.2s;
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    .hover-red {
      opacity: 1;
    }
  }
}
.hover-red {
  opacity: 0;
  transition: opacity 0.2s;
  &:hover {
    color: #ff1744 !important;
    opacity: 1;
  }
}
.index-box {
  font-size: 0.7rem;
  font-weight: bold;
  padding: 2px 5px;
  border-radius: 4px;
  min-width: 24px;
  text-align: center;
}

.dot-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.bg-cyan-4 {
  background: #00e5ff;
}
.bg-yellow-500 {
  background: #b9ff17;
}
.bg-primary {
  background: #39ff14;
}
.bg-white {
  background: #ffffff;
}

.email-mockup {
  border-radius: 8px;
  overflow: hidden;
}
.bg-dark-header {
  background-color: #111;
}
.font-display {
  font-family: 'Outfit', sans-serif;
  font-weight: 800;
}
</style>
