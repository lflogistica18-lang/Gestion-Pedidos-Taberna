import type { Product } from '@/types/database.types'
import type { ProductFormData } from '../hooks/useUpsertProduct'
import { ProductForm } from './ProductForm'

interface ProductModalProps {
  open: boolean
  product: Product | null  // null = crear
  saving: boolean
  onSubmit: (data: ProductFormData) => void
  onClose: () => void
}

export function ProductModal({ open, product, saving, onSubmit, onClose }: ProductModalProps) {
  if (!open) return null

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={product ? 'Editar producto' : 'Nuevo producto'}
    >
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title">
            {product ? '✏️ Editar producto' : '➕ Nuevo producto'}
          </h2>
          <button
            className="modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="modal__body">
          <ProductForm
            product={product}
            saving={saving}
            onSubmit={onSubmit}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  )
}
