import { defineStore } from 'pinia'
import { supabase } from 'boot/supabase'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // --- ESTADO ---
  const user = ref(null)
  const profile = ref(null)

  // NUEVO: Estado para roles y multi-establecimiento
  const currentRole = ref(null) // 'admin', 'tecnico', 'operario'
  const userEstablishments = ref([]) // Lista de campos donde soy miembro

  // --- COMPUTED (Getters) ---
  const isAuthenticated = computed(() => !!user.value)

  // Helpers de Roles
  const isAdmin = computed(() => currentRole.value === 'admin')
  // Técnico o Admin tienen permisos elevados
  const isTecnico = computed(() => ['admin', 'tecnico'].includes(currentRole.value))

  /**
   * Obtiene el perfil del usuario actual y sus permisos.
   * Se llama automáticamente al iniciar sesión o recargar.
   */
  async function fetchProfile() {
    const userId = user.value?.id

    if (!userId) {
      profile.value = null
      currentRole.value = null
      userEstablishments.value = []
      return
    }

    try {
      // 1. Cargar Perfil Base (Datos personales + establecimiento activo)
      const { data: profileData, error: profileError } = await supabase
        .from('perfiles_usuarios')
        // Seleccionamos todo para tener establecimiento_activo_id y avatar_url
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError

      // 2. Cargar lista de establecimientos donde es miembro
      const { data: membresias, error: membError } = await supabase
        .from('miembros_establecimiento')
        .select('rol, establecimientos(id, nombre, ciudad)')
        .eq('usuario_id', userId)

      if (membError) throw membError

      // Formateamos la lista para usarla fácil en la UI
      userEstablishments.value = membresias.map((m) => ({
        id: m.establecimientos.id,
        nombre: m.establecimientos.nombre,
        ciudad: m.establecimientos.ciudad,
        rol: m.rol,
      }))

      // 3. Determinar el ROL ACTUAL y configurar el perfil
      if (profileData.establecimiento_activo_id) {
        const activeMem = userEstablishments.value.find(
          (e) => e.id === profileData.establecimiento_activo_id,
        )
        // Asignamos el rol correspondiente a este establecimiento
        currentRole.value = activeMem ? activeMem.rol : null

        // --- COMPATIBILIDAD CRÍTICA ---
        // Inyectamos 'establecimiento_id' en el objeto profile para que
        // data-store.js y otros componentes sigan funcionando sin cambios.
        profileData.establecimiento_id = profileData.establecimiento_activo_id
      } else {
        // Si no tiene campo activo seleccionado, intentamos asignar el primero
        if (userEstablishments.value.length > 0) {
          await switchEstablishment(userEstablishments.value[0].id)
          return // switchEstablishment recargará, así que paramos aquí
        }
      }

      profile.value = profileData
    } catch (error) {
      console.error('Error fetching profile/roles:', error)
      profile.value = null
    }
  }

  /**
   * Cambiar de establecimiento activo
   */
  async function switchEstablishment(newEstId) {
    if (!user.value) return

    try {
      // 1. Actualizar en BD cual es el activo
      const { error } = await supabase
        .from('perfiles_usuarios')
        .update({ establecimiento_activo_id: newEstId })
        .eq('id', user.value.id)

      if (error) throw error

      // 2. Recargar la página para limpiar los stores de datos (lotes, lluvias, etc.)
      // Esto es lo más seguro para evitar mezclar datos de dos campos diferentes.
      window.location.reload()
    } catch (e) {
      console.error('Error cambiando establecimiento:', e)
    }
  }

  /**
   * Crea un nuevo establecimiento y asigna al usuario como Admin.
   */
  async function crearEstablecimiento(nombre) {
    if (!user.value) return

    try {
      // 1. Insertar el establecimiento
      const { data: estData, error: estError } = await supabase
        .from('establecimientos')
        .insert({
          nombre: nombre,
          emergencia_config: { tipo: 'custom', valor: '911', nombre: 'Emergencias' },
        })
        .select()
        .single()

      if (estError) throw estError

      // 2. Crear la membresía de ADMIN para el creador
      const { error: membError } = await supabase.from('miembros_establecimiento').insert({
        usuario_id: user.value.id,
        establecimiento_id: estData.id,
        rol: 'admin',
      })

      if (membError) throw membError

      // 3. Cambiar al nuevo campo automáticamente
      await switchEstablishment(estData.id)

      return true
    } catch (e) {
      console.error('Error creando establecimiento:', e)
      throw e
    }
  }

  /**
   * Actualiza los datos del perfil (Nombre, Teléfono, Avatar, etc.)
   */
  async function updateProfile(profileData) {
    const userId = user.value?.id
    if (!userId) throw new Error('Usuario no autenticado')

    const { data, error } = await supabase
      .from('perfiles_usuarios')
      .update(profileData)
      .eq('id', userId)
      .select()

    if (error) {
      console.error('Error updating profile:', error)
      throw error
    }

    if (data && data.length > 0) {
      // Mantenemos la compatibilidad del ID al actualizar
      const updated = data[0]
      updated.establecimiento_id = updated.establecimiento_activo_id
      profile.value = { ...profile.value, ...updated }
    }
  }

  // --- AUTH ACTIONS ---

  async function login(credentials) {
    const { data, error } = await supabase.auth.signInWithPassword(credentials)
    if (error) throw error
    user.value = data.user
    await fetchProfile()
    return data
  }

  async function signUp(credentials) {
    const { data, error } = await supabase.auth.signUp(credentials)
    if (error) throw error
    user.value = data.user
    // Esperar un poco para asegurar que el trigger de DB cree el perfil
    await new Promise((resolve) => setTimeout(resolve, 1000))
    await fetchProfile()
    return data
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    user.value = null
    profile.value = null
    currentRole.value = null
    userEstablishments.value = []
  }

  async function checkAuth() {
    const { data } = await supabase.auth.getSession()
    user.value = data.session?.user || null
    if (user.value) {
      await fetchProfile()
    }
    return user.value
  }

  function handleAuthStateChange() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      user.value = session?.user || null
      if (user.value) {
        await fetchProfile()
      } else {
        profile.value = null
        currentRole.value = null
        userEstablishments.value = []
      }
    })
  }

  return {
    user,
    profile,
    currentRole, // Exportado
    userEstablishments, // Exportado
    isAuthenticated,
    isAdmin, // Exportado
    isTecnico, // Exportado
    login,
    signUp,
    logout,
    checkAuth,
    handleAuthStateChange,
    fetchProfile,
    updateProfile,
    switchEstablishment, // Exportado
    crearEstablecimiento, // Exportado
  }
})
