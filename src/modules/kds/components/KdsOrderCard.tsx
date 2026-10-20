import { useState } from 'react'
import { useUpdateOrderStatus } from '@/modules/pos/hooks/useUpdateOrderStatus'
import type { KdsOrder } from '../hooks/useKdsOrders'
import { useMinutosDesde } from '@/shared/hooks/useMinutosDesde'

interface KdsOrderCardProps {
  order: KdsOrder
  onUpdated: () => void
}

export function KdsOrderCard({ order, onUpdated }: KdsOrderCardProps) {
  const [updating, setUpdating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const { updateStatus } = useUpdateOrderStatus()

  const minutesAgo = useMinutosDesde(order.created_at)

  const isPending = order.status === 'pendiente'

  const handleNext = async () => {
    if (updating) return
    setUpdating(true)
    setErrorMsg(null)
    const nextStatus = isPending ? 'en_preparacion' : 'listo'
    const { error } = await updateStatus(order.id, nextStatus)
    setUpdating(false)
    if (error) {
      setErrorMsg(error)
      return
    }
    onUpdated()
  }

  return (
    <div className={`kds-card ${isPending ? 'kds-card--pending' : 'kds-card--cooking'}`}>
      <div className="kds-card__header">
        <span className="kds-card__number">#{order.order_number}</span>
        <span className={`kds-card__time ${minutesAgo >= 15 ? 'kds-card__time--late' : ''}`}>
          {minutesAgo}m
        </span>
      </div>
      
      <div className="kds-card__type">
        {order.type === 'local' ? '🍽️ Local' : order.type === 'delivery' ? '🛵 Delivery' : '⚡ Directo'}
        {order.customer_name && <span style={{ marginLeft: '6px', fontSize: '0.8rem', opacity: 0.8 }}>— {order.customer_name}</span>}
      </div>

      <ul className="kds-card__items">
        {order.order_items.map(item => (
          <li key={item.id} className="kds-card__item">
            <span className="kds-card__qty">{item.quantity}×</span>
            <span className="kds-card__name">{item.product_name}</span>
          </li>
        ))}
      </ul>

      {order.notes && (
        <div className="kds-card__notes">
          📝 {order.notes}
        </div>
      )}

      <button
        className={`btn kds-card__btn ${isPending ? 'kds-card__btn--start' : 'kds-card__btn--finish'}`}
        onClick={handleNext}
        disabled={updating}
        style={{ cursor: updating ? 'not-allowed' : 'pointer', opacity: updating ? 0.7 : 1 }}
      >
        {updating ? '⏳ Actualizando...' : isPending ? '👨‍🍳 Empezar a cocinar' : '✅ ¡Listo para entregar!'}
      </button>

      {errorMsg && (
        <div className="kds-card__notes" role="alert">
          ⚠️ No se pudo actualizar: {errorMsg}
        </div>
      )}
    </div>
  )
}
