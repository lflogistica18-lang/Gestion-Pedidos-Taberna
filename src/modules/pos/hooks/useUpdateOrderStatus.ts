import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { OrderStatus } from '@/types/database.types'

export function useUpdateOrderStatus() {
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const updateStatus = async (orderId: string, newStatus: OrderStatus): Promise<boolean> => {
    setUpdatingId(orderId)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
      return !error
    } catch(e: any) {
      console.error(e)
      return false
    } finally {
      setUpdatingId(null)
    }
  }

  const deleteOrder = async (orderId: string): Promise<boolean> => {
    setUpdatingId(orderId)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', orderId)
      return !error
    } catch(e: any) {
      console.error(e)
      return false
    } finally {
      setUpdatingId(null)
    }
  }

  return { updatingId, updateStatus, deleteOrder }
}
