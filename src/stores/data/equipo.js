import { ref } from 'vue'

export function createEquipoModule({ supabase, authStore }) {
  const miembrosEquipo = ref([])

  async function fetchMiembrosEquipo() {
    const estId = authStore.profile?.establecimiento_id
    if (!estId) return

    // CORRECCIÓN: Agregamos 'config_notificaciones' al select
    const { data, error } = await supabase
      .from('miembros_establecimiento')
      .select(
        `id, rol, usuario_id, perfiles_usuarios:usuario_id (nombre_completo, email, telefono, direccion, avatar_url, config_notificaciones)`,
      )
      .eq('establecimiento_id', estId)

    if (error) {
      console.error('Error fetching miembros:', error)
      return
    }

    miembrosEquipo.value = data.map((m) => ({
      id: m.id,
      rol: m.rol,
      usuario_id: m.usuario_id,
      nombre_completo: m.perfiles_usuarios?.nombre_completo || 'Usuario sin nombre',
      email: m.perfiles_usuarios?.email || 'Sin email',
      telefono: m.perfiles_usuarios?.telefono,
      direccion: m.perfiles_usuarios?.direccion,
      avatar_url: m.perfiles_usuarios?.avatar_url,
      // CORRECCIÓN: Mapeamos la configuración o un objeto vacío por defecto
      config_notificaciones: m.perfiles_usuarios?.config_notificaciones || {},
    }))
  }

  async function invitarMiembro(email, rol) {
    const estId = authStore.profile?.establecimiento_id
    if (!estId) throw new Error('No hay establecimiento activo para invitar')

    // Preferir edge invite-user (usuario Auth ya existente → miembros)
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { email, rol: rol || 'operario', establecimiento_id: estId },
    })
    if (error) throw error
    if (data && data.success === false) throw new Error(data.error || 'No se pudo invitar')

    await fetchMiembrosEquipo()
    return { success: true, message: data?.message || 'Usuario agregado al equipo' }
  }

  async function updateMiembroRol(membresiaId, nuevoRol) {
    const { error } = await supabase
      .from('miembros_establecimiento')
      .update({ rol: nuevoRol })
      .eq('id', membresiaId)
    if (error) throw error
    await fetchMiembrosEquipo()
  }

  async function removeMiembro(usuarioId) {
    const { error } = await supabase.rpc('eliminar_usuario_total', {
      p_usuario_id: usuarioId,
    })
    if (error) {
      console.error('Error eliminando usuario:', error)
      throw error
    }
    await fetchMiembrosEquipo()
  }

  async function updatePerfilMiembro(usuarioId, datos) {
    const { error } = await supabase.from('perfiles_usuarios').update(datos).eq('id', usuarioId)
    if (error) throw error
    await fetchMiembrosEquipo()
  }

  return {
    miembrosEquipo,
    fetchMiembrosEquipo,
    invitarMiembro,
    updateMiembroRol,
    removeMiembro,
    updatePerfilMiembro,
  }
}
