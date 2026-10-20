import { Trash2 } from 'lucide-react'
import { fmtMonto, IconButton } from '@/shared/components/panel'
import { useCartStore } from '../store/useCartStore'
import type { CartItem } from '../store/useCartStore'
import { ControlCantidad } from './ControlCantidad'

interface CartItemRowProps {
  item: CartItem
}

export function CartItemRow({ item }: CartItemRowProps) {
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)

  return (
    <li className="rounded-xl border border-borde-sutil bg-bg-principal p-3">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 break-words text-sm font-medium text-texto-primario">{item.productName}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-texto-primario">
          {fmtMonto(item.unitPrice * item.quantity)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <ControlCantidad
          nombre={item.productName}
          cantidad={item.quantity}
          onRestar={() => updateQuantity(item.productId, -1)}
          onSumar={() => updateQuantity(item.productId, +1)}
        />
        <IconButton
          etiqueta={`Eliminar ${item.productName} del carrito`}
          variante="peligro"
          onClick={() => removeItem(item.productId)}
        >
          <Trash2 size={18} />
        </IconButton>
      </div>
    </li>
  )
}
