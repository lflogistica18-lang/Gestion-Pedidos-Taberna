import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Order } from '@/types/database.types'

export function useAdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (err) {
        setError(err.message)
      } else {
        setOrders(data || [])
      }
    } catch (e: any) {
      setError(e.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const editOrder = async (id: string, updates: Partial<Order>) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
      
      if (error) return { error: error.message }
      return { error: null }
    } catch (e: any) {
      return { error: e.message }
    }
  }

  const deactivateOrder = async (id: string) => {
    try {
      const order = orders.find(o => o.id === id)
      // Si ya está eliminado, lo restauramos (toggle), sino le ponemos fecha
      const newDeletedAt = order?.deleted_at ? null : new Date().toISOString()
      
      const { error } = await supabase
        .from('orders')
        .update({ deleted_at: newDeletedAt })
        .eq('id', id)

      if (error) return { error: error.message }
      return { error: null }
    } catch (e: any) {
      return { error: e.message }
    }
  }

  return { orders, loading, error, refetch: fetchOrders, editOrder, deactivateOrder }
}
