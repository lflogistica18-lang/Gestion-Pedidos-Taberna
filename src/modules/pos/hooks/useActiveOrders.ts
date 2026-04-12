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
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setOrders(data as OrderWithItems[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()

    // Realtime: escuchar cambios en orders
    const channel = supabase
      .channel('active-orders')
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
