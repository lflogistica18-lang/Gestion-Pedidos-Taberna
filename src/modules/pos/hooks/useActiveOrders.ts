import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Order, OrderItem } from '@/types/database.types'

export interface OrderWithItems extends Order {
  order_items: OrderItem[]
}

const ACTIVE_STATUSES = ['pendiente', 'en_preparacion', 'listo'] as const

export function useActiveOrders() {
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .is('deleted_at', null)
        .in('status', ACTIVE_STATUSES)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setOrders(data as OrderWithItems[])
      }
    } catch (e: any) {
      console.error(e)
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

  return { orders, loading, activeCount, refetch: fetch }
}
