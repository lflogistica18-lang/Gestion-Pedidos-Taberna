import { useId } from 'react'
import { cn } from '@/shared/lib/cn'

interface InterruptorProps {
  etiqueta: string
  detalle?: string
  activo: boolean
  onChange: (activo: boolean) => void
  deshabilitado?: boolean
}

// Interruptor accesible: toda la fila es el botón (role="switch"), 44 px de alto como mínimo.
export function Interruptor({ etiqueta, detalle, activo, onChange, deshabilitado }: InterruptorProps) {
  const id = useId()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-labelledby={`${id}-e`}
      aria-describedby={detalle ? `${id}-d` : undefined}
      disabled={deshabilitado}
      onClick={() => onChange(!activo)}
      className={cn(
        'flex min-h-11 w-full items-center justify-between gap-4 rounded-lg border border-borde-sutil px-3 py-2.5 text-left transition-colors',
        'hover:bg-bg-principal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento-primario',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent',
      )}
    >
      <span className="min-w-0">
        <span id={`${id}-e`} className="block text-sm font-medium text-texto-primario">{etiqueta}</span>
        {detalle && <span id={`${id}-d`} className="mt-0.5 block text-xs text-texto-secundario">{detalle}</span>}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
          activo ? 'border-acento-primario bg-acento-primario' : 'border-borde-campo bg-superficie-2',
        )}
      >
        <span className={cn('size-5 rounded-full bg-bg-tarjeta shadow-tarjeta transition-transform', activo ? 'translate-x-5' : 'translate-x-0.5')} />
      </span>
    </button>
  )
}
