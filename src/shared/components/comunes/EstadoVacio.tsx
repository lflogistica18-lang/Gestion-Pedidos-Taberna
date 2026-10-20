// Estado vacio — cuando no hay datos para mostrar

import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { Boton } from '@/shared/components/panel'

interface Props {
  mensaje: string
  accion?: {
    texto: string
    onClick: () => void
  }
  /** Ícono propio; por defecto una bandeja vacía. */
  icono?: ReactNode
}

export function EstadoVacio({ mensaje, accion, icono }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-superficie-2 text-texto-secundario" aria-hidden="true">
        {icono ?? <Inbox size={26} />}
      </span>
      <p className="mb-4 text-texto-secundario">{mensaje}</p>
      {accion && (
        <Boton variante="primario" onClick={accion.onClick}>
          {accion.texto}
        </Boton>
      )}
    </div>
  )
}
