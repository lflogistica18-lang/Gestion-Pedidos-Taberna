import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { CartItem } from '../store/useCartStore'
import type { OrderType, PaymentMethod } from '@/types/database.types'

interface CreateOrderParams {
  items: CartItem[]
  orderType: OrderType
  paymentMethod: PaymentMethod
  notes: string
  total: number
}

interface UseCreateOrderResult {
  submitting: boolean
  error: string | null
  createOrder: (params: CreateOrderParams) => Promise<string | null> // retorna order_number
}

export function useCreateOrder(): UseCreateOrderResult {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createOrder = async ({
    items,
    orderType,
    paymentMethod,
    notes,
    total,
  }: CreateOrderParams): Promise<string | null> => {
    if (items.length === 0) {
      setError('El carrito está vacío')
      return null
    }

    setSubmitting(true)
    setError(null)

    // 1. Crear el pedido
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        type: orderType,
        payment_method: paymentMethod,
        notes: notes || null,
        total,
        status: 'pendiente',
      })
      .select('id, order_number')
      .single()

    if (orderErr || !order) {
      setError(orderErr?.message ?? 'Error al crear el pedido')
      setSubmitting(false)
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

    const { error: itemsErr } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsErr) {
      setError(itemsErr.message)
      setSubmitting(false)
      return null
    }

    setSubmitting(false)
    return String(order.order_number)
  }

  return { submitting, error, createOrder }
}
