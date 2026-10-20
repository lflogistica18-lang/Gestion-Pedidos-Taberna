// =============================================================================
// FiltrosPastilla.tsx — Fila de pastillas con contador ("Todos 173", "Activos 41")
//
// Opciones excluyentes: la activa va en naranja lleno, las demás en blanco con
// borde. Una opción con `tono` (alertas) se ve pálida con texto fuerte del tono
// y, cuando está activa, con relleno completo. Si no entran en una fila, bajan a
// la siguiente: nada se esconde al costado. Los contadores los calcula quien lo
// usa (de la lista completa, no de la filtrada).
// =============================================================================

import { cn } from '@/shared/lib/cn'

export type TonoFiltro = 'rojo' | 'ambar' | 'amarillo' | 'naranja' | 'verde'

// Clases completas y estáticas. Inactiva = fondo pálido y texto fuerte; activa = relleno completo.
const CLASES_TONO: Record<TonoFiltro, { inactiva: string; activa: string; cantidadInactiva: string }> = {
  rojo: { inactiva: 'border-tono-rojo-borde bg-tono-rojo-fondo text-tono-rojo-texto hover:brightness-95', activa: 'border-tono-rojo-solido bg-tono-rojo-solido text-sobre-acento', cantidadInactiva: 'text-tono-rojo-texto' },
  ambar: { inactiva: 'border-tono-ambar-borde bg-tono-ambar-fondo text-tono-ambar-texto hover:brightness-95', activa: 'border-tono-ambar-solido bg-tono-ambar-solido text-sobre-acento', cantidadInactiva: 'text-tono-ambar-texto' },
  amarillo: { inactiva: 'border-tono-amarillo-borde bg-tono-amarillo-fondo text-tono-amarillo-texto hover:brightness-95', activa: 'border-tono-amarillo-solido bg-tono-amarillo-solido text-sobre-acento', cantidadInactiva: 'text-tono-amarillo-texto' },
  naranja: { inactiva: 'border-tono-naranja-borde bg-tono-naranja-fondo text-tono-naranja-texto hover:brightness-95', activa: 'border-tono-naranja-solido bg-tono-naranja-solido text-sobre-acento', cantidadInactiva: 'text-tono-naranja-texto' },
  verde: { inactiva: 'border-tono-verde-borde bg-tono-verde-fondo text-tono-verde-texto hover:brightness-95', activa: 'border-tono-verde-solido bg-tono-verde-solido text-sobre-acento', cantidadInactiva: 'text-tono-verde-texto' },
}

export interface OpcionPastilla<T extends string> {
  value: T
  label: string
  /** Color de estado de la pastilla (alertas). Sin tono: neutra, y naranja cuando está activa. */
  tono?: TonoFiltro
  /** Número que va pegado al texto. Sin él, la pastilla no lleva contador. */
  cantidad?: number
}

interface FiltrosPastillaProps<T extends string> {
  opciones: OpcionPastilla<T>[]
  /** Valor activo; si no coincide con ninguna opción, ninguna se marca. */
  value: T | ''
  onChange: (value: T) => void
  /** Qué se está filtrando, para lectores de pantalla. */
  etiqueta?: string
  className?: string
  /** En celu esconde los contadores para que entren en menos líneas (aparecen desde sm). */
  contadorDesdeSm?: boolean
}

export function FiltrosPastilla<T extends string>({ opciones, value, onChange, etiqueta = 'Filtros', className, contadorDesdeSm }: FiltrosPastillaProps<T>) {
  return (
    <div
      role="group"
      aria-label={etiqueta}
      className={cn('flex max-w-full flex-wrap gap-1.5 sm:gap-2', className)}
    >
      {opciones.map((o) => {
        const activa = o.value === value
        const tono = o.tono ? CLASES_TONO[o.tono] : null
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={activa}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[13px] font-medium transition-colors sm:min-h-9 sm:gap-2 sm:px-3.5 sm:text-sm',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento-primario',
              tono
                ? activa ? tono.activa : tono.inactiva
                : activa
                  ? 'border-acento-primario bg-acento-primario text-sobre-acento'
                  : 'border-borde-sutil bg-bg-tarjeta text-texto-primario hover:bg-bg-principal',
            )}
          >
            {o.label}
            {o.cantidad != null && (
              <span className={cn('font-semibold tabular-nums', contadorDesdeSm && 'hidden sm:inline', activa ? 'text-sobre-acento/80' : tono ? tono.cantidadInactiva : 'text-texto-secundario')}>
                {o.cantidad}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
