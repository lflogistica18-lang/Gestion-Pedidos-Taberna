import type { Product } from '@/types/database.types'
import { fmtMonto } from '@/shared/components/panel'
import { cn } from '@/shared/lib/cn'
import { ControlCantidad } from './ControlCantidad'

interface TarjetaProductoProps {
  product: Product
  cantidad: number
  onAgregar: () => void
  onRestar: () => void
}

export function TarjetaProducto({ product, cantidad, onAgregar, onRestar }: TarjetaProductoProps) {
  const enCarrito = cantidad > 0
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border bg-bg-tarjeta shadow-tarjeta transition-colors',
        enCarrito ? 'border-acento-primario ring-1 ring-acento-primario' : 'border-borde-sutil',
      )}
    >
      <button
        type="button"
        onClick={onAgregar}
        aria-label={`Agregar ${product.name}`}
        className="flex min-h-24 flex-1 flex-col items-start justify-between gap-2 p-3 text-left transition-colors hover:bg-bg-principal active:bg-superficie-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-acento-primario"
      >
        <span className="line-clamp-2 break-words text-sm font-semibold leading-snug text-texto-primario">
          {product.name}
        </span>
        <span className="text-xl font-bold tabular-nums text-texto-primario">{fmtMonto(product.price)}</span>
      </button>
      {enCarrito && (
        <div className="flex justify-center border-t border-borde-sutil px-2 py-1.5">
          <ControlCantidad nombre={product.name} cantidad={cantidad} onRestar={onRestar} onSumar={onAgregar} />
        </div>
      )}
    </div>
  )
}
