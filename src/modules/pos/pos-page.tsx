import { useState } from 'react'
import { useProducts } from '@/modules/products/hooks/useProducts'
import { useCartStore } from './store/useCartStore'
import { useCreateOrder } from './hooks/useCreateOrder'
import { ProductGrid } from './components/ProductGrid'
import { CartPanel } from './components/CartPanel'

type Category = 'comida' | 'bebida' | 'postre'

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'comida', label: 'Comida', emoji: '🍔' },
  { value: 'bebida', label: 'Bebida', emoji: '🥤' },
  { value: 'postre', label: 'Postre', emoji: '🍰' },
]

export default function PosPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('comida')
  const [cartOpen, setCartOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { products, loading } = useProducts({ activeOnly: true })
  const { submitting, error, createOrder } = useCreateOrder()

  const items = useCartStore((s) => s.items)
  const orderType = useCartStore((s) => s.orderType)
  const paymentMethod = useCartStore((s) => s.paymentMethod)
  const notes = useCartStore((s) => s.notes)
  const getTotal = useCartStore((s) => s.getTotal)
  const getItemCount = useCartStore((s) => s.getItemCount)
  const clearCart = useCartStore((s) => s.clearCart)

  const filteredProducts = products.filter(
    (p) => p.category === activeCategory
  )

  const handleConfirm = async () => {
    const orderNumber = await createOrder({
      items,
      orderType,
      paymentMethod,
      notes,
      total: getTotal(),
    })

    if (orderNumber) {
      clearCart()
      setCartOpen(false)
      setSuccessMsg(`✅ Pedido #${orderNumber} creado`)
      setTimeout(() => setSuccessMsg(null), 3500)
    }
  }

  const itemCount = getItemCount()

  return (
    <div className="pos-page">
      {/* Éxito toast */}
      {successMsg && (
        <div className="pos-toast" role="alert">
          {successMsg}
        </div>
      )}

      {/* Header */}
      <header className="pos-header">
        <h1 className="pos-header__title">Caja</h1>
        {itemCount > 0 && (
          <span className="pos-header__badge">{itemCount} ítem{itemCount !== 1 ? 's' : ''}</span>
        )}
      </header>

      {/* Category tabs */}
      <div className="pos-tabs" role="tablist">
        {CATEGORIES.map(({ value, label, emoji }) => (
          <button
            key={value}
            role="tab"
            aria-selected={activeCategory === value}
            className={`pos-tab ${activeCategory === value ? 'pos-tab--active' : ''}`}
            onClick={() => setActiveCategory(value)}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="pos-products">
        <ProductGrid products={filteredProducts} loading={loading} />
      </div>

      {/* Cart FAB / bar — POS-01, POS-07 */}
      {itemCount > 0 && (
        <button
          id="btn-ver-carrito"
          className="pos-cart-bar"
          onClick={() => setCartOpen(true)}
          aria-label={`Ver carrito: ${itemCount} ítems, total $${getTotal().toLocaleString('es-AR')}`}
        >
          <span className="pos-cart-bar__count">
            🛒 {itemCount} ítem{itemCount !== 1 ? 's' : ''}
          </span>
          <span className="pos-cart-bar__total">
            ${getTotal().toLocaleString('es-AR')} →
          </span>
        </button>
      )}

      {/* Cart Panel — POS-02, POS-03, POS-04, POS-05, POS-06 */}
      <CartPanel
        open={cartOpen}
        submitting={submitting}
        error={error}
        onConfirm={handleConfirm}
        onClose={() => setCartOpen(false)}
      />
    </div>
  )
}
