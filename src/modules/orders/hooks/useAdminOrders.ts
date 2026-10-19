import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Order, OrderItem } from '@/types/database.types'

// Orden con detalle de items incluido
export interface OrderConDetalle extends Order {
  order_items: OrderItem[]
}

export interface UseAdminOrdersResult {
  orders: OrderConDetalle[]
  loading: boolean
  error: string | null
  hayMas: boolean
  cargandoMas: boolean
  cargarMas: () => Promise<void>
  refetch: () => Promise<void>
  enviarAPapelera: (id: string) => Promise<{ error: string | null }>
  restaurarDePapelera: (id: string) => Promise<{ error: string | null }>
}

// Cantidad de pedidos por página del historial
const PAGE = 100

export function useAdminOrders(): UseAdminOrdersResult {
  const [orders, setOrders] = useState<OrderConDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hayMas, setHayMas] = useState(false)
  const [cargandoMas, setCargandoMas] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Traer orders CON detalle de items — join para mostrar en historial
      const { data, error: err } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })
        .range(0, PAGE - 1)

      if (err) {
        setError(err.message)
      } else {
        setOrders((data as OrderConDetalle[]) || [])
        setHayMas((data?.length ?? 0) === PAGE)
      }
    } catch (e) {
      setError((e as Error).message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Traer la siguiente página y concatenar
  const cargarMas = async (): Promise<void> => {
    if (cargandoMas) return
    setCargandoMas(true)
    try {
      const desde = orders.length
      const { data, error: err } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })
        .range(desde, desde + PAGE - 1)

      if (err) {
        setError(err.message)
      } else {
        const nuevos = (data as OrderConDetalle[]) || []
        setOrders(prev => [...prev, ...nuevos])
        setHayMas(nuevos.length === PAGE)
      }
    } catch (e) {
      setError((e as Error).message || 'Error de conexión')
    } finally {
      setCargandoMas(false)
    }
  }

  // Soft delete — enviar a papelera
  // Actualiza optimistamente el estado local y luego hace refetch
  const enviarAPapelera = async (id: string): Promise<{ error: string | null }> => {
    // Actualización optimista — mueve orden del historial a papelera de inmediato
    const ahora = new Date().toISOString()
    setOrders(prev =>
      prev.map(o => o.id === id ? { ...o, deleted_at: ahora } : o)
    )

    try {
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ deleted_at: ahora })
        .eq('id', id)

      if (updateErr) {
        // Revertir si falla
        await fetchOrders()
        return { error: updateErr.message }
      }
      return { error: null }
    } catch (e) {
      await fetchOrders()
      return { error: (e as Error).message }
    }
  }

  // Restaurar desde papelera (quitar deleted_at)
  const restaurarDePapelera = async (id: string): Promise<{ error: string | null }> => {
    setOrders(prev =>
      prev.map(o => o.id === id ? { ...o, deleted_at: null } : o)
    )

    try {
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ deleted_at: null })
        .eq('id', id)

      if (updateErr) {
        await fetchOrders()
        return { error: updateErr.message }
      }
      return { error: null }
    } catch (e) {
      await fetchOrders()
      return { error: (e as Error).message }
    }
  }

  return {
    orders,
    loading,
    error,
    hayMas,
    cargandoMas,
    cargarMas,
    refetch: fetchOrders,
    enviarAPapelera,
    restaurarDePapelera,
  }
}
