<template>
  <div class="column q-gutter-y-md">
    <div class="glass-header q-pa-md row justify-between items-center rounded-borders">
      <div>
        <div class="text-subtitle1 text-weight-bold">Centro de Comando</div>
        <div class="text-caption text-grey-5">Gestión de equipo y comunicaciones</div>
      </div>
      <div class="row q-gutter-x-sm">
        <q-btn
          unelevated
          color="primary"
          text-color="black"
          icon="campaign"
          label="Redactar Alerta"
          class="text-weight-bold"
          @click="abrirAlertas"
        />
        <q-btn flat round icon="person_add" color="white" @click="showCreateDialog = true">
          <q-tooltip>Nuevo Usuario</q-tooltip>
        </q-btn>
      </div>
    </div>

    <div v-if="dataStore.miembrosEquipo.length === 0" class="text-center q-pa-xl text-grey-6">
      <q-spinner-dots size="2em" />
      <div class="q-mt-sm">Sincronizando equipo...</div>
    </div>

    <div v-else class="column q-gutter-y-sm">
      <div
        v-for="miembro in dataStore.miembrosEquipo"
        :key="miembro.id"
        class="member-row bg-dark-glass q-pa-md rounded-borders transition-hover"
      >
        <div class="row items-center justify-between">
          <div class="row items-center cursor-pointer" @click="abrirEditar(miembro)">
            <q-avatar
              size="40px"
              :color="getRoleColor(miembro.rol)"
              text-color="black"
              class="q-mr-md shadow-2 text-weight-bold"
            >
              {{ miembro.nombre_completo?.substring(0, 2).toUpperCase() }}
            </q-avatar>
            <div>
              <div class="text-subtitle2 leading-tight">{{ miembro.nombre_completo }}</div>
              <div class="row items-center q-gutter-x-xs">
                <q-badge
                  :color="getRoleBadgeColor(miembro.rol)"
                  class="text-uppercase text-caption"
                >
                  {{ miembro.rol }}
                </q-badge>
                <span class="text-caption text-grey-6">• {{ miembro.email }}</span>
              </div>
            </div>
          </div>

          <q-btn flat round dense icon="more_vert" color="grey-5">
            <q-menu class="bg-grey-10 text-white border-neon">
              <q-list dense style="min-width: 150px">
                <q-item-label header class="text-grey-5 text-uppercase">Acciones</q-item-label>
                <q-item clickable v-close-popup @click="abrirEditar(miembro)">
                  <q-item-section avatar><q-icon name="edit" size="xs" /></q-item-section>
                  <q-item-section>Editar Datos</q-item-section>
                </q-item>
                <q-separator dark />
                <q-item-label header class="text-grey-5 text-uppercase">Permisos</q-item-label>
                <q-item clickable v-close-popup @click="cambiarRol(miembro, 'admin')"
                  ><q-item-section>Admin</q-item-section></q-item
                >
                <q-item clickable v-close-popup @click="cambiarRol(miembro, 'tecnico')"
                  ><q-item-section>Técnico</q-item-section></q-item
                >
                <q-item clickable v-close-popup @click="cambiarRol(miembro, 'operario')"
                  ><q-item-section>Operario</q-item-section></q-item
                >
                <q-separator dark />
                <q-item clickable v-close-popup class="text-red-4" @click="eliminar(miembro)">
                  <q-item-section avatar><q-icon name="person_remove" size="xs" /></q-item-section>
                  <q-item-section>Eliminar Acceso</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>

        <div class="row items-center q-mt-sm q-pt-sm border-top-dim">
          <div class="text-caption text-grey-6 q-mr-md font-mono">SUSCRIPCIONES:</div>
          <div class="row q-gutter-x-sm">
            <q-toggle
              v-for="cat in categorias"
              :key="cat.id"
              :model-value="
                !!(miembro.config_notificaciones && miembro.config_notificaciones[cat.id])
              "
              @update:model-value="toggleSub(miembro, cat.id)"
              dense
              :label="cat.label"
              :color="cat.color"
              size="xs"
              class="text-caption"
            />
          </div>
        </div>
      </div>
    </div>

    <q-dialog
      v-model="dialogAlertas"
      maximized
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card class="bg-black text-white column">
        <q-toolbar class="bg-dark-header q-py-md border-bottom">
          <q-btn flat round icon="close" v-close-popup color="grey-5" />
          <q-toolbar-title class="text-center font-outfit"> COMUNICACIÓN OFICIAL </q-toolbar-title>
          <q-btn
            unelevated
            rounded
            color="primary"
            text-color="black"
            label="ENVIAR"
            icon="send"
            :loading="loadingAlert"
            @click="enviarAlerta"
          />
        </q-toolbar>

        <div class="col row">
          <div class="col-12 col-md-6 q-pa-lg scroll border-right-dim">
            <div class="text-h6 q-mb-lg flex items-center">
              <q-icon name="edit_note" class="q-mr-sm text-primary" /> Redactar Mensaje
            </div>

            <q-form class="q-gutter-y-lg">
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-6">
                  <q-select
                    v-model="alertaForm.prioridad"
                    :options="prioridades"
                    label="Estética / Prioridad"
                    filled
                    dark
                    option-label="label"
                    emit-value
                    map-options
                  >
                    <template v-slot:option="scope">
                      <q-item v-bind="scope.itemProps">
                        <q-item-section avatar>
                          <q-icon name="circle" :color="scope.opt.color" size="xs" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label>{{ scope.opt.label }}</q-item-label>
                        </q-item-section>
                      </q-item>
                    </template>
                  </q-select>
                </div>
                <div class="col-12 col-sm-6">
                  <q-select
                    v-model="alertaForm.categoria"
                    :options="categorias"
                    label="Canal de Distribución"
                    filled
                    dark
                    option-value="id"
                    option-label="label"
                    emit-value
                    map-options
                  />
                </div>
              </div>

              <q-input
                v-model="alertaForm.titulo"
                label="Asunto del Mensaje"
                filled
                dark
                class="text-h6"
                placeholder="Ej: Informe de Lluvias Semanal"
              />

              <q-input
                v-model="alertaForm.mensaje"
                label="Cuerpo del Mensaje"
                filled
                dark
                type="textarea"
                rows="10"
                class="input-area"
                placeholder="Escriba aquí el comunicado oficial..."
              />
            </q-form>
          </div>

          <div class="col-12 col-md-6 q-pa-lg scroll bg-dark-soft">
            <div class="text-subtitle2 text-grey-5 q-mb-md text-uppercase">
              VISTA PREVIA (SIMULACIÓN EMAIL)
            </div>

            <div
              class="email-preview bg-white text-black rounded-borders overflow-hidden shadow-5"
              style="max-width: 500px; margin: 0 auto"
            >
              <div
                class="q-pa-md text-center"
                style="background: #f5f5f5; border-bottom: 1px solid #ddd"
              >
                <img src="src/assets/nutrogan-logo.svg" style="height: 30px" alt="Nutrogan" />
              </div>

              <div
                :class="`bg-${getColorCode(alertaForm.prioridad)}`"
                style="height: 6px; width: 100%"
              ></div>

              <div class="q-pa-lg">
                <div class="text-h5 text-weight-bold q-mb-md">
                  {{ alertaForm.titulo || '(Sin Asunto)' }}
                </div>

                <div class="text-body1" style="white-space: pre-wrap; line-height: 1.6">
                  {{ alertaForm.mensaje || '...' }}
                </div>

                <div class="q-mt-xl q-pt-md border-top text-center text-caption text-grey-6">
                  <div class="text-weight-bold">Sistema de Gestión Ganadera Nutrogan</div>
                  <div>Comunicado Oficial • {{ new Date().toLocaleDateString() }}</div>
                </div>
              </div>
            </div>

            <div class="q-mt-xl">
              <div class="text-h6 text-white q-mb-md">Historial Reciente</div>
              <q-list separator dark>
                <q-item v-for="notif in dataStore.notifications" :key="notif.id">
                  <q-item-section>
                    <q-item-label>{{ notif.titulo }}</q-item-label>
                    <q-item-label caption>{{ notif.mensaje?.substring(0, 50) }}...</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-badge :color="notif.estado === 'enviado' ? 'green' : 'orange'">
                      {{ notif.estado }}
                    </q-badge>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>
          </div>
        </div>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showCreateDialog">
      <q-card class="bg-grey-10 text-white border-neon" style="width: 400px">
        <q-card-section class="bg-header-gradient"
          ><div class="text-h6">Nuevo Miembro</div></q-card-section
        >
        <q-form @submit.prevent="crearUsuario">
          <q-card-section class="q-gutter-y-md">
            <q-input
              v-model="newUser.email"
              label="Email Corporativo"
              filled
              dark
              color="primary"
              :rules="[(val) => !!val || 'Requerido']"
            />
            <q-input
              v-model="newUser.nombre"
              label="Nombre Completo"
              filled
              dark
              color="primary"
              :rules="[(val) => !!val || 'Requerido']"
            />
            <q-select
              v-model="newUser.rol"
              :options="['admin', 'tecnico', 'operario']"
              label="Rol Asignado"
              filled
              dark
              color="primary"
            />
            <q-input
              v-model="newUser.password"
              label="Contraseña Provisoria"
              filled
              dark
              color="primary"
              type="password"
            />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancelar" v-close-popup color="grey" />
            <q-btn
              label="Crear Acceso"
              type="submit"
              color="primary"
              text-color="black"
              :loading="loading"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showEditDialog">
      <q-card class="bg-grey-10 text-white border-neon" style="width: 400px">
        <q-card-section><div class="text-h6">Editar Ficha</div></q-card-section>
        <q-form @submit.prevent="guardarEdit">
          <q-card-section class="q-gutter-y-md">
            <q-input v-model="editForm.nombre_completo" label="Nombre" filled dark />
            <q-input v-model="editForm.telefono" label="Teléfono" filled dark />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat label="Cancelar" v-close-popup color="grey" />
            <q-btn label="Guardar" type="submit" color="primary" text-color="black" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useDataStore } from 'stores/data-store'
