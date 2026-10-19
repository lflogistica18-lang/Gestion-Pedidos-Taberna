import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { OrderStatus } from '@/types/database.types'

export interface UseUpdateOrderStatusResult {
  updatingId: string | null
  updateStatus: (orderId: string, newStatus: OrderStatus) => Promise<{ error: string | null }>
  deleteOrder: (orderId: string) => Promise<{ error: string | null }>
}

export function useUpdateOrderStatus(): UseUpdateOrderStatusResult {
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const updateStatus = async (orderId: string, newStatus: OrderStatus): Promise<{ error: string | null }> => {
    setUpdatingId(orderId)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
      return { error: error ? error.message : null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Error de conexión' }
    } finally {
      setUpdatingId(null)
    }
  }

  const deleteOrder = async (orderId: string): Promise<{ error: string | null }> => {
    setUpdatingId(orderId)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', orderId)
      return { error: error ? error.message : null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Error de conexión' }
    } finally {
      setUpdatingId(null)
    }
  }

  return { updatingId, updateStatus, deleteOrder }
}
