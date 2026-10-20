import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { acumuladoPorHora, type PuntoAcumulado } from '../lib/calculos'

// Cada cuánto se vuelve a pedir la data cuando el período incluye hoy.
const REFRESCO_MS = 60_000

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
  /** Solo si el período es un único día: ventas acumuladas por hora local. */
  hourlyData: PuntoAcumulado[]
}

export interface UseDashboardStatsResult {
  stats: DailyStats | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// Fecha local como string YYYY-MM-DD (NUNCA toISOString: en UTC-3 corre el día)
function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function useDashboardStats(dateFrom: Date = new Date(), dateTo: Date = new Date()): UseDashboardStatsResult {
  const [stats, setStats] = useState<DailyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  // Período ya cargado: los refrescos del mismo período no muestran esqueleto.
  const cargadoRef = useRef<string | null>(null)

  // Deps estables: strings locales calculados fuera del effect
  const fromKey = localDateKey(dateFrom)
  const toKey = localDateKey(dateTo)
  const incluyeHoy = toKey >= localDateKey(new Date())

  // Mientras el período incluye hoy, las ventas se van sumando solas.
  useEffect(() => {
    if (!incluyeHoy) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') setTick(t => t + 1)
    }, REFRESCO_MS)
    return () => clearInterval(id)
  }, [incluyeHoy])

  useEffect(() => {
    let cancelado = false
    const clave = `${fromKey}|${toKey}`
    const fetchStats = async () => {
      const refresco = cargadoRef.current === clave
      if (!refresco) {
        setLoading(true)
        setError(null)
      }
      try {
      const startOfDay = parseLocalDate(fromKey)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = parseLocalDate(toKey)
      endOfDay.setHours(23, 59, 59, 999)

      // Traer órdenes con items Y logs de estado en un solo query
      const { data: orders, error: ordersErr } = await supabase
        .from('orders')
        .select('*, order_items(*), order_status_log(*)')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .is('deleted_at', null)
        .neq('status', 'cancelado')

      // Traer productos para costo y categoría
      const { data: products, error: productsErr } = await supabase
        .from('products')
        .select('name, cost, category')

      if (cancelado) return
      if (ordersErr || productsErr || !orders) {
        // Un refresco de fondo que falla no borra lo que ya se ve; la próxima vuelta reintenta.
        if (refresco) return
        cargadoRef.current = null
        setStats(null)
        setError((ordersErr ?? productsErr)?.message ?? 'No se pudieron cargar los datos')
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
        const dateKey = localDateKey(new Date(order.created_at))
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
        const fueAcocina = logs.some(l => l.action === 'accepted')

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
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)) // YYYY-MM-DD ordena bien también entre años
        .map(([key, data]) => ({ date: `${key.slice(8, 10)}/${key.slice(5, 7)}`, ...data }))

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

      // Por hora solo tiene sentido con un único día. Si es hoy, llega hasta la hora actual.
      const hourlyData = fromKey === toKey
        ? acumuladoPorHora(orders, toKey === localDateKey(new Date()) ? new Date().getHours() : undefined)
        : []

      cargadoRef.current = clave
      setError(null)
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
        hourlyData,
      })
      } catch (e) {
        if (cancelado || refresco) return
        cargadoRef.current = null
        setStats(null)
        setError((e as Error).message)
      } finally {
        if (!cancelado) setLoading(false)
      }
    }

    fetchStats()
    return () => { cancelado = true }
  }, [fromKey, toKey, tick])

  const refetch = () => setTick(t => t + 1)

  return { stats, loading, error, refetch }
}

