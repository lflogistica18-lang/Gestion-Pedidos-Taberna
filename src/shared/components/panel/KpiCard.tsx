// =============================================================================
// KpiCard.tsx — Tarjeta de indicador: borde de color, ícono, número y pie libre
// =============================================================================

import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export type TonoKpi = 'naranja' | 'verde' | 'azul' | 'violeta'

// Clases completas y estáticas: Tailwind no ve las que se arman con template strings.
const CLASES_TONO: Record<TonoKpi, { borde: string; texto: string; circulo: string }> = {
  naranja: { borde: 'border-t-indicador-naranja', texto: 'text-indicador-naranja', circulo: 'bg-indicador-naranja/10' },
  verde: { borde: 'border-t-indicador-verde', texto: 'text-indicador-verde', circulo: 'bg-indicador-verde/10' },
  azul: { borde: 'border-t-indicador-azul', texto: 'text-indicador-azul', circulo: 'bg-indicador-azul/10' },
  violeta: { borde: 'border-t-indicador-violeta', texto: 'text-indicador-violeta', circulo: 'bg-indicador-violeta/10' },
}

interface KpiCardProps {
  tono: TonoKpi
  titulo: string
  icono: ReactNode
  /** El número grande. Puede llevar un <span> chico para el "/ total". */
  valor: ReactNode
  /** Texto plano del valor, para el tooltip cuando se corta. */
  valorTexto: string
  subtexto?: string
  loading?: boolean
  /** Pie de la tarjeta (sparkline o pastillas). Hereda el color del indicador. */
  children?: ReactNode
}

export function KpiCard({ tono, titulo, icono, valor, valorTexto, subtexto, loading, children }: KpiCardProps) {
  const t = CLASES_TONO[tono]
  return (
    <div className={cn('flex min-w-0 flex-col rounded-xl border border-borde-sutil border-t-[3px] bg-bg-tarjeta p-3 shadow-tarjeta sm:p-4', t.borde)}>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-xs font-medium text-texto-secundario sm:text-sm">{titulo}</span>
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', t.circulo, t.texto)} aria-hidden="true">
          {icono}
        </span>
      </div>

      {loading ? (
        <div className="mt-2 h-7 w-24 animate-pulse rounded bg-borde-sutil" />
      ) : (
        <p className="mt-1 break-words text-xl font-extrabold leading-tight tracking-tight text-texto-primario sm:text-2xl" title={valorTexto}>
          {valor}
        </p>
      )}
      {subtexto && <p className="mt-0.5 text-xs text-texto-secundario">{subtexto}</p>}

      {children && <div className={cn('mt-auto pt-3', t.texto)}>{children}</div>}
    </div>
  )
}
