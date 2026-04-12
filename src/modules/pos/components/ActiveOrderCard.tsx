import type { OrderWithItems } from '../hooks/useActiveOrders'

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'status--pending', emoji: '🕐' },
  en_preparacion: { label: 'En preparación', color: 'status--cooking', emoji: '👨‍🍳' },
  listo: { label: 'Listo ✓', color: 'status--ready', emoji: '🔔' },
  entregado: { label: 'Entregado', color: 'status--done', emoji: '✅' },
} as const

interface ActiveOrderCardProps {
  order: OrderWithItems
  updating: boolean
  onDeliver: (orderId: string) => void
}

export function ActiveOrderCard({ order, updating, onDeliver }: ActiveOrderCardProps) {
  const config = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG]
  const isReady = order.status === 'listo'

  // Calcular tiempo transcurrido
  const minutesAgo = Math.floor(
    (Date.now() - new Date(order.created_at).getTime()) / 60000
  )

  return (
    <div className={`active-order-card ${isReady ? 'active-order-card--ready' : ''}`}>
      {/* Header */}
      <div className="active-order-card__header">
        <div className="active-order-card__meta">
          <span className="active-order-card__number">#{order.order_number}</span>
          <span className="active-order-card__type">
            {order.type === 'local' ? '🍽️ Local' : '🛵 Delivery'}
          </span>
        </div>
        <div className="active-order-card__right">
          <span className={`status-badge ${config.color}`}>
            {config.emoji} {config.label}
          </span>
          <span className="active-order-card__time">{minutesAgo}min</span>
        </div>
      </div>

      {/* Items */}
      <ul className="active-order-card__items">
        {order.order_items.map((item) => (
          <li key={item.id} className="active-order-card__item">
            <span className="active-order-card__item-qty">{item.quantity}×</span>
            <span className="active-order-card__item-name">{item.product_name}</span>
          </li>
        ))}
      </ul>

      {/* Notas */}
      {order.notes && (
        <p className="active-order-card__notes">📝 {order.notes}</p>
      )}

      {/* Total */}
      <div className="active-order-card__footer">
        <span className="active-order-card__total">
          ${order.total.toLocaleString('es-AR')} · {order.payment_method}
        </span>

        {/* Solo cajero puede marcar entregado cuando está listo */}
        {isReady && (
          <button
            className="btn btn--success-solid active-order-card__deliver-btn"
            onClick={() => onDeliver(order.id)}
            disabled={updating}
          >
            {updating ? '...' : '✅ Entregar'}
          </button>
        )}
      </div>
    </div>
  )
}
