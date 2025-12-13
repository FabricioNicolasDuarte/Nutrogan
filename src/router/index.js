import { route } from 'quasar/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory,
} from 'vue-router'
import routes from './routes'
import { useAuthStore } from 'stores/auth-store'

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
    // Si no hay usuario en memoria, intentamos recuperarlo (ej. al recargar página)
    if (!authStore.user) {
      await authStore.checkAuth()
    }

    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
    const requiresRole = to.meta.requiresRole // Array de roles permitidos para esta ruta

    // --- LÓGICA DE AUTENTICACIÓN ---

    if (requiresAuth && !authStore.user) {
      // Si la ruta requiere auth y no hay usuario -> Login
      next('/login')
      return
    }

    if (!requiresAuth && authStore.user && to.path === '/login') {
      // Si ya está logueado y quiere ir al login -> Home
      next('/')
      return
    }

    // --- LÓGICA DE ROLES (NUEVO) ---

    if (requiresRole) {
      // Si la ruta tiene restricción de roles, nos aseguramos de tener el perfil cargado
      if (authStore.user && !authStore.currentRole) {
        await authStore.fetchProfile()
      }

      const userRole = authStore.currentRole

      // Si el usuario no tiene rol o su rol NO está en la lista permitida
      if (!userRole || !requiresRole.includes(userRole)) {
        // Acceso Denegado: Redirigir a una ruta segura
        // (Por ahora al Home, el Dashboard adaptará su contenido o mostrará lo que corresponda)
        next('/')
        return
      }
    }

    // Si pasa todas las verificaciones
    next()
  })

  return Router
})
