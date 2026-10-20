// =============================================================================
// Pastilla.tsx — Estado en una píldora: fondo suave + borde + texto del tono y,
// opcionalmente, un puntito sólido que refuerza el estado sin depender solo del
// color (daltonismo).
// =============================================================================

import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { CLASES_PASTILLA, type TonoPastilla } from './tonos.helpers'

interface PastillaProps {
  tono: TonoPastilla
  /** Muestra el puntito sólido a la izquierda. */
  conPunto?: boolean
  children: ReactNode
  className?: string
}

export function Pastilla({ tono, conPunto, children, className }: PastillaProps) {
  const clases = CLASES_PASTILLA[tono]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium',
        clases.pastilla,
        className,
      )}
    >
      {conPunto && <span className={cn('size-1.5 shrink-0 rounded-full', clases.punto)} aria-hidden="true" />}
      {children}
    </span>
  )
}
