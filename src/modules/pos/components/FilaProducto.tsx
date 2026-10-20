import type { Product } from '@/types/database.types'
import { fmtMonto } from '@/shared/components/panel'
import { cn } from '@/shared/lib/cn'
import { ControlCantidad } from './ControlCantidad'
import { BotonSumar } from './BotonSumar'

interface FilaProductoProps {
  product: Product
  cantidad: number
  onAgregar: () => void
  onRestar: () => void
}

/** Una fila fina de la lista de Pedido +: nombre y precio a la izquierda, contador a la derecha. */
export function FilaProducto({ product, cantidad, onAgregar, onRestar }: FilaProductoProps) {
  const enCarrito = cantidad > 0
  return (
    <li
      className={cn(
        'flex min-h-12 items-center gap-2 border-l-4 py-0.5 pl-3 pr-2 transition-colors',
        enCarrito ? 'border-acento-primario bg-tono-naranja-fondo' : 'border-transparent',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 break-words text-sm font-semibold leading-tight text-texto-primario">{product.name}</p>
        <p className="text-xs tabular-nums text-texto-secundario">{fmtMonto(product.price)}</p>
      </div>
      {enCarrito ? (
        <ControlCantidad nombre={product.name} cantidad={cantidad} onRestar={onRestar} onSumar={onAgregar} className="shrink-0" />
      ) : (
        <BotonSumar nombre={product.name} onClick={onAgregar} />
      )}
    </li>
  )
}
