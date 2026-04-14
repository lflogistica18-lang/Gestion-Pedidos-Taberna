import { useActiveOrders } from '../hooks/useActiveOrders'
import { useUpdateOrderStatus } from '../hooks/useUpdateOrderStatus'
import { ActiveOrderCard } from './ActiveOrderCard'

interface ActiveOrdersPanelProps {
  open: boolean
  onClose: () => void
}

const STATUS_ORDER = ['listo', 'en_preparacion', 'pendiente'] as const

export function ActiveOrdersPanel({ open, onClose }: ActiveOrdersPanelProps) {
  const { orders, loading } = useActiveOrders()
  const { updatingId, updateStatus, deleteOrder } = useUpdateOrderStatus()

  if (!open) return null

  const handleDeliver = async (orderId: string) => {
    await updateStatus(orderId, 'entregado')
  }

  const handleDelete = async (orderId: string) => {
    await deleteOrder(orderId)
  }

  // Agrupar por status en el orden correcto
  const grouped = STATUS_ORDER.reduce<Record<string, typeof orders>>((acc, status) => {
    const items = orders.filter((o) => o.status === status)
    if (items.length > 0) acc[status] = items
    return acc
  }, {})

  const STATUS_LABELS: Record<string, string> = {
    listo: '🔔 Listos para entregar',
    en_preparacion: '👨‍🍳 En preparación',
    pendiente: '🕐 Pendientes',
  }

  return (
    <div
      className="cart-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Pedidos activos"
    >
      <div className="cart-panel">
        {/* Header */}
        <div className="cart-panel__header">
          <button className="cart-panel__drag-handle" onClick={onClose} aria-label="Cerrar" />
          <h2 className="cart-panel__title">📋 Pedidos activos</h2>
          <span className="pos-header__badge">{orders.length}</span>
        </div>

        {/* Body */}
        <div className="cart-panel__body">
          {loading ? (
            <div className="cart-panel__empty">
              <div className="spinner" />
              <p>Cargando pedidos...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="cart-panel__empty">
              <span>🎉</span>
              <p>No hay pedidos activos</p>
            </div>
          ) : (
            <div className="active-orders-list">
              {grouped['listo'] && (
                <div className="active-orders-ready-banner">
                  <span>🔔</span>
                  <span>Listos para entregar</span>
                  <span className="active-orders-ready-banner__count">{grouped['listo'].length}</span>
                </div>
              )}
              {STATUS_ORDER.filter((s) => grouped[s]).map((status) => (
                <section key={status}>
                  <h3 className={`active-orders-section-title${status === 'listo' ? ' active-orders-section-title--ready' : ''}`}>
                    {STATUS_LABELS[status]}
                  </h3>
                  {grouped[status].map((order) => (
                    <ActiveOrderCard
                      key={order.id}
                      order={order}
                      updating={updatingId === order.id}
                      onDeliver={handleDeliver}
                      onDelete={handleDelete}
                    />
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
