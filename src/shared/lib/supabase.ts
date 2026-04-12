import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY en .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'sgp', // Schema propio para aislar del resto del proyecto Supabase
  },
  realtime: {
    worker: true, // Evita desconexión silenciosa al backgroundear el tab (KDS)
  },
})
