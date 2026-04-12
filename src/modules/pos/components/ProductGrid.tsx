import type { Product } from '@/types/database.types'
import { useCartStore } from '../store/useCartStore'

interface ProductGridProps {
  products: Product[]
  loading: boolean
}

export function ProductGrid({ products, loading }: ProductGridProps) {
  const addItem = useCartStore((s) => s.addItem)
  const items = useCartStore((s) => s.items)

  const getQuantity = (productId: string) =>
    items.find((i) => i.productId === productId)?.quantity ?? 0

  if (loading) {
    return (
      <div className="pos-grid pos-grid--loading">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="pos-product-btn pos-product-btn--skeleton" />
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
          <button
            key={product.id}
            className={`pos-product-btn ${qty > 0 ? 'pos-product-btn--in-cart' : ''}`}
            onClick={() => addItem(product)}
            aria-label={`Agregar ${product.name}, $${product.price.toLocaleString('es-AR')}`}
          >
            {qty > 0 && (
              <span className="pos-product-btn__badge">{qty}</span>
            )}
            <span className="pos-product-btn__name">{product.name}</span>
            <span className="pos-product-btn__price">
              ${product.price.toLocaleString('es-AR')}
            </span>
          </button>
        )
      })}
    </div>
  )
}
