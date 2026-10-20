// Ventas promedio por día de la semana, últimas 8 semanas (56 días hasta hoy).
// Independiente del filtro de período. Consulta liviana: solo fecha y total, con los
// mismos filtros que useDashboardStats (sin papelera, sin cancelados).

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { promedioPorDiaSemana, type PedidoMinimo, type PromedioDia } from '../lib/calculos'

const DIAS = 56
const PAGINA = 1000 // Supabase corta en 1000 filas por consulta: se pide por páginas.

export interface UseVentasPorDiaSemanaResult {
  dias: PromedioDia[] | null
  /** Hay al menos un pedido en las 8 semanas. */
  hayDatos: boolean
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useVentasPorDiaSemana(): UseVentasPorDiaSemanaResult {
  const [dias, setDias] = useState<PromedioDia[] | null>(null)
  const [hayDatos, setHayDatos] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelado = false
    const cargar = async () => {
      setLoading(true)
      setError(null)
      try {
        const hoy = new Date()
        const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
        const desde = new Date(hasta)
        desde.setDate(desde.getDate() - (DIAS - 1))
        const finDelDia = new Date(hasta)
        finDelDia.setHours(23, 59, 59, 999)

        const pedidos: PedidoMinimo[] = []
        for (let from = 0; ; from += PAGINA) {
          const { data, error: err } = await supabase
            .from('orders')
            .select('created_at, total')
            .gte('created_at', desde.toISOString())
            .lte('created_at', finDelDia.toISOString())
            .is('deleted_at', null)
            .neq('status', 'cancelado')
            .order('created_at', { ascending: true })
            .range(from, from + PAGINA - 1)
          if (err) throw new Error(err.message)
          pedidos.push(...data)
          if (data.length < PAGINA) break
        }
        if (cancelado) return
        setDias(promedioPorDiaSemana(pedidos, desde, hasta))
        setHayDatos(pedidos.length > 0)
      } catch (e) {
        if (cancelado) return
        setDias(null)
        setError((e as Error).message)
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    cargar()
    return () => { cancelado = true }
  }, [tick])

  const refetch = useCallback(() => setTick((t) => t + 1), [])
  return { dias, hayDatos, loading, error, refetch }
}