import { useAuthStore } from 'stores/auth-store'
import { useQuasar } from 'quasar'
import { supabase } from 'boot/supabase' // <--- IMPORTANTE: Importación necesaria para Edge Functions

const dataStore = useDataStore()
const authStore = useAuthStore()
const $q = useQuasar()

// --- ESTADO Y FORMULARIOS ---
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const dialogAlertas = ref(false)
const loading = ref(false)
const loadingAlert = ref(false)

const newUser = reactive({ email: '', nombre: '', rol: 'operario', password: '' })
const editForm = reactive({ usuario_id: null, nombre_completo: '', telefono: '' })

// Alerta "Pro" con soporte para Resend
const alertaForm = reactive({
  titulo: '',
  mensaje: '',
  categoria: 'general',
  prioridad: 'normal', // 'urgente', 'info', 'success'
})

// --- CONFIGURACIÓN ---
const categorias = [
  { id: 'lluvia', label: 'Clima / Lluvias', color: 'cyan' },
  { id: 'sanidad', label: 'Sanidad Animal', color: 'red' },
  { id: 'stock', label: 'Movimiento Stock', color: 'green' },
  { id: 'general', label: 'General / RRHH', color: 'grey' },
]

const prioridades = [
  { label: 'Normal (Informativo)', value: 'normal', color: 'blue' },
  { label: 'Urgente (Alerta Roja)', value: 'urgente', color: 'red' },
  { label: 'Éxito (Verde)', value: 'success', color: 'green' },
]

