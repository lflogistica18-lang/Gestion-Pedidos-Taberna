import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Order, OrderItem } from '@/types/database.types'

// Orden con detalle de items incluido
export interface OrderConDetalle extends Order {
  order_items: OrderItem[]
}

export function useAdminOrders() {
  const [orders, setOrders] = useState<OrderConDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Traer orders CON detalle de items — join para mostrar en historial
      const { data, error: err } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })

      if (err) {
        setError(err.message)
      } else {
        setOrders((data as OrderConDetalle[]) || [])
      }
    } catch (e: any) {
      setError(e.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

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
    } catch (e: any) {
      await fetchOrders()
      return { error: e.message }
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
    } catch (e: any) {
      await fetchOrders()
      return { error: e.message }
    }
  }

  // Eliminación permanente — borra de la DB
  // Resta de caja está implícito — el registro ya no existe
  const eliminarPermanente = async (id: string): Promise<{ error: string | null }> => {
    // Actualización optimista
    setOrders(prev => prev.filter(o => o.id !== id))

    try {
      // Borrar items primero (si hay FK constraint)
      const { error: itemsErr } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', id)

      if (itemsErr) {
        await fetchOrders()
        return { error: `Error al borrar items: ${itemsErr.message}` }
      }

      // Borrar logs de estado
      const { error: logsErr } = await supabase
        .from('order_status_log')
        .delete()
        .eq('order_id', id)

      // Aceptamos fallo en logs — puede que no existan
      if (logsErr) {
        console.warn('Advertencia al borrar logs:', logsErr.message)
      }

      // Finalmente borrar el pedido
      const { error: orderErr } = await supabase
        .from('orders')
        .delete()
        .eq('id', id)

      if (orderErr) {
        await fetchOrders()
        return { error: `Error al borrar pedido: ${orderErr.message}` }
      }

      return { error: null }
    } catch (e: any) {
      await fetchOrders()
      return { error: e.message }
    }
  }

  // Compatibilidad — alias del soft delete
  const deactivateOrder = enviarAPapelera

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    enviarAPapelera,
    restaurarDePapelera,
    eliminarPermanente,
    deactivateOrder,
  }
}
