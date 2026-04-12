import { useState } from 'react'
import { useProducts } from '@/modules/products/hooks/useProducts'
import { useCartStore } from './store/useCartStore'
import { useCreateOrder } from './hooks/useCreateOrder'
import { useActiveOrders } from './hooks/useActiveOrders'
import { ProductGrid } from './components/ProductGrid'
import { CartPanel } from './components/CartPanel'
import { ActiveOrdersPanel } from './components/ActiveOrdersPanel'

type Category = 'comida' | 'bebida' | 'postre'

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'comida', label: 'Comida', emoji: '🍔' },
  { value: 'bebida', label: 'Bebida', emoji: '🥤' },
  { value: 'postre', label: 'Postre', emoji: '🍰' },
]

export default function PosPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('comida')
  const [cartOpen, setCartOpen] = useState(false)
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { products, loading } = useProducts({ activeOnly: true })
  const { submitting, error, createOrder } = useCreateOrder()
  const { activeCount } = useActiveOrders()

  const items = useCartStore((s) => s.items)
  const orderType = useCartStore((s) => s.orderType)
  const paymentMethod = useCartStore((s) => s.paymentMethod)
  const notes = useCartStore((s) => s.notes)
  const getTotal = useCartStore((s) => s.getTotal)
  const getItemCount = useCartStore((s) => s.getItemCount)
  const clearCart = useCartStore((s) => s.clearCart)

  const filteredProducts = products.filter((p) => p.category === activeCategory)

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
      {/* Toast de éxito */}
      {successMsg && (
        <div className="pos-toast" role="alert">
          {successMsg}
        </div>
      )}

      {/* Header */}
      <header className="pos-header">
        <h1 className="pos-header__title">Caja</h1>
        <button
          id="btn-pedidos-activos"
          className={`pos-orders-btn ${activeCount > 0 ? 'pos-orders-btn--active' : ''}`}
          onClick={() => setOrdersOpen(true)}
          aria-label={`Ver pedidos activos: ${activeCount}`}
        >
          📋 Pedidos
          {activeCount > 0 && (
            <span className="pos-orders-btn__badge">{activeCount}</span>
          )}
        </button>
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

      {/* Cart floating bar */}
      {itemCount > 0 && (
        <button
          id="btn-ver-carrito"
          className="pos-cart-bar"
          onClick={() => setCartOpen(true)}
          aria-label={`Ver carrito: ${itemCount} ítems`}
        >
          <span className="pos-cart-bar__count">
            🛒 {itemCount} ítem{itemCount !== 1 ? 's' : ''}
          </span>
          <span className="pos-cart-bar__total">
            ${getTotal().toLocaleString('es-AR')} →
          </span>
        </button>
      )}

      {/* Cart Panel */}
      <CartPanel
        open={cartOpen}
        submitting={submitting}
        error={error}
        onConfirm={handleConfirm}
        onClose={() => setCartOpen(false)}
      />

      {/* Active Orders Panel */}
      <ActiveOrdersPanel
        open={ordersOpen}
        onClose={() => setOrdersOpen(false)}
      />
    </div>
  )
}
