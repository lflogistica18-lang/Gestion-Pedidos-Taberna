// =============================================================================
// Boton.tsx — Botón con texto (e ícono opcional) del estilo Panel
//
// Tres variantes: `primario` (naranja lleno, la acción principal de la pantalla),
// `contorneado` (blanco con borde, el resto) y `peligro` (rojo lleno, bajas y
// borrados). 44 px de alto en celu; desde sm baja a 40 (36 con `compacto`).
// Para botones de solo ícono: IconButton.
// =============================================================================

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

type VarianteBoton = 'primario' | 'contorneado' | 'peligro'

const VARIANTES: Record<VarianteBoton, string> = {
  primario: 'bg-acento-primario text-sobre-acento hover:bg-acento-hover',
  peligro: 'bg-tono-rojo-solido text-sobre-acento hover:brightness-95',
  contorneado: 'border border-borde-sutil bg-bg-tarjeta text-texto-primario hover:bg-bg-principal',
}

export interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton
  /** Versión más baja para barras de filtros densas (36 px desde sm). */
  compacto?: boolean
}

/** El ícono va como primer hijo (lucide size 16): el botón ya los separa con `gap`. */
export const Boton = forwardRef<HTMLButtonElement, BotonProps>(function Boton(
  { variante = 'contorneado', compacto, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento-primario',
        'disabled:cursor-not-allowed disabled:opacity-50',
        compacto ? 'sm:min-h-9' : 'sm:min-h-10',
        VARIANTES[variante],
        className,
      )}
      {...rest}
    />
  )
})
