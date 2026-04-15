import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Order, OrderItem } from '@/types/database.types'

export interface KdsOrder extends Order {
  order_items: OrderItem[]
}

const KDS_STATUSES = ['pendiente', 'en_preparacion'] as const

export function useKdsOrders() {
  const [orders, setOrders] = useState<KdsOrder[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .is('deleted_at', null)
        .in('status', KDS_STATUSES)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setOrders(data as KdsOrder[])
      }
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Definimos función interna para evitar warning de ESLint react-hooks
    const loadData = async () => {
      await fetch()
    }
    loadData()

    const channelName = `kds-orders-${Math.random().toString(36).substr(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'sgp', table: 'orders' },
        () => loadData()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  return { orders, loading, refetch: fetch }
}
