import { Minus, Plus } from 'lucide-react'
import { IconButton } from '@/shared/components/panel'
import { cn } from '@/shared/lib/cn'

interface ControlCantidadProps {
  nombre: string
  cantidad: number
  onRestar: () => void
  onSumar: () => void
  className?: string
}

/** − cantidad +, con toques de 44 px. Se usa en la tarjeta de producto y en el carrito. */
export function ControlCantidad({ nombre, cantidad, onRestar, onSumar, className }: ControlCantidadProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <IconButton
        etiqueta={`Quitar uno de ${nombre}`}
        onClick={onRestar}
        className="border border-borde-sutil"
      >
        <Minus size={18} />
      </IconButton>
      <span className="min-w-8 text-center text-base font-semibold tabular-nums text-texto-primario" aria-live="polite">
        {cantidad}
      </span>
      <IconButton
        etiqueta={`Agregar uno de ${nombre}`}
        variante="primario"
        onClick={onSumar}
        className="border border-acento-primario/40 text-acento-primario"
      >
        <Plus size={18} />
      </IconButton>
    </div>
  )
}
