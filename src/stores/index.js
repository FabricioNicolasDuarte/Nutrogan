import { store } from 'quasar/wrappers'
import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate' // Importamos el plugin

/*
 * Si no has ejecutado el comando aún, recuerda:
 * npm install pinia-plugin-persistedstate
 */

export default store((/* { ssrContext } */) => {
  const pinia = createPinia()

  // Instalamos el plugin en la instancia de Pinia
  pinia.use(
    createPersistedState({
      storage: localStorage, // Configuramos localStorage como el almacén por defecto
      auto: false, // Desactivamos 'auto' para controlar manualmente qué stores persistir
    }),
  )

  return pinia
})