// --- HELPERS ---
function getRoleColor(r) {
  return r === 'admin' ? 'primary' : 'grey-4'
}
function getRoleBadgeColor(r) {
  return r === 'admin' ? 'green-9' : r === 'tecnico' ? 'cyan-9' : 'grey-8'
}
function getColorCode(prio) {
  if (prio === 'urgente') return 'red-8'
  if (prio === 'success') return 'green-6'
  return 'blue-6'
}

// --- LOGICA SUSCRIPCIONES (TOGGLES) ---
async function toggleSub(m, cat) {
  if (!m.config_notificaciones) m.config_notificaciones = {}
  // Optimistic update
  const oldVal = m.config_notificaciones[cat]
  m.config_notificaciones[cat] = !oldVal

  try {
    await dataStore.updatePerfilMiembro(m.usuario_id, {
      config_notificaciones: m.config_notificaciones,
    })
    $q.notify({
      type: 'positive',
      message: 'Suscripción actualizada',
      timeout: 500,
      position: 'bottom-right',
    })
  } catch (e) {
    m.config_notificaciones[cat] = oldVal // Revert
    console.error(e)
  }
}

// --- LOGICA ALERTAS Y RESEND ---
function abrirAlertas() {
  dataStore.fetchNotifications()
  dialogAlertas.value = true
}

