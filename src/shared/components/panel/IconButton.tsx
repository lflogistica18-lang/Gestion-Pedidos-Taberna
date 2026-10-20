import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

type Variante = 'neutro' | 'peligro' | 'primario'

const VARIANTES: Record<Variante, string> = {
  neutro: 'text-texto-secundario hover:bg-superficie-2 hover:text-texto-primario',
  peligro: 'text-texto-secundario hover:bg-tono-rojo-fondo hover:text-tono-rojo-texto',
  primario: 'text-texto-secundario hover:bg-tono-naranja-fondo hover:text-tono-naranja-texto',
}

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'title' | 'children'> {
  /** Texto accesible: va a aria-label y a title. */
  etiqueta: string
  variante?: Variante
  /** En filas densas de escritorio baja a 36 px desde md; en celu sigue en 44. */
  compacto?: boolean
  /** Ícono (o contenido corto). El ícono puede ser chico: el área de toque la pone el botón. */
  children: ReactNode
}

/** Botón de solo ícono con área de toque mínima de 44×44 px. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { etiqueta, variante = 'neutro', compacto, className, type = 'button', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={etiqueta}
      title={etiqueta}
      className={cn(
        'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento-primario',
        'disabled:cursor-not-allowed disabled:opacity-40',
        compacto && 'md:min-h-9 md:min-w-9',
        VARIANTES[variante],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})
