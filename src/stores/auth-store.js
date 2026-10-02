import { defineStore } from 'pinia'
import { supabase } from 'boot/supabase'
import { ref, computed } from 'vue'
import { roleCapabilities } from '../utils/roleCapabilities'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(false)
  const currentRole = ref(null)
  const userEstablishments = ref([])

  // --- IDENTIFICADORES DE ROL ---
  const isAuthenticated = computed(() => !!user.value)

  const caps = computed(() => roleCapabilities(currentRole.value))

  // Roles exactos para la lógica interna
  const isOperario = computed(() => caps.value.isOperario)
  const isPeon = computed(() => caps.value.isPeon)
  const isTecnico = computed(() => caps.value.isTecnico)
  const isAdmin = computed(() => caps.value.isAdmin)
  const isSuperadmin = computed(() => caps.value.isSuperadmin)

  // --- CAPABILITIES (Permisos Semánticos) ---
  const canManageTeam = computed(() => caps.value.canManageTeam)
  const canAssignSuperadmin = computed(() => caps.value.canAssignSuperadmin)
  const canViewAudit = computed(() => caps.value.canViewAudit)
  const canViewDecisions = computed(() => caps.value.canViewDecisions)
  const canViewEstablishmentData = computed(() => caps.value.canViewEstablishmentData)
  const canViewFinancials = computed(() => caps.value.canViewFinancials)
  const canConfigureEstablishment = computed(() => caps.value.canConfigureEstablishment)
  const canViewReports = computed(() => caps.value.canViewReports)
  const canEditFieldStructure = computed(() => caps.value.canEditFieldStructure)
  const canEditMaps = computed(() => caps.value.canEditMaps)
  const canViewEventHistory = computed(() => caps.value.canViewEventHistory)
  const canAccessOperational = computed(() => caps.value.canAccessOperational)
  const canAccessFieldMode = computed(() => caps.value.canAccessFieldMode)

  // --- ACTIONS ---

  async function checkAuth() {
    const { data } = await supabase.auth.getSession()
    user.value = data.session?.user || null
    if (user.value) await fetchProfile()
    return user.value
  }

  async function fetchProfile() {
    const userId = user.value?.id
    if (!userId) {
      profile.value = null
      return
    }
    try {
      const { data, error } = await supabase
        .from('perfiles_usuarios')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      const { data: memb } = await supabase
        .from('miembros_establecimiento')
        .select('rol, establecimientos(id, nombre, ciudad)')
        .eq('usuario_id', userId)

      userEstablishments.value = memb.map((m) => ({
        id: m.establecimientos.id,
        nombre: m.establecimientos.nombre,
        ciudad: m.establecimientos.ciudad,
        rol: m.rol,
      }))

      if (data.establecimiento_activo_id) {
        const active = userEstablishments.value.find((e) => e.id === data.establecimiento_activo_id)
        if (active) {
          currentRole.value = active.rol
          data.establecimiento_id = data.establecimiento_activo_id
        } else if (userEstablishments.value.length > 0) {
          await switchEstablishment(userEstablishments.value[0].id)
          return
        }
      } else if (userEstablishments.value.length > 0) {
        await switchEstablishment(userEstablishments.value[0].id)
        return
      }
      profile.value = data
    } catch (e) {
      console.error(e)
      profile.value = null
    }
  }

  async function loginWithPassword(email, password) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      user.value = data.user
      await fetchProfile()
      supabase.rpc('registrar_acceso', { p_accion: 'login' }).then(() => {})
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  async function updatePassword(newPassword) {
    loading.value = true
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await supabase.rpc('registrar_acceso', { p_accion: 'logout' })
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error logout:', error)
    } finally {
      user.value = null
      profile.value = null
      currentRole.value = null
      userEstablishments.value = []
      // No localStorage.clear(): preserva cola IndexedDB y evita borrar cache offline.
      // Solo limpia tokens de sesión Supabase en localStorage.
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('sb-') || k.includes('supabase'))
          .forEach((k) => localStorage.removeItem(k))
      } catch {
        /* ignore */
      }
      window.location.replace('/login')
    }
  }

  async function switchEstablishment(newId) {
    if (!user.value) return
    await supabase
      .from('perfiles_usuarios')
      .update({ establecimiento_activo_id: newId })
      .eq('id', user.value.id)
    window.location.reload()
  }

  async function adminCreateUser(payload) {
    if (!canManageTeam.value) return { success: false, error: 'No autorizado' }
    loading.value = true
    try {
      const { error } = await supabase.rpc('crear_usuario_secreto', {
        p_email: payload.email,
        p_password: payload.password,
        p_nombre: payload.nombre,
        p_rol: payload.rol,
        p_est_id: payload.establecimiento_id,
      })
      if (error) throw error
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    user,
    profile,
    currentRole,
    loading,
    userEstablishments,

    // Identifiers
    isAuthenticated, // <--- AHORA SÍ ESTÁ INCLUIDO

    // Getters de Rol
    isOperario,
    isPeon,
    isTecnico,
    isAdmin,
    isSuperadmin,

    // Permisos (Capabilities)
    canManageTeam,
    canAssignSuperadmin,
    canViewAudit,
    canViewDecisions,
    canViewEstablishmentData,
    canViewFinancials,
    canConfigureEstablishment,
    canViewReports,
    canEditFieldStructure,
    canEditMaps,
    canViewEventHistory,
    canAccessOperational,
    canAccessFieldMode,

    // Actions
    loginWithPassword,
    updatePassword,
    logout,
    checkAuth,
    fetchProfile,
    switchEstablishment,
    adminCreateUser,
  }
})
