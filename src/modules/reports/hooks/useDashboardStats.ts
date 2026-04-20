import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'

export interface DailyBreakdown {
  date: string
  revenue: number
  orders: number
}

export interface TopProducto {
  name: string
  qty: number
  revenue: number
  category: string
}

export interface DailyStats {
  totalRevenue: number
  totalRevenueCash: number
  totalRevenueTransfer: number
  totalCost: number
  totalMargin: number
  totalOrders: number
  totalUnits: number
  deliveryCount: number
  localCount: number
  // Promedio de preparación — solo pedidos de cocina, usa el mismo rango de fechas
  avgPrepTimeMinutes: number
  kitchenOrdersCount: number  // cuántos pedidos fueron a cocina
  topProducts: TopProducto[]
  topByCategory: Record<string, TopProducto[]>
  dailyData: DailyBreakdown[]
}

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

      // Traer órdenes con items Y logs de estado en un solo query
      const { data: orders } = await supabase
        .from('orders')
        .select('*, order_items(*), order_status_log(*)')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())

      // Traer productos para costo y categoría
      const { data: products } = await supabase
        .from('products')
        .select('name, cost, category')

      if (!orders) {
        setLoading(false)
        return
      }

      // Mapa producto → {cost, category}
      const productMap: Record<string, { cost: number; category: string }> = {}
      if (products) {
        for (const p of products) {
          productMap[p.name] = { cost: Number(p.cost) || 0, category: p.category || 'Sin categoría' }
        }
      }

      let totalRevenue = 0
      let totalRevenueCash = 0
      let totalRevenueTransfer = 0
      let totalCost = 0
      let deliveryCount = 0
      let localCount = 0
      let totalUnits = 0

      // Promedio cocina — solo órdenes que pasaron por en_preparacion
      let totalPrepMs = 0
      let kitchenOrdersCount = 0

      const productsMap: Record<string, { qty: number; revenue: number; category: string }> = {}
      const dailyMap: Record<string, { revenue: number; orders: number }> = {}

      for (const order of orders) {
        const orderTotal = Number(order.total) || 0
        totalRevenue += orderTotal

        if (order.payment_method === 'efectivo') totalRevenueCash += orderTotal
        else totalRevenueTransfer += orderTotal

        if (order.type === 'delivery') deliveryCount++
        else localCount++

        // Agrupar por día
        const dateKey = new Date(order.created_at).toLocaleDateString('es-AR', {
          day: '2-digit', month: '2-digit',
        })
        if (!dailyMap[dateKey]) dailyMap[dateKey] = { revenue: 0, orders: 0 }
        dailyMap[dateKey].revenue += orderTotal
        dailyMap[dateKey].orders += 1

        // Items
        for (const item of order.order_items) {
          totalUnits += item.quantity
          const pInfo = productMap[item.product_name] || { cost: 0, category: 'Sin categoría' }
          totalCost += pInfo.cost * item.quantity

          if (!productsMap[item.product_name]) {
            productsMap[item.product_name] = { qty: 0, revenue: 0, category: pInfo.category }
          }
          productsMap[item.product_name].qty += item.quantity
          productsMap[item.product_name].revenue += Number(item.subtotal) || (Number(item.unit_price) * item.quantity)
        }

        // ── Promedio de cocina ──────────────────────────────────
        // Solo pedidos que pasaron por estado en_preparacion (fueron a cocina)
        const logs = (order.order_status_log || []) as { action: string; created_at: string }[]
        const fueAcocina = logs.some(l => l.action === 'en_preparacion')

        if (fueAcocina) {
          // Tiempo = desde el log 'created' al log 'listo' (o 'ready')
          const logCreado = logs.find(l => l.action === 'created')
          const logListo = logs.find(l => l.action === 'listo' || l.action === 'ready')

          if (logCreado && logListo) {
            const diff = new Date(logListo.created_at).getTime() - new Date(logCreado.created_at).getTime()
            if (diff > 0) {
              totalPrepMs += diff
              kitchenOrdersCount++
            }
          }
        }
      }

      // Ordenar daily data cronológicamente
      const dailyData: DailyBreakdown[] = Object.entries(dailyMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => {
          const [da, ma] = a.date.split('/').map(Number)
          const [db, mb] = b.date.split('/').map(Number)
          return ma !== mb ? ma - mb : da - db
        })

      // Top 5 global
      const topProducts: TopProducto[] = Object.entries(productsMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5)

      // Top por categoría (top 3 cada una)
      const categoryMap: Record<string, TopProducto[]> = {}
      for (const [name, data] of Object.entries(productsMap)) {
        const cat = data.category
        if (!categoryMap[cat]) categoryMap[cat] = []
        categoryMap[cat].push({ name, ...data })
      }
      const topByCategory: Record<string, TopProducto[]> = {}
      for (const [cat, items] of Object.entries(categoryMap)) {
        topByCategory[cat] = items.sort((a, b) => b.qty - a.qty).slice(0, 3)
      }

      const avgPrepTimeMinutes = kitchenOrdersCount > 0
        ? Math.round(totalPrepMs / kitchenOrdersCount / 60000)
        : 0

      setStats({
        totalRevenue,
        totalRevenueCash,
        totalRevenueTransfer,
        totalCost,
        totalMargin: totalRevenue - totalCost,
        totalOrders: orders.length,
        totalUnits,
        deliveryCount,
        localCount,
        avgPrepTimeMinutes,
        kitchenOrdersCount,
        topProducts,
        topByCategory,
        dailyData,
      })
      setLoading(false)
    }

    fetchStats()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom.toISOString().split('T')[0], dateTo.toISOString().split('T')[0]])

  return { stats, loading }
}

// Mantener export para no romper imports existentes (deprecated — usar useDashboardStats)
export function usePrepTimeStats() {
  return { avgPrepTimeMs: 0, prepLoading: false }
}
