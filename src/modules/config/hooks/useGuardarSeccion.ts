import { useState } from 'react'
import { mostrarToast } from '@/shared/components/panel'
import { useConfiguracion } from '@/shared/store/useConfiguracion'
import type { Configuracion } from '@/shared/lib/config'

/** Guarda los campos de una sección y avisa el resultado con un toast. */
export function useGuardarSeccion(onGuardado: () => void) {
  const guardarEnStore = useConfiguracion((s) => s.guardar)
  const [guardando, setGuardando] = useState(false)

  async function guardar(cambios: Partial<Configuracion>) {
    setGuardando(true)
    const { error } = await guardarEnStore(cambios)
    setGuardando(false)
    if (error) {
      mostrarToast(`No se pudo guardar: ${error}`, 'error')
      return
    }
    mostrarToast('Cambios guardados')
    onGuardado()
  }

  return { guardando, guardar }
}
