// =============================================================================
// AvisoEstado.tsx — Franja pálida con borde del tono, ícono, título corto y detalle
//
// Para decir "acá hay algo que mirar" arriba de un modal o de una sección.
// Rojo = crítico, ámbar = advertencia, amarillo = atención, verde = todo bien,
// neutro = informativo. El ícono por defecto sale del tono; `icono` lo pisa.
// =============================================================================

import type { ReactNode } from 'react'
import { CircleCheck, Clock, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { CLASES_TONO, type TonoAviso } from './tonos.helpers'

const ICONO_POR_TONO: Record<TonoAviso, LucideIcon> = {
  rojo: TriangleAlert,
  ambar: TriangleAlert,
  amarillo: Clock,
  verde: CircleCheck,
  neutro: Info,
}

interface AvisoEstadoProps {
  tono: TonoAviso
  /** Título corto en negrita ("Pedido cancelado"). */
  titulo: string
  /** Detalle chico bajo el título. */
  children?: ReactNode
  /** Botón a la derecha (o debajo en pantallas angostas). */
  accion?: ReactNode
  /** Ícono propio en lugar del que corresponde al tono. */
  icono?: LucideIcon
  className?: string
}

export function AvisoEstado({ tono, titulo, children, accion, icono, className }: AvisoEstadoProps) {
  const clases = CLASES_TONO[tono]
  const Icono = icono ?? ICONO_POR_TONO[tono]
  return (
    <div role={tono === 'rojo' ? 'alert' : undefined} className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3 py-2.5', clases.fondo, clases.borde, className)}>
      <Icono size={18} className={cn('shrink-0', clases.icono)} aria-hidden="true" />
      <div className="min-w-0 flex-1 basis-40">
        <p className={cn('text-sm font-semibold leading-tight', clases.fuerte)}>{titulo}</p>
        {children && <div className="mt-0.5 break-words text-xs text-texto-secundario">{children}</div>}
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </div>
  )
}
