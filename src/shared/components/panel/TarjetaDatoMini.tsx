// =============================================================================
// TarjetaDatoMini.tsx — Versión chica de TarjetaDato: ícono en círculo + etiqueta + valor
//
// Va en filas o grillas de 2 a 4. El valor se corta con puntos suspensivos y
// queda completo en el tooltip.
// =============================================================================

import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { CLASES_TONO, type TonoAviso } from './tonos.helpers'

interface TarjetaDatoMiniProps {
  /** Ícono lucide (size 16); el círculo blanco lo pone la tarjeta. */
  icono: ReactNode
  /** Se muestra en mayúsculas chicas. */
  etiqueta: string
  valor: ReactNode
  /** Texto plano del valor para el tooltip (si el valor es JSX, pasalo igual). */
  valorTexto?: string
  /** Clases para el valor, ej. "text-exito". */
  claseValor?: string
  /** Si el dato está mal: fondo pálido, borde y etiqueta en el color del tono. */
  tono?: TonoAviso
  className?: string
}

export function TarjetaDatoMini({ icono, etiqueta, valor, valorTexto, claseValor, tono, className }: TarjetaDatoMiniProps) {
  const t = tono ? CLASES_TONO[tono] : null
  return (
    // El borde transparente deja la tarjeta del mismo tamaño con y sin tono.
    <div className={cn('flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5', t ? [t.fondo, t.borde] : 'border-transparent bg-superficie-2', className)}>
      <span
        className={cn('flex size-9 shrink-0 items-center justify-center rounded-full border bg-bg-tarjeta', t ? [t.borde, t.icono] : 'border-borde-sutil text-texto-secundario')}
        aria-hidden="true"
      >
        {icono}
      </span>
      <div className="min-w-0">
        <p className={cn('text-[10px] font-semibold uppercase tracking-wide', t ? t.fuerte : 'text-texto-secundario')}>{etiqueta}</p>
        <p className={cn('truncate text-sm font-bold', t ? t.valor : 'text-texto-primario', claseValor)} title={valorTexto}>{valor}</p>
      </div>
    </div>
  )
}
