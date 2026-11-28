import { useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Empleado, MedioAdelanto, NovedadPersonal, PagoPersonal, TipoNovedad } from '@/types/database.types'
import { useCarga } from './useCarga'
import { mensajeDeExcepcion, textoError, type Resultado } from './errores'

interface DatosFicha {
  empleado: Empleado | null
  /** Pagos pagados y anulados, el más reciente primero. */
  pagos: PagoPersonal[]
  novedades: NovedadPersonal[]
}

export interface DatosNovedad {
  fecha: string
  tipo: TipoNovedad
  detalle: string
  monto: number | null
  /** Obligatorio en adelantos; null en el resto. */
  medio_pago: MedioAdelanto | null
  descontar: boolean
}

const VACIA: DatosFicha = { empleado: null, pagos: [], novedades: [] }

export function useFichaEmpleada(empleadoId: string) {
  const cargar = useCallback(async (): Promise<DatosFicha> => {
    const [emp, pagos, novedades] = await Promise.all([
      supabase.from('empleados').select('*').eq('id', empleadoId).is('deleted_at', null).maybeSingle(),
      supabase.from('pagos_personal').select('*').eq('empleado_id', empleadoId).in('estado', ['pagado', 'anulado'])
        .is('deleted_at', null).order('semana_desde', { ascending: false }),
      supabase.from('novedades_personal').select('*').eq('empleado_id', empleadoId)
        .is('deleted_at', null).order('fecha', { ascending: false }),
    ])
    if (emp.error) throw new Error(emp.error.message)
    if (pagos.error) throw new Error(pagos.error.message)
    if (novedades.error) throw new Error(novedades.error.message)
    return {
      empleado: (emp.data ?? null) as Empleado | null,
      pagos: (pagos.data ?? []) as PagoPersonal[],
      novedades: (novedades.data ?? []) as NovedadPersonal[],
    }
  }, [empleadoId])
  const { datos, cargando, error, recargar } = useCarga<DatosFicha>(cargar, VACIA)

  const crearNovedad = async (d: DatosNovedad): Promise<Resultado> => {
    try {
      const { error: err } = await supabase.from('novedades_personal').insert({ ...d, empleado_id: empleadoId })
      if (err) return { error: textoError(err) }
      await recargar()
      return { error: null }
    } catch (e) {
      return { error: mensajeDeExcepcion(e) }
    }
  }

  /** Borrado lógico: solo novedades que todavía no entraron en un pago. */
  const quitarNovedad = async (id: string): Promise<Resultado> => {
    try {
      const { error: err } = await supabase.from('novedades_personal')
        .update({ deleted_at: new Date().toISOString() }).eq('id', id).is('pago_id', null)
      if (err) return { error: textoError(err) }
      await recargar()
      return { error: null }
    } catch (e) {
      return { error: mensajeDeExcepcion(e) }
    }
  }

  /** Borrado lógico de la empleada. Si tiene pagos hechos la base lo rechaza con su mensaje, que se muestra tal cual. */
  const borrarEmpleada = async (): Promise<Resultado> => {
    try {
      const { error: err } = await supabase.from('empleados')
        .update({ deleted_at: new Date().toISOString() }).eq('id', empleadoId)
      if (err) return { error: err.message }
      return { error: null }
    } catch (e) {
      return { error: mensajeDeExcepcion(e) }
    }
  }

  return { ...datos, cargando, error, recargar, crearNovedad, quitarNovedad, borrarEmpleada }
}
