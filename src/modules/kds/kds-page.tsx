import { useKdsOrders } from './hooks/useKdsOrders'
import { KdsOrderCard } from './components/KdsOrderCard'
import { EstadoCargando } from '@/shared/components/comunes/EstadoCargando'

export default function KdsPage() {
  const { orders, loading } = useKdsOrders()

  const pending = orders.filter(o => o.status === 'pendiente')
  const cooking = orders.filter(o => o.status === 'en_preparacion')

  return (
    <div className="kds-page">
      <header className="pos-header">
        <h1 className="pos-header__title">👨‍🍳 KDS - Cocina</h1>
        <div className="kds-stats">
          <span className="status-badge status--pending" style={{ fontSize: '0.85rem' }}>{pending.length} Pendientes</span>
          <span className="status-badge status--cooking" style={{ fontSize: '0.85rem' }}>{cooking.length} En preparación</span>
        </div>
      </header>

      {loading ? (
        <EstadoCargando mensaje="Cargando comandas..." />
      ) : (
        <div className="kds-board">
          {/* Pendientes */}
          <section className="kds-column">
            <h2 className="kds-column__title kds-column__title--pending">
              🕐 Entrantes ({pending.length})
            </h2>
            <div className="kds-column__list">
              {pending.map(order => (
                <KdsOrderCard key={order.id} order={order} />
              ))}
              {pending.length === 0 && (
                <div className="kds-empty">
                  <span>👍</span>
                  <p>Sin pedidos entrantes</p>
                </div>
              )}
            </div>
          </section>

          {/* En Preparacion */}
          <section className="kds-column">
            <h2 className="kds-column__title kds-column__title--cooking">
              👨‍🍳 En Preparación ({cooking.length})
            </h2>
            <div className="kds-column__list kds-column__list--cooking">
              {cooking.map(order => (
                <KdsOrderCard key={order.id} order={order} />
              ))}
              {cooking.length === 0 && (
                <div className="kds-empty">
                  <span>🍳</span>
                  <p>Nada cocinándose</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
