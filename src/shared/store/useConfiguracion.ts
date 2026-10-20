import { create } from 'zustand'
import { supabase } from '@/shared/lib/supabase'
import { CONFIGURACION_POR_DEFECTO, ORDEN_PAGOS, type Configuracion } from '@/shared/lib/config'

// Configuración del local, compartida por toda la app (una sola lectura al entrar).
// Si la base falla se usan los valores por defecto y se expone el error: la Caja
// tiene que seguir vendiendo aunque no se pueda leer la configuración.

const COLUMNAS = 'nombre_local, direccion, telefono, modo_impresion, papel_mm, pie_ticket, cocina_activa, medios_pago'

interface ConfiguracionStore {
  config: Configuracion
  /** true después del primer intento de carga (haya salido bien o mal). */
  cargada: boolean
  cargando: boolean
  error: string | null
  cargar: () => Promise<void>
  guardar: (cambios: Partial<Configuracion>) => Promise<{ error: string | null }>
}

function normalizar(fila: Partial<Configuracion>): Configuracion {
  const c = { ...CONFIGURACION_POR_DEFECTO, ...fila }
  // Orden estable y sin valores desconocidos
  const medios = ORDEN_PAGOS.filter((m) => c.medios_pago.includes(m))
  return { ...c, medios_pago: medios.length > 0 ? medios : CONFIGURACION_POR_DEFECTO.medios_pago }
}

export const useConfiguracion = create<ConfiguracionStore>((set, get) => ({
  config: CONFIGURACION_POR_DEFECTO,
  cargada: false,
  cargando: false,
  error: null,

  cargar: async () => {
    if (get().cargando) return
    set({ cargando: true })
    try {
      const { data, error } = await supabase.from('configuracion').select(COLUMNAS).maybeSingle()
      if (error) {
        set({ error: error.message })
      } else if (!data) {
        set({ error: 'No hay configuración guardada (falta aplicar la migración 012)' })
      } else {
        set({ config: normalizar(data as Partial<Configuracion>), error: null })
      }
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Error de conexión' })
    } finally {
      set({ cargando: false, cargada: true })
    }
  },

  guardar: async (cambios) => {
    try {
      // La tabla tiene una sola fila (unica = true)
      const { data, error } = await supabase
        .from('configuracion')
        .update(cambios)
        .eq('unica', true)
        .select(COLUMNAS)
        .maybeSingle()
      if (error) return { error: error.message }
      if (!data) return { error: 'No se encontró la configuración para guardar' }
      set({ config: normalizar(data as Partial<Configuracion>), error: null })
      return { error: null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Error de conexión' }
    }
  },
}))
