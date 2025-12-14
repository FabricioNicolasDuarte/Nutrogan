<template>
  <q-card
    class="interactive-board column no-shadow relative-position"
    :class="{ 'full-height': !$q.screen.lt.md }"
  >
    <div class="row items-center justify-between q-pa-md border-b glass-header" style="gap: 10px">
      <div class="col-12 col-sm-auto">
        <div class="text-h6 text-white leading-none">Gestión de Equipo</div>
        <div class="text-caption text-grey-5 q-mt-xs">Roles y Alertas</div>
      </div>

      <div class="row q-gutter-sm col-12 col-sm-auto justify-end">
        <q-btn
          unelevated
          rounded
          color="primary"
          text-color="black"
          icon="campaign"
          label="NOTIFICACIONES"
          class="text-weight-bold shadow-glow"
          size="sm"
          @click="abrirAlertas"
        />

        <q-btn
          flat
          rounded
          color="white"
          icon="person_add"
          label="Crear Usuario"
          class="glass-btn"
          size="sm"
          @click="showCreateDialog = true"
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
                  <q-item-label header>CAMBIAR ROL</q-item-label>
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
                    <q-item-section>Eliminar Usuario</q-item-section>
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
        Canales de Suscripción (Arrastrar usuario)
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

    <q-dialog v-model="showCreateDialog">
      <q-card class="bg-dark text-white border-neon" style="width: 400px">
        <q-card-section class="bg-dark-header">
          <div class="text-h6">Nuevo Usuario CEDEVA</div>
          <div class="text-caption text-grey-5">Crear credenciales de acceso</div>
        </q-card-section>

        <q-form @submit.prevent="crearUsuario">
          <q-card-section class="q-gutter-md">
            <q-input
              v-model="newUser.email"
              label="Correo Oficial"
              outlined
              dark
              color="primary"
              :rules="[(val) => !!val || 'Requerido']"
            />
            <q-input
              v-model="newUser.nombre"
              label="Nombre Completo"
              outlined
              dark
              color="primary"
              :rules="[(val) => !!val || 'Requerido']"
            />
            <q-select
              v-model="newUser.rol"
              :options="['admin', 'tecnico', 'operario']"
              label="Rol"
              outlined
              dark
              color="primary"
            />

            <q-separator dark />
            <div class="text-caption text-primary">Credenciales Iniciales</div>

            <q-input
              v-model="newUser.password"
              label="Contraseña Temporal"
              outlined
              dark
              color="primary"
              type="password"
              :rules="[(val) => val.length >= 6 || 'Mínimo 6 caracteres']"
            />
          </q-card-section>

          <q-card-actions align="right" class="bg-dark-soft">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn label="Crear Usuario" type="submit" color="primary" :loading="creating" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showEditDialog">
      <q-card class="bg-dark text-white border-neon" style="width: 400px">
        <q-card-section>
          <div class="text-h6">Editar Ficha</div>
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
            />
            <q-input
              v-model="editForm.direccion"
              label="Dirección"
              outlined
              dark
              color="primary"
              type="textarea"
              autogrow
            />
          </q-card-section>

          <q-card-actions align="right">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn label="Guardar" type="submit" color="primary" :loading="editLoading" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

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
            <div class="text-h6 q-mb-md">Redactar Nueva Alerta</div>
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
                    :options="['Urgente', 'Normal']"
                    label="Prioridad"
                    outlined
                    dark
                    color="primary"
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
              <q-input
                v-model="alertaForm.mensaje"
                type="textarea"
                label="Mensaje"
                outlined
                dark
                color="primary"
                autogrow
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
          </div>

          <div class="col-12 col-md-6 q-pa-md scroll bg-dark-soft">
            <div class="text-h6 q-mb-md">Historial de Alertas</div>
            <div v-if="dataStore.notifications.length === 0" class="text-grey-6">
              No hay alertas enviadas.
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
                  <q-badge :color="notif.estado === 'enviado' ? 'green' : 'orange'">{{
                    notif.estado
                  }}</q-badge>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useDataStore } from 'stores/data-store'
import { useAuthStore } from 'stores/auth-store'
import { useQuasar } from 'quasar'

const dataStore = useDataStore()
const authStore = useAuthStore()
const $q = useQuasar()

// --- ESTADOS ---
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const dialogoAlertas = ref(false)
const creating = ref(false)
const editLoading = ref(false)
const loadingAlert = ref(false)

