import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'

interface UseAnularPedidoResult {
  anulando: boolean
  anular: (orderId: string, motivo: string) => Promise<{ error: string | null }>
}

// Anula un pedido (lo manda a la papelera con motivo). Lo hace sgp.anular_pedido, que
// chequea el rol por dentro: el rol solo pedidos no puede anular un pedido ya entregado.
export function useAnularPedido(): UseAnularPedidoResult {
  const [anulando, setAnulando] = useState(false)

  const anular = async (orderId: string, motivo: string): Promise<{ error: string | null }> => {
    setAnulando(true)
    try {
      const { error } = await supabase.rpc('anular_pedido', {
        p_order_id: orderId,
        p_motivo: motivo,
      })
      return { error: error ? error.message : null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Error de conexión' }
    } finally {
      setAnulando(false)
    }
  }

  return { anulando, anular }
}
