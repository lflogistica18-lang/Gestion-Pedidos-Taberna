import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { CartItem } from '../store/useCartStore'
import type { Order, OrderItem, OrderType, PaymentMethod } from '@/types/database.types'
import type { OrderWithItems } from './useActiveOrders'

interface EditarPedidoParams {
  orderId: string
  items: CartItem[]
  orderType: OrderType
  paymentMethod: PaymentMethod
  notes: string
  customerName: string
  deliveryAddress: string
}

interface UseEditarPedidoResult {
  guardando: boolean
  error: string | null
  /**
   * Guarda los cambios. `guardado` dice si la base los aceptó; `pedido` es el pedido completo ya
   * actualizado (para reimprimir el ticket) o null si se guardó pero no se pudo volver a leer.
   */
  editarPedido: (params: EditarPedidoParams) => Promise<ResultadoEdicion>
}

interface ResultadoEdicion {
  guardado: boolean
  pedido: OrderWithItems | null
}

const NO_GUARDADO: ResultadoEdicion = { guardado: false, pedido: null }

// Modifica el MISMO pedido (mismo número) con sgp.editar_pedido. Solo viaja el producto y la
// cantidad: el precio y el nombre de cada línea los decide la base.
export function useEditarPedido(): UseEditarPedidoResult {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const editarPedido = async (p: EditarPedidoParams): Promise<ResultadoEdicion> => {
    if (p.items.length === 0) {
      setError('El carrito está vacío')
      return NO_GUARDADO
    }

    setGuardando(true)
    setError(null)

    try {
      const { error: rpcErr } = await supabase.rpc('editar_pedido', {
        p_order_id: p.orderId,
        p_items: p.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
        p_type: p.orderType,
        p_payment_method: p.paymentMethod,
        p_notes: p.notes,
        p_customer_name: p.customerName,
        p_delivery_address: p.deliveryAddress,
      })
      if (rpcErr) {
        setError(rpcErr.message)
        return NO_GUARDADO
      }

      // Se vuelve a leer el pedido: el ticket se imprime con lo que quedó guardado
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', p.orderId)
        .single()
      const { data: lineas, error: lineasErr } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', p.orderId)

      if (orderErr || !order || lineasErr || !lineas) {
        setError(`El pedido se guardó, pero no se pudo leer para imprimir: ${(orderErr ?? lineasErr)?.message ?? 'sin datos'}. Reimprimí desde Pedidos.`)
        return { guardado: true, pedido: null }
      }

      return { guardado: true, pedido: { ...(order as Order), order_items: lineas as OrderItem[] } }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Excepción al editar el pedido')
      return NO_GUARDADO
    } finally {
      setGuardando(false)
    }
  }

  return { guardando, error, editarPedido }
}
