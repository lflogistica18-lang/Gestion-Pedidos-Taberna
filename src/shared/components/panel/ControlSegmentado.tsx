// =============================================================================
// ControlSegmentado.tsx — Grupo de opciones excluyentes con aspecto de panel.
// Solo para elegir un período (Hoy / Ayer / 7 días / 30 días).
// =============================================================================

import { cn } from '@/shared/lib/cn'

export interface OpcionSegmentada<T extends string> {
  value: T
  label: string
}

interface ControlSegmentadoProps<T extends string> {
  opciones: OpcionSegmentada<T>[]
  /** Valor activo; si no coincide con ninguna opción, ninguna se marca. */
  value: T | ''
  onChange: (value: T) => void
  /** Qué se está eligiendo, para lectores de pantalla. */
  etiqueta: string
  /** `acento`: la opción elegida va en naranja sólido y las otras con borde marcado (para pantallas donde tiene que notarse cuál está elegida). */
  tono?: 'neutro' | 'acento'
  className?: string
}

export function ControlSegmentado<T extends string>({ opciones, value, onChange, etiqueta, tono = 'neutro', className }: ControlSegmentadoProps<T>) {
  const acento = tono === 'acento'
  return (
    <div
      role="group"
      aria-label={etiqueta}
      className={cn(
        'inline-flex max-w-full overflow-x-auto',
        acento ? 'gap-2' : 'gap-0.5 rounded-lg border border-borde-sutil bg-bg-principal p-0.5',
        className,
      )}
    >
      {opciones.map((o) => {
        const activa = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={activa}
            onClick={() => onChange(o.value)}
            className={cn(
              'min-h-11 shrink-0 rounded-md px-3 py-1 text-xs font-medium transition-colors sm:min-h-8',
              acento
                ? activa
                  ? 'rounded-lg border-2 border-acento-primario bg-acento-primario font-bold text-sobre-acento shadow-tarjeta'
                  : 'rounded-lg border-2 border-borde-campo bg-bg-tarjeta font-semibold text-texto-primario hover:border-acento-primario'
                : activa
                  ? 'bg-bg-tarjeta font-semibold text-texto-primario shadow-tarjeta'
                  : 'text-texto-secundario hover:text-texto-primario',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
