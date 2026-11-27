import { useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Empleado } from '@/types/database.types'
import { useCarga } from './useCarga'
import { mensajeDeExcepcion, textoError, type Resultado } from './errores'

export interface DatosEmpleado {
  nombre: string
  telefono: string | null
  sueldo_semanal: number
  dias_por_semana: number
  fecha_ingreso: string | null
  notas: string | null
}

export function useEmpleados() {
  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('empleados').select('*').is('deleted_at', null).order('nombre')
    if (error) throw new Error(error.message)
    return (data ?? []) as Empleado[]
  }, [])
  const { datos, cargando, error, recargar } = useCarga<Empleado[]>(cargar, [])

  const crear = async (d: DatosEmpleado): Promise<Resultado> => {
    try {
      const { error: err } = await supabase.from('empleados').insert(d)
      if (err) return { error: textoError(err) }
      await recargar()
      return { error: null }
    } catch (e) {
      return { error: mensajeDeExcepcion(e) }
    }
  }

  const editar = async (id: string, d: DatosEmpleado): Promise<Resultado> => {
    try {
      const { error: err } = await supabase.from('empleados').update(d).eq('id', id)
      if (err) return { error: textoError(err) }
      await recargar()
      return { error: null }
    } catch (e) {
      return { error: mensajeDeExcepcion(e) }
    }
  }

  const cambiarActiva = async (id: string): Promise<Resultado> => {
    const actual = datos.find((x) => x.id === id)
    if (!actual) return { error: 'No se encontró la empleada' }
    try {
      const { error: err } = await supabase.from('empleados').update({ active: !actual.active }).eq('id', id)
      if (err) return { error: textoError(err) }
      await recargar()
      return { error: null }
    } catch (e) {
      return { error: mensajeDeExcepcion(e) }
    }
  }

  return { empleados: datos, cargando, error, recargar, crear, editar, cambiarActiva }
}
