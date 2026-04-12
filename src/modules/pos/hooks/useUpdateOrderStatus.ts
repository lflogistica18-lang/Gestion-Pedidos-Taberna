import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { OrderStatus } from '@/types/database.types'

export function useUpdateOrderStatus() {
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const updateStatus = async (orderId: string, newStatus: OrderStatus): Promise<boolean> => {
    setUpdatingId(orderId)
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
    setUpdatingId(null)
    return !error
  }

  const deleteOrder = async (orderId: string): Promise<boolean> => {
    setUpdatingId(orderId)
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
    setUpdatingId(null)
    return !error
  }

  return { updatingId, updateStatus, deleteOrder }
}
