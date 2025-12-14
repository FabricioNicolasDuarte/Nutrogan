import { defineStore } from 'pinia'
import { supabase } from 'boot/supabase'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(false)
  const currentRole = ref(null)
  const userEstablishments = ref([])

  const isAuthenticated = computed(() => !!user.value)

  // --- NIVELES DE ROL ---
  const isAdmin = computed(() => currentRole.value === 'admin')
  const isTecnico = computed(() => ['admin', 'tecnico'].includes(currentRole.value))
  const isOperario = computed(() => currentRole.value === 'operario')

  // --- PERMISOS SEMÁNTICOS (Lógica de Negocio) ---

  // 1. Finanzas: ¿Quién ve dinero? (Solo Dueños y Técnicos de confianza)
  const canViewFinancials = computed(() => ['admin', 'tecnico'].includes(currentRole.value))

  // 2. Edición de Recursos: ¿Quién puede crear/borrar lotes y potreros?
  // El operario solo ve y reporta, no reestructura el campo.
  const canEditResources = computed(() => ['admin', 'tecnico'].includes(currentRole.value))

  // 3. Gestión de Equipo: ¿Quién puede contratar/despedir? (Solo Dueño)
  const canManageTeam = computed(() => currentRole.value === 'admin')

  // 4. Reportes Avanzados: ¿Quién ve analítica profunda?
  const canViewReports = computed(() => ['admin', 'tecnico'].includes(currentRole.value))

  // --- ACTIONS ---

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
      console.error('Error login:', error.message)
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
      console.error('Error al cerrar sesión Supabase:', error)
    } finally {
      user.value = null
      profile.value = null
      currentRole.value = null
      userEstablishments.value = []

      // Limpieza agresiva para evitar rebotes del router
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key)
        }
      })
      window.location.replace('/login')
    }
  }

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
        currentRole.value = active ? active.rol : 'operario'
        data.establecimiento_id = data.establecimiento_activo_id
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

  async function switchEstablishment(newId) {
    if (!user.value) return
    await supabase
      .from('perfiles_usuarios')
      .update({ establecimiento_activo_id: newId })
      .eq('id', user.value.id)
    window.location.reload()
  }

  // Crea usuario usando la función SQL segura que definimos
  async function adminCreateUser(payload) {
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
      console.error('Error creando usuario:', e)
      return { success: false, error: e.message }
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    profile,
    currentRole,
    loading,
    isAuthenticated,
    isAdmin,
    isTecnico,
    isOperario,
    // Permisos exportados
    canViewFinancials,
    canEditResources,
    canManageTeam,
    canViewReports,
    userEstablishments,
    loginWithPassword,
    updatePassword,
    logout,
    checkAuth,
    fetchProfile,
    switchEstablishment,
    adminCreateUser,
  }
})
