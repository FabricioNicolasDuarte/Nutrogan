import { ref } from 'vue'

export function createNotificacionesModule({ supabase, authStore }) {
  const notifications = ref([])

  async function fetchNotifications() {
    const estId = authStore.profile?.establecimiento_id
    if (!estId) return
    const { data, error } = await supabase
      .from('notificaciones_programadas')
      .select('*')
      .eq('establecimiento_id', estId)
      .order('created_at', { ascending: false })
    if (!error) notifications.value = data
  }

  async function createNotification(notifData) {
    notifData.establecimiento_id = authStore.profile.establecimiento_id
    const alreadySent = notifData.estado === 'enviado'
    if (notifData.prioridad && notifData.prioridad.toLowerCase() === 'urgente') {
      notifData.fecha_programada = new Date().toISOString()
      notifData.estado = 'enviado'
    } else if (!notifData.estado) {
      notifData.estado = 'pendiente'
    }
    const { data, error } = await supabase
      .from('notificaciones_programadas')
      .insert(notifData)
      .select()
    if (error) throw error
    notifications.value.unshift(data[0])
    // Solo auto-disparar mail si el caller no envió ya (p.ej. Panel / TeamManager)
    if (
      !alreadySent &&
      notifData.prioridad &&
      notifData.prioridad.toLowerCase() === 'urgente'
    ) {
      await sendEmailTrigger(data[0])
    }
  }

  async function deleteNotification(id) {
    const { error } = await supabase.from('notificaciones_programadas').delete().eq('id', id)
    if (error) throw error
    notifications.value = notifications.value.filter((n) => n.id !== id)
  }

  async function sendEmailTrigger(notification) {
    try {
      let recipients = notification.destinatarios_snapshot
      if (typeof recipients === 'string') recipients = JSON.parse(recipients)
      if (!recipients || recipients.length === 0) return
      const payload = {
        titulo: notification.titulo || 'Alerta Nutrogan',
        mensaje: notification.mensaje,
        categoria: notification.categoria || 'general',
        prioridad: (notification.prioridad || 'normal').toLowerCase(),
        destinatarios: recipients.map((r) => ({
          nombre: r.nombre,
          email: r.email,
        })),
        metadata: {
          logo_url:
            'https://cglogstrtjvbpsoaghib.supabase.co/storage/v1/object/public/assets/nutrogan-logo.png',
          app_url: 'https://www.nutrogan.site',
        },
      }
      const { error } = await supabase.functions.invoke('send-alert', { body: payload })
      if (error) throw error
    } catch (e) {
      console.error('Error enviando email:', e)
      await supabase
        .from('notificaciones_programadas')
        .update({ estado: 'fallido' })
        .eq('id', notification.id)
      const index = notifications.value.findIndex((n) => n.id === notification.id)
      if (index !== -1) notifications.value[index].estado = 'fallido'
    }
  }

  return {
    notifications,
    fetchNotifications,
    createNotification,
    deleteNotification,
    sendEmailTrigger,
  }
}
