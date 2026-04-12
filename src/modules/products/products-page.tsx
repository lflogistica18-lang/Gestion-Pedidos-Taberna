import { useState } from 'react'
import { useProducts } from './hooks/useProducts'
import { useUpsertProduct, useToggleProduct } from './hooks/useUpsertProduct'
import { ProductCard } from './components/ProductCard'
import { ProductModal } from './components/ProductModal'
import type { Product } from '@/types/database.types'
import type { ProductFormData } from './hooks/useUpsertProduct'

type Tab = 'activos' | 'inactivos'

const CATEGORY_ORDER = ['comida', 'bebida', 'postre'] as const
const CATEGORY_LABELS: Record<string, string> = {
  comida: '🍔 Comida',
  bebida: '🥤 Bebidas',
  postre: '🍰 Postres',
}

export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>('activos')
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { products, loading, error, refetch } = useProducts({
    activeOnly: tab === 'activos',
  })
  const { saving, upsert } = useUpsertProduct()
  const { toggle } = useToggleProduct()

  // Agrupar por categoría
  const grouped = CATEGORY_ORDER.reduce<Record<string, Product[]>>((acc, cat) => {
    const items = products.filter((p) => p.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  const handleOpenCreate = () => {
    setEditProduct(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (product: Product) => {
    setEditProduct(product)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditProduct(null)
  }

  const handleSubmit = async (data: ProductFormData) => {
    const result = await upsert(data, editProduct?.id)
    if (result) {
      handleCloseModal()
      refetch()
    }
  }

  const handleToggle = async (product: Product) => {
    setTogglingId(product.id)
    const ok = await toggle(product.id, !product.active)
    if (ok) refetch()
    setTogglingId(null)
  }

  return (
    <div className="products-page">
      {/* Header */}
      <header className="products-page__header">
        <h1 className="products-page__title">Productos</h1>
        <button
          id="btn-nuevo-producto"
          className="btn btn--primary"
          onClick={handleOpenCreate}
        >
          ➕ Nuevo
        </button>
      </header>

      {/* Tabs PROD-04 */}
      <div className="products-page__tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'activos'}
          className={`products-page__tab ${tab === 'activos' ? 'products-page__tab--active' : ''}`}
          onClick={() => setTab('activos')}
        >
          Activos ({tab === 'activos' ? products.length : '...'})
        </button>
        <button
          role="tab"
          aria-selected={tab === 'inactivos'}
          className={`products-page__tab ${tab === 'inactivos' ? 'products-page__tab--active' : ''}`}
          onClick={() => setTab('inactivos')}
        >
          Desactivados ({tab === 'inactivos' ? products.length : '...'})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="products-page__loading">
          <div className="spinner" aria-label="Cargando" />
          <p>Cargando productos...</p>
        </div>
      ) : error ? (
        <div className="products-page__error">
          <span>⚠️</span>
          <p>Error al cargar: {error}</p>
          <button className="btn btn--secondary" onClick={refetch}>
            Reintentar
          </button>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="products-page__empty">
          <span className="products-page__empty-icon">
            {tab === 'activos' ? '📦' : '🗄️'}
          </span>
          <p>
            {tab === 'activos'
              ? 'No hay productos activos. ¡Creá el primero!'
              : 'No hay productos desactivados.'}
          </p>
          {tab === 'activos' && (
            <button className="btn btn--primary" onClick={handleOpenCreate}>
              Crear producto
            </button>
          )}
        </div>
      ) : (
        <div className="products-page__list">
          {CATEGORY_ORDER.filter((cat) => grouped[cat]).map((cat) => (
            <section key={cat} className="products-page__category">
              <h2 className="products-page__category-title">
                {CATEGORY_LABELS[cat]}
                <span className="products-page__category-count">
                  {grouped[cat].length}
                </span>
              </h2>
              <div className="products-page__cards">
                {grouped[cat].map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={handleOpenEdit}
                    onToggle={handleToggle}
                    toggling={togglingId === product.id}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Modal */}
      <ProductModal
        open={modalOpen}
        product={editProduct}
        saving={saving}
        onSubmit={handleSubmit}
        onClose={handleCloseModal}
      />
    </div>
  )
}
