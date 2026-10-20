// =============================================================================
// TarjetaDato.tsx — Un dato grande en tarjeta gris suave (modales de detalle)
//
// Etiqueta en mayúsculas chicas y el valor en negrita grande. Las editables
// llevan una `accion` a la derecha (un lápiz, por ejemplo). Para datos chicos en
// fila, ver TarjetaDatoMini.
// =============================================================================

import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { CLASES_TONO, type TonoAviso } from './tonos.helpers'

interface TarjetaDatoProps {
  /** Se muestra en mayúsculas chicas: escribila normal ("Total cobrado"). */
  etiqueta: string
  /** El valor grande. */
  valor: ReactNode
  /** Línea chica bajo el valor (aclaración, otro dato relacionado). */
  detalle?: ReactNode
  /** Botón o ícono a la derecha, arriba (ej. IconButton con lápiz). */
  accion?: ReactNode
  /** Clases para el valor, ej. "text-error" para marcar un problema. */
  claseValor?: string
  /** Muestra una barra gris en lugar del valor mientras carga. */
  loading?: boolean
  /** Si el dato está mal: fondo pálido, borde, etiqueta y valor en el color del tono. */
  tono?: TonoAviso
  className?: string
}

export function TarjetaDato({ etiqueta, valor, detalle, accion, claseValor, loading, tono, className }: TarjetaDatoProps) {
  const t = tono ? CLASES_TONO[tono] : null
  return (
    // El borde transparente deja la tarjeta del mismo tamaño con y sin tono.
    <div className={cn('min-w-0 rounded-xl border p-4', t ? [t.fondo, t.borde] : 'border-transparent bg-superficie-2', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className={cn('text-[11px] font-semibold uppercase tracking-wide', t ? t.fuerte : 'text-texto-secundario')}>{etiqueta}</p>
        {accion && <div className="-m-2 shrink-0">{accion}</div>}
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-28 animate-pulse rounded bg-borde-sutil" aria-hidden="true" />
      ) : (
        <p className={cn('mt-1 break-words text-2xl font-bold leading-tight', t ? t.valor : 'text-texto-primario', claseValor)}>{valor}</p>
      )}
      {detalle && <div className="mt-1 text-xs text-texto-secundario">{detalle}</div>}
    </div>
  )
}