const newUser = reactive({ email: '', nombre: '', rol: 'operario', password: '' })
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
  prioridad: 'Urgente',
})

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

// --- HELPERS ---
function getIniciales(text) {
  return text ? text.substring(0, 2).toUpperCase() : 'NN'
}
function getColor(rol) {
  if (rol === 'admin') return 'primary'
  if (rol === 'tecnico') return 'cyan-4'
  return 'blue-grey-4'
}
function getSubscribers(tipo) {
  return dataStore.miembrosEquipo.filter(
    (m) => m.config_notificaciones && m.config_notificaciones[tipo],
  )
}

// --- ACCIONES DE USUARIO ---

// 1. Crear Usuario (Super Admin)
async function crearUsuario() {
  creating.value = true
  const res = await authStore.adminCreateUser({
    email: newUser.email,
    password: newUser.password,
    nombre: newUser.nombre,
    rol: newUser.rol,
    establecimiento_id: dataStore.establecimientoActual?.id,
  })

  if (res.success) {
    $q.notify({ type: 'positive', message: 'Usuario creado exitosamente' })
    showCreateDialog.value = false
    newUser.email = ''
    newUser.password = ''
    newUser.nombre = ''
    dataStore.fetchMiembrosEquipo()
  } else {
    $q.notify({ type: 'negative', message: 'Error: ' + res.error })
  }
  creating.value = false
}

// 2. Editar Usuario
function abrirEditarPerfil(miembro) {
  editForm.usuario_id = miembro.usuario_id || miembro.id // Fallback por si id es distinto
  editForm.nombre_completo = miembro.nombre_completo
  editForm.email = miembro.email
  editForm.telefono = miembro.telefono || ''
  editForm.direccion = miembro.direccion || ''
  showEditDialog.value = true
}

async function guardarEdicionPerfil() {
  editLoading.value = true
  try {
    // Usamos el ID del perfil (que es el mismo que usuario_id en la tabla perfiles)
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

// 3. Cambiar Rol
async function cambiarRol(miembro, nuevoRol) {
  try {
    await dataStore.updateMiembroRol(miembro.id, nuevoRol) // ID de la membresía
    $q.notify({ type: 'positive', message: 'Rol actualizado' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error: ' + e.message })
  }
}

// 4. Eliminar Usuario
function eliminarMiembro(miembro) {
  $q.dialog({
    title: 'Eliminar Usuario',
    message: `¿Estás seguro de quitar a ${miembro.nombre_completo} del equipo?`,
    dark: true,
    cancel: true,
    class: 'border-neon',
  }).onOk(async () => {
    try {
      // CORREGIDO: Enviamos usuario_id para que el RPC elimine todo
      await dataStore.removeMiembro(miembro.usuario_id)
      $q.notify({ type: 'info', message: 'Miembro eliminado' })
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Error: ' + e.message })
    }
  })
}

// --- ARRASTRAR Y SOLTAR (NOTIFICACIONES) ---
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
      // Inicializar objeto si no existe
      if (!miembroReal.config_notificaciones) miembroReal.config_notificaciones = {}

      // Activar canal
      miembroReal.config_notificaciones[tipo] = true

      // Guardar en DB (Actualizar perfil)
      await dataStore.updatePerfilMiembro(miembroReal.usuario_id, {
        config_notificaciones: miembroReal.config_notificaciones,
      })

      $q.notify({
        type: 'positive',
        message: `Asignado a ${tipo.toUpperCase()}`,
        caption: `Usuario: ${miembroReal.nombre_completo}`,
      })
    }
  } catch (e) {
    console.error(e)
  }
}

async function unsubscribe(miembro, tipo) {
  if (miembro.config_notificaciones) {
    miembro.config_notificaciones[tipo] = false
    await dataStore.updatePerfilMiembro(miembro.usuario_id, {
      config_notificaciones: miembro.config_notificaciones,
    })
    $q.notify({ type: 'info', message: 'Desvinculado', timeout: 500 })
  }
}

// --- ALERTAS ---
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
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error: ' + e.message })
  } finally {
    loadingAlert.value = false
  }
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

.bg-dark-header {
  background-color: #111;
}
.font-display {
  font-family: 'Outfit', sans-serif;
  font-weight: 800;
}

/* Estilo Móvil Específico */
@media (max-width: 1023px) {
  .team-list-container {
    height: 300px;
    overflow-y: auto;
    margin-bottom: 20px;
    padding-right: 5px;
  }
  .hub-container {
    padding-bottom: 20px;
  }
}
</style>
