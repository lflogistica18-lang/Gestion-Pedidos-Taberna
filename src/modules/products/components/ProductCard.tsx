import type { Product } from '@/types/database.types'

interface ProductCardProps {
  product: Product
  onEdit: (product: Product) => void
  onToggle: (product: Product) => void
  toggling?: boolean
}

export function ProductCard({ product, onEdit, onToggle, toggling }: ProductCardProps) {
  return (
    <div className={`product-card ${!product.active ? 'product-card--inactive' : ''}`}>
      <div className="product-card__info">
        <div className="product-card__header">
          <span className="product-card__name">{product.name}</span>
        </div>
        <div className="product-card__price">
          ${product.price.toLocaleString('es-AR')}
        </div>
      </div>

      <div className="product-card__actions">
        {/* PROD-02: Editar */}
        <button
          className="btn btn--secondary product-card__btn"
          onClick={() => onEdit(product)}
          aria-label={`Editar ${product.name}`}
        >
          ✏️ Editar
        </button>

        {/* PROD-03 / PROD-05: Desactivar / Reactivar */}
        <button
          className={`btn product-card__btn ${product.active ? 'btn--danger-soft' : 'btn--success-soft'}`}
          onClick={() => onToggle(product)}
          disabled={toggling}
          aria-label={product.active ? `Desactivar ${product.name}` : `Reactivar ${product.name}`}
        >
          {toggling
            ? '...'
            : product.active
            ? '🚫 Desactivar'
            : '✅ Reactivar'}
        </button>
      </div>
    </div>
  )
}
