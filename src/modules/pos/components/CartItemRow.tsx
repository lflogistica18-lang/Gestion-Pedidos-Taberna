import { useCartStore } from '../store/useCartStore'
import type { CartItem } from '../store/useCartStore'

interface CartItemRowProps {
  item: CartItem
}

export function CartItemRow({ item }: CartItemRowProps) {
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)

  return (
    <div className="cart-item">
      <div className="cart-item__info">
        <span className="cart-item__name">{item.productName}</span>
        <span className="cart-item__price">
          ${(item.unitPrice * item.quantity).toLocaleString('es-AR')}
        </span>
      </div>
      <div className="cart-item__controls">
        <button
          className="cart-item__btn"
          onClick={() => updateQuantity(item.productId, -1)}
          aria-label={`Quitar uno de ${item.productName}`}
        >
          −
        </button>
        <span className="cart-item__qty">{item.quantity}</span>
        <button
          className="cart-item__btn"
          onClick={() => updateQuantity(item.productId, +1)}
          aria-label={`Agregar uno de ${item.productName}`}
        >
          +
        </button>
        <button
          className="cart-item__remove"
          onClick={() => removeItem(item.productId)}
          aria-label={`Eliminar ${item.productName} del carrito`}
        >
          🗑
        </button>
      </div>
    </div>
  )
}
