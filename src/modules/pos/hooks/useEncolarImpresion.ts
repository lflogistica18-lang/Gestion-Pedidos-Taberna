import { useState, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'

interface UseEncolarImpresionResult {
  encolando: boolean
  encolar: (orderId: string) => Promise<{ error: string | null }>
}

// Deja un ticket en la cola de impresión (modo 'servidor'). El print server de
// la PC del local lo toma por realtime y lo manda a la comandera.
export function useEncolarImpresion(): UseEncolarImpresionResult {
  const [encolando, setEncolando] = useState(false)

  const encolar = useCallback(async (orderId: string): Promise<{ error: string | null }> => {
    setEncolando(true)
    try {
      const { error } = await supabase
        .from('print_jobs')
        .insert({ order_id: orderId, tipo: 'ticket' })
      return { error: error ? error.message : null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Error de conexión' }
    } finally {
      setEncolando(false)
    }
  }, [])

  return { encolando, encolar }
}
