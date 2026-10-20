import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Order, OrderItem } from '@/types/database.types'

export interface OrderWithItems extends Order {
  order_items: OrderItem[]
}

export interface UseActiveOrdersResult {
  orders: OrderWithItems[]
  loading: boolean
  error: string | null
  activeCount: number
  refetch: () => Promise<void>
}

const ACTIVE_STATUSES = ['pendiente', 'en_preparacion', 'listo'] as const

export function useActiveOrders(): UseActiveOrdersResult {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .is('deleted_at', null)
        .in('status', ACTIVE_STATUSES)
        .order('created_at', { ascending: true })

      if (err) {
        setError(err.message)
      } else {
        setError(null)
        setOrders((data ?? []) as OrderWithItems[])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      await fetch()
    }
    loadData()

    // Nombre único por montaje para evitar conflicto con React StrictMode
    // (StrictMode monta/desmonta dos veces en dev, el canal del primer montaje
    // puede no estar completamente removido cuando el segundo intenta suscribirse)
    const channelName = `active-orders-${Math.random().toString(36).substr(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'sgp', table: 'orders' },
        () => fetch()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  const activeCount = orders.length

  return { orders, loading, error, activeCount, refetch: fetch }
}
