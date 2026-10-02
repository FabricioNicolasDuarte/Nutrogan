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

function rutaDeCarga(path) {
  return path === '/field' || path === '/profile' || path === '/support' || path.includes('/scan_cc')
}

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

    // 1. Lógica de Sesión: Solo verificar si NO tenemos usuario en memoria
    if (!authStore.user) {
      await authStore.checkAuth()
    }

    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
    const requiresRole = to.meta.requiresRole

    // --- SEGURIDAD ---

    if (requiresAuth) {
      // A. Si no hay usuario -> Login
      if (!authStore.isAuthenticated) {
        next('/login')
        return
      }

      // B. Si hay usuario pero no perfil (caso raro de error de carga)
      if (!authStore.profile) {
        await authStore.fetchProfile()
        if (!authStore.profile) {
          next('/login')
          return
        }
      }

      // C. Verificación de Roles
      if (requiresRole) {
        const userRole = authStore.currentRole
        if (!userRole || !requiresRole.includes(userRole)) {
          Notify.create({
            type: 'warning',
            message: 'No tienes permisos para acceder a esta sección.',
            position: 'top',
          })
          next(authStore.isPeon ? '/field' : '/')
          return
        }
      }

      if (authStore.isPeon && !rutaDeCarga(to.path)) {
        next('/field')
        return
      }
    }

    // Evitar ir al login si ya está logueado
    if (to.path === '/login' && authStore.isAuthenticated) {
      next(authStore.isPeon ? '/field' : '/')
      return
    }

    next()
  })

  return Router
})
