import type { Product } from '@/types/database.types'
import { useCartStore } from '../store/useCartStore'

interface ProductGridProps {
  products: Product[]
  loading: boolean
}

export function ProductGrid({ products, loading }: ProductGridProps) {
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const items = useCartStore((s) => s.items)

  const getQuantity = (productId: string) =>
    items.find((i) => i.productId === productId)?.quantity ?? 0

  if (loading) {
    return (
      <div className="pos-grid pos-grid--loading">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="pos-product-card pos-product-btn--skeleton" />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="pos-grid pos-grid--empty">
        <p>No hay productos en esta categoría</p>
      </div>
    )
  }

  return (
    <div className="pos-grid">
      {products.map((product) => {
        const qty = getQuantity(product.id)
        return (
          <div
            key={product.id}
            className={`pos-product-card ${qty > 0 ? 'pos-product-card--in-cart' : ''}`}
          >
            {/* Header naranja con nombre */}
            <button
              className="pos-product-card__header"
              onClick={() => addItem(product)}
              aria-label={`Agregar ${product.name}`}
            >
              <span className="pos-product-card__name">{product.name}</span>
            </button>

            {/* Footer: precio + controles qty */}
            <div className="pos-product-card__footer">
              <span className="pos-product-card__price">
                ${product.price.toLocaleString('es-AR')}
              </span>

              {/* Controles de cantidad — visibles cuando qty > 0 */}
              {qty > 0 && (
                <div className="pos-product-card__qty-ctrl">
                  <button
                    className="pos-product-card__qty-btn pos-product-card__qty-btn--minus"
                    onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, -1) }}
                    aria-label={`Quitar ${product.name}`}
                  >
                    −
                  </button>
                  <span className="pos-product-card__qty-num">{qty}</span>
                  <button
                    className="pos-product-card__qty-btn pos-product-card__qty-btn--plus"
                    onClick={(e) => { e.stopPropagation(); addItem(product) }}
                    aria-label={`Agregar ${product.name}`}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
