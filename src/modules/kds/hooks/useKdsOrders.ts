import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Order, OrderItem } from '@/types/database.types'

export interface KdsOrder extends Order {
  order_items: OrderItem[]
}

const KDS_STATUSES = ['pendiente', 'en_preparacion'] as const

// Fecha local como string YYYY-MM-DD (sin toISOString para evitar bug UTC)
function localDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function useKdsOrders() {
  const [orders, setOrders] = useState<KdsOrder[]>([])
  const [todayCount, setTodayCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      // Pedidos activos (pendiente / en preparación)
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .is('deleted_at', null)
        .in('status', KDS_STATUSES)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setOrders(data as KdsOrder[])
      }

      // Pedidos totales del día (sin filtrar por estado — todos los del día)
      const today = localDateStr(new Date())
      const startOfToday = `${today}T00:00:00`
      const endOfToday = `${today}T23:59:59`

      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(startOfToday).toISOString())
        .lte('created_at', new Date(endOfToday).toISOString())
        .is('deleted_at', null)

      setTodayCount(count ?? 0)
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => { await fetch() }
    loadData()

    const channelName = `kds-orders-${Math.random().toString(36).substr(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'sgp', table: 'orders' }, () => loadData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  return { orders, loading, todayCount, refetch: fetch }
}
