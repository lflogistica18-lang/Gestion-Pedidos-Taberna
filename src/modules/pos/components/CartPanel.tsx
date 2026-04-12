import { useCartStore } from '../store/useCartStore'
import { CartItemRow } from './CartItemRow'
import type { OrderType, PaymentMethod } from '@/types/database.types'

const ORDER_TYPES: { value: OrderType; label: string; emoji: string }[] = [
  { value: 'local', label: 'Local', emoji: '🍽️' },
  { value: 'delivery', label: 'Delivery', emoji: '🛵' },
]

const PAYMENT_METHODS: { value: PaymentMethod; label: string; emoji: string }[] = [
  { value: 'efectivo', label: 'Efectivo', emoji: '💵' },
  { value: 'debito', label: 'Débito', emoji: '💳' },
  { value: 'transferencia', label: 'Transfer', emoji: '📲' },
]

interface CartPanelProps {
  open: boolean
  submitting: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

export function CartPanel({ open, submitting, error, onConfirm, onClose }: CartPanelProps) {
  const items = useCartStore((s) => s.items)
  const orderType = useCartStore((s) => s.orderType)
  const paymentMethod = useCartStore((s) => s.paymentMethod)
  const notes = useCartStore((s) => s.notes)
  const customerName = useCartStore((s) => s.customerName)
  const deliveryAddress = useCartStore((s) => s.deliveryAddress)
  const getTotal = useCartStore((s) => s.getTotal)
  const clearCart = useCartStore((s) => s.clearCart)
  const setOrderType = useCartStore((s) => s.setOrderType)
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod)
  const setNotes = useCartStore((s) => s.setNotes)
  const setCustomerName = useCartStore((s) => s.setCustomerName)
  const setDeliveryAddress = useCartStore((s) => s.setDeliveryAddress)

  if (!open) return null

  const isDelivery = orderType === 'delivery'

  return (
    <div
      className="cart-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Carrito de pedido"
    >
      <div className="cart-panel">
        {/* Header */}
        <div className="cart-panel__header">
          <button className="cart-panel__drag-handle" onClick={onClose} aria-label="Cerrar" />
          <h2 className="cart-panel__title">🛒 Pedido</h2>
          <button
            className="cart-panel__clear"
            onClick={clearCart}
            disabled={items.length === 0}
          >
            Limpiar
          </button>
        </div>

        <div className="cart-panel__body">
          {/* Items */}
          {items.length === 0 ? (
            <div className="cart-panel__empty">
              <span>🛒</span>
              <p>El carrito está vacío</p>
            </div>
          ) : (
            <div className="cart-panel__items">
              {items.map((item) => (
                <CartItemRow key={item.productId} item={item} />
              ))}
            </div>
          )}

          {/* Tipo de pedido — POS-03 */}
          <div className="cart-section">
            <p className="cart-section__label">Tipo de pedido</p>
            <div className="cart-section__options">
              {ORDER_TYPES.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  className={`cart-option-btn ${orderType === value ? 'cart-option-btn--active' : ''}`}
                  onClick={() => setOrderType(value)}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre del cliente */}
          <div className="cart-section">
            <p className="cart-section__label">
              Nombre del cliente {isDelivery && <span className="cart-section__required">*</span>}
            </p>
            <input
              type="text"
              className="cart-input"
              placeholder="Ej: Juan García"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Dirección de entrega — solo si es delivery */}
          {isDelivery && (
            <div className="cart-section">
              <p className="cart-section__label">
                Dirección de entrega <span className="cart-section__required">*</span>
              </p>
              <input
                type="text"
                className="cart-input"
                placeholder="Ej: Av. Corrientes 1234, 3° B"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                autoComplete="street-address"
              />
            </div>
          )}

          {/* Método de pago — POS-04 */}
          <div className="cart-section">
            <p className="cart-section__label">Método de pago</p>
            <div className="cart-section__options">
              {PAYMENT_METHODS.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  className={`cart-option-btn ${paymentMethod === value ? 'cart-option-btn--active' : ''}`}
                  onClick={() => setPaymentMethod(value)}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Observaciones */}
          <div className="cart-section">
            <p className="cart-section__label">Observaciones (opcional)</p>
            <textarea
              className="cart-notes"
              placeholder={isDelivery ? 'Ej: sin cebollas, timbre roto...' : 'Ej: sin cebollas, mesa 5...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* Footer — POS-07 */}
        <div className="cart-panel__footer">
          {error && <p className="cart-panel__error">⚠️ {error}</p>}
          <div className="cart-panel__total">
            <span>Total</span>
            <span className="cart-panel__total-amount">
              ${getTotal().toLocaleString('es-AR')}
            </span>
          </div>
          <button
            id="btn-confirmar-pedido"
            className="btn btn--primary btn--confirm"
            onClick={onConfirm}
            disabled={submitting || items.length === 0}
          >
            {submitting ? '⏳ Procesando...' : '✅ Confirmar pedido'}
          </button>
        </div>
      </div>
    </div>
  )
}