async function enviarAlerta() {
  if (!alertaForm.titulo || !alertaForm.mensaje) {
    $q.notify({ type: 'warning', message: 'Complete asunto y mensaje' })
    return
  }

  loadingAlert.value = true
  try {
    // 1. Obtener destinatarios según categoría
    const destinatarios = dataStore.miembrosEquipo
      .filter((m) => m.config_notificaciones && m.config_notificaciones[alertaForm.categoria])
      .map((m) => ({ email: m.email, nombre: m.nombre_completo }))

    if (destinatarios.length === 0) {
      throw new Error('No hay usuarios suscritos a esta categoría')
    }

    // 2. Construir Payload para la Base de Datos y Function
    const emailPayload = {
      titulo: alertaForm.titulo,
      mensaje: alertaForm.mensaje,
      categoria: alertaForm.categoria,
      prioridad: alertaForm.prioridad,
      destinatarios: destinatarios,
      metadata: {
        // IMPORTANTE: URL pública de tu logo. Ajustar según tu bucket de Supabase
        logo_url:
          'https://cglogstrtjvbpsoaghib.supabase.co/storage/v1/object/public/assets/nutrogan-logo.png',
        footer_text: 'Enviado desde el Panel de Control Nutrogan',
      },
    }

    // 3. Llamada a Edge Function para envío REAL de email
    const { error: functionError } = await supabase.functions.invoke('send-alert', {
      body: emailPayload,
    })

    if (functionError) throw functionError

    // 4. Guardar en Base de Datos (Historial)
    await dataStore.createNotification({
      titulo: alertaForm.titulo,
      mensaje: alertaForm.mensaje,
      categoria: alertaForm.categoria,
      prioridad: alertaForm.prioridad,
      estado: 'enviado',
      destinatarios_snapshot: JSON.stringify(destinatarios),
    })

    $q.notify({
      type: 'positive',
      message: 'Comunicado enviado con éxito',
      caption: `Notificados: ${destinatarios.length} miembros`,
      icon: 'mark_email_read',
    })

    // Limpiar form
    alertaForm.titulo = ''
    alertaForm.mensaje = ''
    dialogAlertas.value = false

    dataStore.fetchNotifications()
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Error al enviar: ' + e.message })
  } finally {
    loadingAlert.value = false
  }
}

// --- CRUD USUARIOS (Lógica standard) ---
async function crearUsuario() {
  loading.value = true
  const res = await authStore.adminCreateUser({
    ...newUser,
    establecimiento_id: dataStore.establecimientoActual?.id,
  })
  if (res.success) {
    $q.notify({ type: 'positive', message: 'Usuario creado' })
    showCreateDialog.value = false
    dataStore.fetchMiembrosEquipo()
    // Reset form
    newUser.email = ''
    newUser.nombre = ''
    newUser.password = ''
  } else {
    $q.notify({ type: 'negative', message: res.error })
  }
  loading.value = false
}

function abrirEditar(m) {
  editForm.usuario_id = m.usuario_id
  editForm.nombre_completo = m.nombre_completo
  editForm.telefono = m.telefono
  showEditDialog.value = true
}

async function guardarEdit() {
  await dataStore.updatePerfilMiembro(editForm.usuario_id, {
    nombre_completo: editForm.nombre_completo,
    telefono: editForm.telefono,
  })
  showEditDialog.value = false
  $q.notify({ type: 'positive', message: 'Datos guardados' })
}

async function cambiarRol(m, rol) {
  await dataStore.updateMiembroRol(m.id, rol)
  $q.notify({ type: 'positive', message: 'Permisos actualizados a ' + rol.toUpperCase() })
}

function eliminar(m) {
  $q.dialog({
    title: 'Revocar Acceso',
    message: `¿Eliminar a ${m.nombre_completo}?`,
    cancel: true,
    dark: true,
    ok: { label: 'Eliminar', color: 'red' },
  }).onOk(async () => {
    await dataStore.removeMiembro(m.usuario_id)
  })
}

onMounted(() => dataStore.fetchMiembrosEquipo())
</script>

<style scoped lang="scss">
.glass-header {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.bg-dark-glass {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.transition-hover {
  transition: all 0.2s;
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }
}
.border-top-dim {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.border-right-dim {
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}
.border-bottom {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.border-neon {
  border: 1px solid #39ff14;
}
.bg-header-gradient {
  background: linear-gradient(90deg, #111 0%, #222 100%);
}
.bg-dark-soft {
  background: #1a1a1a;
}
.font-outfit {
  font-family: 'Outfit', sans-serif;
}
</style>
