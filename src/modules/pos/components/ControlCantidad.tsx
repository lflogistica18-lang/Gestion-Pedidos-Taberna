import { Minus, Plus } from 'lucide-react'
import { IconButton } from '@/shared/components/panel'
import { cn } from '@/shared/lib/cn'

interface ControlCantidadProps {
  nombre: string
  cantidad: number
  onRestar: () => void
  onSumar: () => void
  /** Cantidad dentro de un círculo naranja con el número blanco (para el pedido en curso). */
  destacada?: boolean
  className?: string
}

/** − cantidad +, con toques de 44 px (52 px desde md, para la tablet). Se usa en la tarjeta de producto y en el carrito. */
export function ControlCantidad({ nombre, cantidad, onRestar, onSumar, destacada = false, className }: ControlCantidadProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <IconButton
        etiqueta={`Quitar uno de ${nombre}`}
        onClick={onRestar}
        className="border border-borde-sutil md:min-h-13 md:min-w-13"
      >
        <Minus size={18} className="md:size-6" />
      </IconButton>
      <span
        className={cn(
          'text-center tabular-nums',
          destacada
            ? 'mx-1 flex size-11 items-center justify-center rounded-full bg-acento-primario text-xl font-extrabold text-sobre-acento md:size-13 md:text-2xl'
            : 'min-w-8 text-base font-semibold text-texto-primario md:min-w-10 md:text-xl',
        )}
        aria-live="polite"
      >
        {cantidad}
      </span>
      <IconButton
        etiqueta={`Agregar uno de ${nombre}`}
        variante="primario"
        onClick={onSumar}
        className="border border-acento-primario/40 text-acento-primario md:min-h-13 md:min-w-13"
      >
        <Plus size={18} className="md:size-6" />
      </IconButton>
    </div>
  )
}
