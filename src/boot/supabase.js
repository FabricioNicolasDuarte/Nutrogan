import { createClient } from '@supabase/supabase-js'
import { boot } from 'quasar/wrappers'

// CAMBIO AQUÍ: Usar import.meta.env en lugar de process.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

// Validación de seguridad (opcional pero recomendada para depurar)
if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR CRÍTICO: Faltan las variables de entorno de Supabase.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export default boot(({ app }) => {
  app.config.globalProperties.$supabase = supabase
})
