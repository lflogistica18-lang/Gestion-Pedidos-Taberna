import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { OrderWithItems } from './useActiveOrders'

// PROVISORIO-WIFI: sacar este hook el día que haya impresora WiFi (la cola la atiende el print server).

/** Fila de sgp.print_jobs con el pedido y sus ítems embebidos. */
export interface TrabajoPendiente {
  id: string
  order_id: string
  created_at: string
  orders: OrderWithItems | null
}

interface UseImpresionesPendientesResult {
  pendientes: TrabajoPendiente[]
  error: string | null
  refetch: () => Promise<void>
  marcarImpreso: (jobId: string) => Promise<{ error: string | null }>
}

const REFRESCO_MS = 60_000
const VENTANA_MS = 24 * 60 * 60 * 1000

/**
 * Tickets que quedaron "para imprimir" (encolados por celu/tablet).
 * Con `activo` en false no consulta ni se suscribe.
 * `alLlegarNuevo` se llama con cada pendiente que aparece después de la primera carga.
 * Sin reintentos en bucle: un canal por montaje y un refresco cada 60 s solo con la pestaña visible.
 */
export function useImpresionesPendientes(
  activo: boolean,
  alLlegarNuevo?: (nuevos: TrabajoPendiente[]) => void,
): UseImpresionesPendientesResult {
  const [datos, setDatos] = useState<TrabajoPendiente[]>([])
  const [error, setError] = useState<string | null>(null)
  const vistos = useRef<Set<string> | null>(null)
  const alLlegarRef = useRef(alLlegarNuevo)
  useEffect(() => { alLlegarRef.current = alLlegarNuevo })

  const traer = useCallback(async () => {
    try {
      const desde = new Date(Date.now() - VENTANA_MS).toISOString()
      const { data, error: err } = await supabase
        .from('print_jobs')
        .select('id, order_id, created_at, orders(*, order_items(*))')
        .eq('estado', 'pendiente')
        .is('deleted_at', null)
        .gte('created_at', desde)
        .order('created_at', { ascending: true })

      if (err) {
        setError(err.message)
        return
      }
      // Un pedido anulado (papelera o cancelado) ya no se imprime: sale de la lista
      const lista = ((data ?? []) as unknown as TrabajoPendiente[]).filter(
        (j) => j.orders && !j.orders.deleted_at && j.orders.status !== 'cancelado',
      )
      setError(null)
      setDatos(lista)

      const anteriores = vistos.current
      vistos.current = new Set(lista.map((j) => j.id))
      if (anteriores) {
        const nuevos = lista.filter((j) => !anteriores.has(j.id))
        if (nuevos.length > 0) alLlegarRef.current?.(nuevos)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión')
    }
  }, [])

  useEffect(() => {
    if (!activo) return
    vistos.current = null
    const cargaInicial = async () => { await traer() }
    void cargaInicial()

    // Nombre único por montaje (StrictMode). Sin re-suscripción ante CLOSED/CHANNEL_ERROR.
    const nombre = `impresiones-pendientes-${Math.random().toString(36).slice(2, 11)}`
    const canal = supabase
      .channel(nombre)
      .on('postgres_changes', { event: '*', schema: 'sgp', table: 'print_jobs' }, () => { void traer() })
      // Si se anula un pedido, la lista se entera al instante (no hay evento en print_jobs)
      .on('postgres_changes', { event: 'UPDATE', schema: 'sgp', table: 'orders' }, () => { void traer() })
      .subscribe()

    const intervalo = setInterval(() => {
      if (document.visibilityState === 'visible') void traer()
    }, REFRESCO_MS)
    const alVolver = () => {
      if (document.visibilityState === 'visible') void traer()
    }
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
      void supabase.removeChannel(canal)
    }
  }, [activo, traer])

  const marcarImpreso = useCallback(async (jobId: string): Promise<{ error: string | null }> => {
    try {
      const { error: err } = await supabase
        .from('print_jobs')
        .update({ estado: 'impreso', impreso_at: new Date().toISOString() })
        .eq('id', jobId)
        .eq('estado', 'pendiente')
      if (err) return { error: err.message }
      await traer()
      return { error: null }
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Error de conexión' }
    }
  }, [traer])

  return { pendientes: activo ? datos : [], error: activo ? error : null, refetch: traer, marcarImpreso }
}
