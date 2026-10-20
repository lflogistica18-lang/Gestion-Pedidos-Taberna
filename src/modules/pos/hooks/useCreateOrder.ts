import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { CartItem } from '../store/useCartStore'
import type { Order, OrderItem, OrderType, PaymentMethod } from '@/types/database.types'
import type { OrderWithItems } from './useActiveOrders'

interface CreateOrderParams {
  items: CartItem[]
  orderType: OrderType
  paymentMethod: PaymentMethod
  notes: string
  customerName: string
  deliveryAddress: string
  total: number
}

interface UseCreateOrderResult {
  submitting: boolean
  error: string | null
  createOrder: (params: CreateOrderParams) => Promise<OrderWithItems | null> // pedido creado con sus ítems
}

export function useCreateOrder(): UseCreateOrderResult {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createOrder = async ({
    items,
    orderType,
    paymentMethod,
    notes,
    customerName,
    deliveryAddress,
    total,
  }: CreateOrderParams): Promise<OrderWithItems | null> => {
    if (items.length === 0) {
      setError('El carrito está vacío')
      return null
    }

    setSubmitting(true)
    setError(null)

    try {
      // 1. Crear el pedido
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          type: orderType,
          payment_method: paymentMethod,
          notes: notes || null,
          customer_name: customerName || null,
          delivery_address: orderType === 'delivery' ? (deliveryAddress || null) : null,
          total,
          status: orderType === 'directo' ? 'entregado' : 'pendiente',
        })
        .select('*')
        .single()

      if (orderErr || !order) {
        setError(orderErr?.message ?? 'Error al crear el pedido')
        return null
      }

      // 2. Insertar los ítems con snapshot de nombre y precio
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,   // snapshot
        unit_price: item.unitPrice,        // snapshot
        quantity: item.quantity,
      }))

      const { data: insertedItems, error: itemsErr } = await supabase
        .from('order_items')
        .insert(orderItems)
        .select('*')

      if (itemsErr || !insertedItems) {
        setError(itemsErr?.message ?? 'Error al guardar los ítems del pedido')
        return null
      }

      // Devolver el pedido completo: se usa para imprimir el ticket sin otra consulta
      return { ...(order as Order), order_items: insertedItems as OrderItem[] }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Excepción al crear el pedido')
      return null
    } finally {
      setSubmitting(false)
    }
  }

  return { submitting, error, createOrder }
}
