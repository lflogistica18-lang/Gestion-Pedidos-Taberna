import { useId } from 'react'
import { cn } from '@/shared/lib/cn'

// Estilo base compartido por Entrada, Selector y AreaTexto.
// text-base (16 px) evita el zoom automático de iOS al enfocar; desde md baja a 14.
// Alto 44 px en celu y 40 desde md.
const BASE =
  'min-h-11 rounded-lg border border-borde-campo bg-bg-input px-3 py-2 text-base text-texto-primario md:min-h-10 md:text-sm ' +
  'placeholder:text-texto-secundario/70 transition-colors ' +
  'focus:border-acento-primario focus:ring-2 focus:ring-acento-primario/30 focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:bg-superficie-2 disabled:text-texto-secundario'

export function claseCampo(invalido: boolean | undefined, className: string | undefined): string {
  return cn(BASE, invalido && 'border-error focus:border-error focus:ring-error/30', className)
}

interface OpcionesCampo {
  id?: string
  invalido?: boolean
  etiqueta?: string
  ayuda?: unknown
  error?: string
}

/**
 * Lo que comparten Entrada, Selector y AreaTexto cuando traen etiqueta, ayuda o
 * error: un id para enlazar la etiqueta, el estado inválido (también si hay
 * mensaje) y el id que el lector de pantalla lee como descripción del campo.
 */
export function useCampo({ id, invalido, etiqueta, ayuda, error }: OpcionesCampo) {
  const idAuto = useId()
  const idCampo = id ?? idAuto
  const conCampo = etiqueta !== undefined || ayuda !== undefined || error !== undefined
  const idMensaje = error ? `${idCampo}-error` : ayuda ? `${idCampo}-ayuda` : undefined
  return {
    conCampo,
    idCampo,
    idMensaje,
    invalido: invalido || !!error,
  }
}
