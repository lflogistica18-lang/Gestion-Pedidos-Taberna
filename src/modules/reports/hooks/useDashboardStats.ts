import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'

export interface DailyStats {
  totalRevenue: number
  totalRevenueCash: number
  totalRevenueTransfer: number
  totalOrders: number
  deliveryCount: number
  localCount: number
  averagePrepTimeMs: number
  topProducts: { name: string; qty: number; revenue: number }[]
}

export function useDashboardStats(date: Date = new Date()) {
  const [stats, setStats] = useState<DailyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const { data: orders } = await supabase
        .from('orders')
        .select('*, order_items(*), order_status_log(*)')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())

      if (!orders) {
         setLoading(false)
         return
      }

      let totalRevenue = 0
      let totalRevenueCash = 0
      let totalRevenueTransfer = 0
      let deliveryCount = 0
      let localCount = 0
      let totalPrepTimeMs = 0
      let prepOrdersCount = 0

      const productsMap: Record<string, { qty: number; revenue: number }> = {}

      for (const order of orders) {
        const orderTotal = Number(order.total) || 0
        totalRevenue += orderTotal
        
        if (order.payment_method === 'efectivo') {
          totalRevenueCash += orderTotal
        } else {
          totalRevenueTransfer += orderTotal
        }
        
        if (order.type === 'delivery') deliveryCount++
        else localCount++

        for (const item of order.order_items) {
          if (!productsMap[item.product_name]) {
            productsMap[item.product_name] = { qty: 0, revenue: 0 }
          }
          productsMap[item.product_name].qty += item.quantity
          productsMap[item.product_name].revenue += Number(item.subtotal) || (Number(item.unit_price) * item.quantity)
        }

        const createdLog = order.order_status_log.find((l: any) => l.action === 'created')
        const readyLog = order.order_status_log.find((l: any) => l.action === 'ready')

        if (createdLog && readyLog) {
          const timeDiff = new Date(readyLog.created_at).getTime() - new Date(createdLog.created_at).getTime()
          if (timeDiff > 0) {
             totalPrepTimeMs += timeDiff
             prepOrdersCount++
          }
        }
      }

      setStats({
        totalRevenue,
        totalRevenueCash,
        totalRevenueTransfer,
        totalOrders: orders.length,
        deliveryCount,
        localCount,
        averagePrepTimeMs: prepOrdersCount > 0 ? totalPrepTimeMs / prepOrdersCount : 0,
        topProducts: Object.entries(productsMap)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5)
      })
      setLoading(false)
    }

    fetchStats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date.toISOString().split('T')[0]])

  return { stats, loading }
}
