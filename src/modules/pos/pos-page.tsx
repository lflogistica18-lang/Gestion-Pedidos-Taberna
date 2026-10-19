import { useState, useRef, useEffect } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Receipt } from './components/Receipt'
import type { OrderWithItems } from './hooks/useActiveOrders'
import { useProducts } from '@/modules/products/hooks/useProducts'
import { useCategories } from '@/modules/products/hooks/useCategories'
import { useCartStore } from './store/useCartStore'
import { useCreateOrder } from './hooks/useCreateOrder'
import { useActiveOrders } from './hooks/useActiveOrders'
import { ProductGrid } from './components/ProductGrid'
import { CartPanel } from './components/CartPanel'
import { ActiveOrdersPanel } from './components/ActiveOrdersPanel'
import { EstadoError } from '@/shared/components/comunes/EstadoError'
import { useEncolarImpresion } from './hooks/useEncolarImpresion'
import { MODO_IMPRESION } from '@/shared/lib/config'

export default function PosPage() {
  const [categoriaElegida, setCategoriaElegida] = useState<string>('')
  const [cartOpen, setCartOpen] = useState(false)
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Ticket para cocina: se imprime solo al confirmar cada pedido
  const [pedidoAImprimir, setPedidoAImprimir] = useState<OrderWithItems | null>(null)
  const ticketRef = useRef<HTMLDivElement>(null)
  const imprimirTicket = useReactToPrint({
    contentRef: ticketRef,
    documentTitle: pedidoAImprimir ? `Ticket_Pedido_${pedidoAImprimir.order_number}` : 'Ticket',
    onAfterPrint: () => setPedidoAImprimir(null),
  })

  // Se imprime recién cuando el ticket ya está montado en el DOM
  useEffect(() => {
    if (pedidoAImprimir) imprimirTicket()
  }, [pedidoAImprimir, imprimirTicket])

  const { categories } = useCategories()
  const { products, loading, error: productsError, refetch: refetchProducts } = useProducts({ activeOnly: true })
  const { submitting, error, createOrder } = useCreateOrder()
  const { encolar } = useEncolarImpresion()
  const {
    orders: activeOrders,
    loading: ordersLoading,
    error: ordersError,
    activeCount,
    refetch: refetchOrders,
  } = useActiveOrders()

  // Categoría activa derivada: si la elegida no existe (todavía no cargaron, o
  // la renombraron) cae a la primera. Derivarla evita un setState dentro de un effect.
  const activeCategory = categories.some(c => c.name === categoriaElegida)
    ? categoriaElegida
    : (categories[0]?.name ?? '')

  const items = useCartStore((s) => s.items)
  const orderType = useCartStore((s) => s.orderType)
  const paymentMethod = useCartStore((s) => s.paymentMethod)
  const notes = useCartStore((s) => s.notes)
  const customerName = useCartStore((s) => s.customerName)
  const deliveryAddress = useCartStore((s) => s.deliveryAddress)
  const getTotal = useCartStore((s) => s.getTotal)
  const getItemCount = useCartStore((s) => s.getItemCount)
  const clearCart = useCartStore((s) => s.clearCart)

  const filteredProducts = products.filter((p) => p.category === activeCategory)

  const handleConfirm = async () => {
    const pedido = await createOrder({
      items,
      orderType,
      paymentMethod,
      notes,
      customerName,
      deliveryAddress,
      total: getTotal(),
    })

    if (pedido) {
      clearCart()
      setCartOpen(false)

      if (MODO_IMPRESION === 'servidor') {
        // El pedido ya está guardado: si falla la cola, se avisa y se reimprime con 🖨️
        const { error: colaErr } = await encolar(pedido.id)
        setSuccessMsg(colaErr
          ? `⚠️ Pedido #${pedido.order_number} creado, pero no se mandó a imprimir: ${colaErr}. Reimprimí desde Pedidos.`
          : `✅ Pedido #${pedido.order_number} creado — enviado a la comandera`)
      } else {
        setPedidoAImprimir(pedido)
        setSuccessMsg(`✅ Pedido #${pedido.order_number} creado — imprimiendo ticket`)
      }
      setTimeout(() => setSuccessMsg(null), 3500)
    }
  }

  const itemCount = getItemCount()

  return (
    <div className="pos-page">
      {/* Ticket oculto — solo existe mientras se imprime */}
      {pedidoAImprimir && (
        <div style={{ display: 'none' }}>
          <Receipt ref={ticketRef} order={pedidoAImprimir} />
        </div>
      )}

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
        {ordersError && (
          <span role="alert" style={{ fontSize: '0.75rem', color: '#dc2626' }}>
            ⚠️ No se pudieron cargar los pedidos
          </span>
        )}
      </header>

      {/* Category tabs */}
      <div className="pos-tabs" role="tablist">
        {categories.map(({ name }) => (
          <button
            key={name}
            role="tab"
            aria-selected={activeCategory === name}
            className={`pos-tab ${activeCategory === name ? 'pos-tab--active' : ''}`}
            onClick={() => setCategoriaElegida(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="pos-products">
        {productsError ? (
          <EstadoError mensaje={productsError} onReintentar={refetchProducts} />
        ) : (
          <ProductGrid products={filteredProducts} loading={loading} />
        )}
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
        orders={activeOrders}
        loading={ordersLoading}
        error={ordersError}
        refetch={refetchOrders}
      />
    </div>
  )
}
