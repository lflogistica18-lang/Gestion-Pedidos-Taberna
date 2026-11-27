import { useCallback, useEffect, useState } from 'react'

export interface Carga<T> {
  datos: T
  cargando: boolean
  error: string | null
  recargar: () => Promise<void>
}

/** Carga inicial de una lista. `cargar` tiene que ser estable (useCallback) y tirar Error si falla. */
export function useCarga<T>(cargar: () => Promise<T>, inicial: T): Carga<T> {
  const [datos, setDatos] = useState<T>(inicial)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setDatos(await cargar())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setCargando(false)
    }
  }, [cargar])

  useEffect(() => {
    const correr = async () => {
      await recargar()
    }
    correr()
  }, [recargar])

  return { datos, cargando, error, recargar }
}
