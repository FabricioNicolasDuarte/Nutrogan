import { defineStore } from 'pinia'
import { supabase } from 'boot/supabase'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(false)
  const currentRole = ref(null)
  const userEstablishments = ref([])

  // --- IDENTIFICADORES DE ROL ---
  const isAuthenticated = computed(() => !!user.value)

  // Roles exactos para la lógica interna
  const isOperario = computed(() => currentRole.value === 'operario')
  const isTecnico = computed(() => currentRole.value === 'tecnico')
  const isAdmin = computed(() => currentRole.value === 'admin')

  // --- CAPABILITIES (Permisos Semánticos) ---

  // 1. GESTIÓN ESTRATÉGICA (Solo Admin)
  const canManageTeam = computed(() => isAdmin.value)
  const canViewEstablishmentData = computed(() => isAdmin.value)
  const canViewFinancials = computed(() => isAdmin.value)
  const canConfigureEstablishment = computed(() => isAdmin.value)

  // 2. GESTIÓN TÉCNICA (Admin + Técnico)
  const canViewReports = computed(() => isAdmin.value || isTecnico.value)
  const canEditFieldStructure = computed(() => isAdmin.value || isTecnico.value)
  const canEditMaps = computed(() => isAdmin.value || isTecnico.value)
  const canViewEventHistory = computed(() => isAdmin.value || isTecnico.value)

  // 3. OPERATIVA (Todos)
  const canAccessOperational = computed(() => true)
  const canAccessFieldMode = computed(() => true)

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
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error logout:', error)
    } finally {
      user.value = null
      profile.value = null
      currentRole.value = null
      userEstablishments.value = []
      localStorage.clear()
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
    isTecnico,
    isAdmin,

    // Permisos (Capabilities)
    canManageTeam,
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
