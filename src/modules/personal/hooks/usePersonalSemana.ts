import { useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { NovedadPersonal, PagoPersonal } from '@/types/database.types'
import { pagosVigentes } from '../lib/calculos'
import { useCarga } from './useCarga'

interface DatosSemana {
  /** Pagos de la semana mirada y de la vencida (para el estado de cada empleada). */
  pagos: PagoPersonal[]
  /** Novedades todavía sin descontar en ningún pago (adelantos y faltas pendientes). */
  novedadesPendientes: NovedadPersonal[]
}

/** Lo que necesita la pestaña Semana. Se recarga cuando cambia la semana mirada. */
export function usePersonalSemana(semanaDesde: string, vencidaDesde: string) {
  const cargar = useCallback(async (): Promise<DatosSemana> => {
    const desdes = Array.from(new Set([semanaDesde, vencidaDesde]))
    const [pagos, novedades] = await Promise.all([
      supabase.from('pagos_personal').select('*').is('deleted_at', null).in('semana_desde', desdes),
      supabase.from('novedades_personal').select('*').is('deleted_at', null).is('pago_id', null).order('fecha'),
    ])
    if (pagos.error) throw new Error(pagos.error.message)
    if (novedades.error) throw new Error(novedades.error.message)
    return {
      // Los anulados no cuentan: la semana vuelve a quedar por pagar
      pagos: pagosVigentes((pagos.data ?? []) as PagoPersonal[]),
      novedadesPendientes: (novedades.data ?? []) as NovedadPersonal[],
    }
  }, [semanaDesde, vencidaDesde])
  return useCarga<DatosSemana>(cargar, { pagos: [], novedadesPendientes: [] })
}
