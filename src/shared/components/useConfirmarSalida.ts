import { useCallback, useEffect, useState } from 'react'

const ESPERA_MS = 3000

/**
 * Salir pide confirmación con doble toque: el primero arma la confirmación y,
 * si en 3 segundos no se toca de nuevo, se cancela sola.
 */
export function useConfirmarSalida(onSalir: () => Promise<void>) {
  const [armado, setArmado] = useState(false)

  useEffect(() => {
    if (!armado) return
    const id = setTimeout(() => setArmado(false), ESPERA_MS)
    return () => clearTimeout(id)
  }, [armado])

  const alTocar = useCallback(() => {
    if (!armado) {
      setArmado(true)
      return
    }
    setArmado(false)
    void onSalir()
  }, [armado, onSalir])

  return { armado, alTocar }
}
