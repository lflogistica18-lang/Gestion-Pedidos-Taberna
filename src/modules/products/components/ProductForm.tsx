import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductFormData } from '../hooks/useUpsertProduct'
import type { Product } from '@/types/database.types'

const CATEGORIES = [
  { value: 'comida', label: 'Comida', emoji: '🍔' },
  { value: 'bebida', label: 'Bebida', emoji: '🥤' },
  { value: 'postre', label: 'Postre', emoji: '🍰' },
] as const

interface ProductFormProps {
  product?: Product | null  // null = crear, product = editar
  saving: boolean
  onSubmit: (data: ProductFormData) => void
  onCancel: () => void
}

export function ProductForm({ product, saving, onSubmit, onCancel }: ProductFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? { name: product.name, category: product.category, price: product.price }
      : { name: '', category: 'comida', price: 0 },
  })

  // Cuando cambia el producto (abrir modal de edición distinto), resetear el form
  useEffect(() => {
    reset(
      product
        ? { name: product.name, category: product.category, price: product.price }
        : { name: '', category: 'comida', price: 0 }
    )
  }, [product, reset])

  return (
    <form className="product-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Nombre */}
      <div className="product-form__field">
        <label className="product-form__label" htmlFor="product-name">
          Nombre del producto
        </label>
        <input
          id="product-name"
          type="text"
          className={`product-form__input ${errors.name ? 'product-form__input--error' : ''}`}
          placeholder="Ej: Hamburguesa Clásica"
          autoFocus
          {...register('name')}
        />
        {errors.name && (
          <span className="product-form__error">{errors.name.message}</span>
        )}
      </div>

      {/* Categoría */}
      <div className="product-form__field">
        <label className="product-form__label">Categoría</label>
        <div className="product-form__category-group">
          {CATEGORIES.map(({ value, label, emoji }) => (
            <label key={value} className="product-form__category-option">
              <input
                type="radio"
                value={value}
                className="product-form__radio"
                {...register('category')}
              />
              <span className="product-form__category-btn">
                <span>{emoji}</span>
                <span>{label}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.category && (
          <span className="product-form__error">{errors.category.message}</span>
        )}
      </div>

      {/* Precio */}
      <div className="product-form__field">
        <label className="product-form__label" htmlFor="product-price">
          Precio ($)
        </label>
        <input
          id="product-price"
          type="number"
          inputMode="decimal"
          className={`product-form__input ${errors.price ? 'product-form__input--error' : ''}`}
          placeholder="0"
          step="50"
          min="0"
          {...register('price', { valueAsNumber: true })}
        />
        {errors.price && (
          <span className="product-form__error">{errors.price.message}</span>
        )}
      </div>

      {/* Acciones */}
      <div className="product-form__actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="btn btn--primary"
          disabled={saving}
        >
          {saving ? 'Guardando...' : product ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    </form>
  )
}
