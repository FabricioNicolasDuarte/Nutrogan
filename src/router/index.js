import { route } from 'quasar/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'
import { useAuthStore } from 'stores/auth-store'
import { Notify } from 'quasar'

export default route(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()

    // 1. Verificar sesión activa
    if (!authStore.user) {
      await authStore.checkAuth()
    }

    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
    const requiresRole = to.meta.requiresRole

    // --- LÓGICA DE SEGURIDAD ---

    if (requiresAuth) {
      // A. Si no hay usuario -> Login
      if (!authStore.user) {
        next('/login')
        return
      }

      // B. SEGURIDAD EXTRA: Verificar que tenga perfil válido
      // Si está logueado pero no tiene perfil (ej: intruso), lo sacamos.
      if (!authStore.profile) {
        await authStore.fetchProfile() // Último intento de carga

        if (!authStore.profile) {
          console.warn('ALERTA: Usuario sin perfil detectado. Cerrando sesión...')
          await authStore.logout()

          Notify.create({
            type: 'negative',
            message: 'Acceso Denegado: Usuario no autorizado por el administrador.',
            icon: 'security',
            position: 'top',
          })

          next('/login')
          return
        }
      }

      // C. Verificación de Roles (Si la ruta lo requiere)
      if (requiresRole) {
        const userRole = authStore.currentRole
        if (!userRole || !requiresRole.includes(userRole)) {
          Notify.create({
            type: 'warning',
            message: 'No tiene permisos suficientes para esta sección.',
            position: 'top',
          })
          next('/') // Volver al Home si no tiene permiso
          return
        }
      }
    }

    // Si ya está logueado y quiere ir al login, lo mandamos al dashboard
    if (!requiresAuth && authStore.user && to.path === '/login') {
      next('/')
      return
    }

    next()
  })

  return Router
})
