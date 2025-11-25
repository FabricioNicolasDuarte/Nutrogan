// src/boot/supabase.js
import { createClient } from '@supabase/supabase-js'
import { boot } from 'quasar/wrappers'

// ¡CORRECCIÓN!
// Leemos las variables con el prefijo VITE_
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_KEY

// Esta línea es la que daba el error
export const supabase = createClient(supabaseUrl, supabaseKey)

export default boot(({ app }) => {
  app.config.globalProperties.$supabase = supabase
})
