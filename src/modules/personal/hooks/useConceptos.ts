import { useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { ConceptoPago, ModoConcepto, TipoConcepto } from '@/types/database.types'
import { useCarga } from './useCarga'
import { mensajeDeExcepcion, textoError, type Resultado } from './errores'

export interface DatosConcepto {
  nombre: string
  tipo: TipoConcepto
  modo: ModoConcepto
  valor: number
}

const REPETIDO = 'Ya hay un concepto con ese nombre'

export function useConceptos() {
  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('conceptos_pago').select('*').is('deleted_at', null).order('tipo').order('nombre')
    if (error) throw new Error(error.message)
    return (data ?? []) as ConceptoPago[]
  }, [])
  const { datos, cargando, error, recargar } = useCarga<ConceptoPago[]>(cargar, [])

  const guardar = async (d: DatosConcepto, id?: string): Promise<Resultado> => {
    // En "Días de sueldo" el valor no se usa: la base exige 0
    const fila = { ...d, valor: d.modo === 'dias_de_sueldo' ? 0 : d.valor }
    try {
      const { error: err } = id
        ? await supabase.from('conceptos_pago').update(fila).eq('id', id)
        : await supabase.from('conceptos_pago').insert(fila)
      if (err) return { error: textoError(err, REPETIDO) }
      await recargar()
      return { error: null }
    } catch (e) {
      return { error: mensajeDeExcepcion(e) }
    }
  }

  const cambiarActivo = async (id: string): Promise<Resultado> => {
    const actual = datos.find((x) => x.id === id)
    if (!actual) return { error: 'No se encontró el concepto' }
    try {
      const { error: err } = await supabase.from('conceptos_pago').update({ active: !actual.active }).eq('id', id)
      if (err) return { error: textoError(err, REPETIDO) }
      await recargar()
      return { error: null }
    } catch (e) {
      return { error: mensajeDeExcepcion(e) }
    }
  }

  return { conceptos: datos, cargando, error, recargar, guardar, cambiarActivo }
}
