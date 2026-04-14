import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'

export interface DailyBreakdown {
  date: string   // 'DD/MM'
  revenue: number
  orders: number
}

export interface DailyStats {
  totalRevenue: number
  totalRevenueCash: number
  totalRevenueTransfer: number
  totalOrders: number
  totalUnits: number
  deliveryCount: number
  localCount: number
  topProducts: { name: string; qty: number; revenue: number }[]
  dailyData: DailyBreakdown[]
}

// Stats filtradas por rango de fechas
export function useDashboardStats(dateFrom: Date = new Date(), dateTo: Date = new Date()) {
  const [stats, setStats] = useState<DailyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      const startOfDay = new Date(dateFrom)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(dateTo)
      endOfDay.setHours(23, 59, 59, 999)

      const { data: orders } = await supabase
        .from('orders')
        .select('*, order_items(*)')
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
      let totalUnits = 0

      const productsMap: Record<string, { qty: number; revenue: number }> = {}
      const dailyMap: Record<string, { revenue: number; orders: number }> = {}

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

        // Agrupar por día para el gráfico
        const dateKey = new Date(order.created_at).toLocaleDateString('es-AR', {
          day: '2-digit', month: '2-digit',
        })
        if (!dailyMap[dateKey]) dailyMap[dateKey] = { revenue: 0, orders: 0 }
        dailyMap[dateKey].revenue += orderTotal
        dailyMap[dateKey].orders += 1

        for (const item of order.order_items) {
          totalUnits += item.quantity
          if (!productsMap[item.product_name]) {
            productsMap[item.product_name] = { qty: 0, revenue: 0 }
          }
          productsMap[item.product_name].qty += item.quantity
          productsMap[item.product_name].revenue += Number(item.subtotal) || (Number(item.unit_price) * item.quantity)
        }
      }

      // Convertir dailyMap a array ordenado cronológicamente
      const dailyData: DailyBreakdown[] = Object.entries(dailyMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => {
          const [da, ma] = a.date.split('/').map(Number)
          const [db, mb] = b.date.split('/').map(Number)
          return ma !== mb ? ma - mb : da - db
        })

      setStats({
        totalRevenue,
        totalRevenueCash,
        totalRevenueTransfer,
        totalOrders: orders.length,
        totalUnits,
        deliveryCount,
        localCount,
        topProducts: Object.entries(productsMap)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5),
        dailyData,
      })
      setLoading(false)
    }

    fetchStats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom.toISOString().split('T')[0], dateTo.toISOString().split('T')[0]])

  return { stats, loading }
}

// Promedio de preparación: siempre HOY, solo pedidos de cocina (que tuvieron en_preparacion)
// No depende de los filtros de fecha del dashboard
export function usePrepTimeStats() {
  const [avgPrepTimeMs, setAvgPrepTimeMs] = useState<number>(0)
  const [prepLoading, setPrepLoading] = useState(true)

  useEffect(() => {
    const fetchPrepTime = async () => {
      setPrepLoading(true)
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      const endOfToday = new Date()
      endOfToday.setHours(23, 59, 59, 999)

      const { data: orders } = await supabase
        .from('orders')
        .select('order_status_log(*)')
        .gte('created_at', startOfToday.toISOString())
        .lte('created_at', endOfToday.toISOString())

      if (!orders) {
        setPrepLoading(false)
        return
      }

      let totalPrepTimeMs = 0
      let prepOrdersCount = 0

      for (const order of orders) {
        const log = order.order_status_log as { action: string; created_at: string }[]
        // Solo pedidos que pasaron por cocina
        const hasKitchen = log.some((l) => l.action === 'en_preparacion')
        if (!hasKitchen) continue

        const createdLog = log.find((l) => l.action === 'created')
        const readyLog = log.find((l) => l.action === 'ready')

        if (createdLog && readyLog) {
          const timeDiff = new Date(readyLog.created_at).getTime() - new Date(createdLog.created_at).getTime()
          if (timeDiff > 0) {
            totalPrepTimeMs += timeDiff
            prepOrdersCount++
          }
        }
      }

      setAvgPrepTimeMs(prepOrdersCount > 0 ? totalPrepTimeMs / prepOrdersCount : 0)
      setPrepLoading(false)
    }

    fetchPrepTime()
  }, []) // Sin dependencias → no cambia con filtros de fecha

  return { avgPrepTimeMs, prepLoading }
}
