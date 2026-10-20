// =============================================================================
// EncabezadoPagina.tsx — Cabecera de pantalla del estilo Panel (sin banner)
//
// Ícono en cuadradito de color suave + título grande + línea de contexto, y a la
// derecha las acciones (en celu bajan debajo del título y se envuelven). Las
// pestañas opcionales van debajo del título. El banner degradé es solo de Reportes.
// =============================================================================

import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export type TonoEncabezado = 'naranja' | 'azul' | 'verde' | 'violeta'

// Clases completas y estáticas: Tailwind no ve las que se arman con template strings.
const CLASES_TONO: Record<TonoEncabezado, string> = {
  naranja: 'bg-indicador-naranja/10 text-indicador-naranja',
  azul: 'bg-indicador-azul/10 text-indicador-azul',
  verde: 'bg-indicador-verde/10 text-indicador-verde',
  violeta: 'bg-indicador-violeta/10 text-indicador-violeta',
}

interface EncabezadoPaginaProps {
  /** Ícono lucide (size 22); el cuadradito y el color los pone el encabezado. */
  icono: ReactNode
  titulo: string
  /** Línea de contexto bajo el título, ej. "164 productos activos en 12 categorías". */
  detalle?: ReactNode
  /** Botones de la derecha. Se envuelven; en celu quedan debajo del título. */
  acciones?: ReactNode
  /** Pestañas o filtros que van debajo del título, a todo el ancho. */
  pestanas?: ReactNode
  /** Color del cuadradito del ícono. Por defecto naranja. */
  tono?: TonoEncabezado
  /** Título y acciones siempre en una sola fila (el título se acorta); en celu sin cuadradito de ícono. */
  enLinea?: boolean
}

export function EncabezadoPagina({ icono, titulo, detalle, acciones, pestanas, tono = 'naranja', enLinea }: EncabezadoPaginaProps) {
  return (
    <header className={enLinea ? 'mb-3 sm:mb-6' : 'mb-4 sm:mb-6'}>
      <div className={cn('flex items-center justify-between gap-x-4 gap-y-3', !enLinea && 'flex-wrap')}>
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn('size-11 shrink-0 items-center justify-center rounded-xl', enLinea ? 'hidden sm:flex' : 'flex', CLASES_TONO[tono])}
            aria-hidden="true"
          >
            {icono}
          </span>
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold leading-tight text-texto-primario sm:text-2xl">{titulo}</h2>
            {detalle && <p className="mt-0.5 text-sm text-texto-secundario">{detalle}</p>}
          </div>
        </div>
        {acciones && <div className={cn('flex items-center gap-2', enLinea ? 'shrink-0' : 'flex-wrap')}>{acciones}</div>}
      </div>
      {pestanas && <div className="mt-3 min-w-0 sm:mt-4">{pestanas}</div>}
    </header>
  )
}
