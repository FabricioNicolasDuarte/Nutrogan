import { store } from 'quasar/wrappers'
import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import localforage from 'localforage'

const offlineDataDb = localforage.createInstance({
  name: 'nutrogan',
  storeName: 'app_data',
  description: 'Cache offline Nutrogan (IndexedDB)',
})

const idbStorage = {
  getItem: (key) => offlineDataDb.getItem(key),
  setItem: (key, value) => offlineDataDb.setItem(key, value),
}

export default store((/* { ssrContext } */) => {
  const pinia = createPinia()

  pinia.use(
    createPersistedState({
      storage: idbStorage,
      auto: false,
    }),
  )

  return pinia
})
