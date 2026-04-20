import { useState, useMemo } from 'react'
import { useAdminOrders } from './hooks/useAdminOrders'
import type { OrderConDetalle } from './hooks/useAdminOrders'
import { EstadoCargando } from '@/shared/components/comunes/EstadoCargando'
import { EstadoError } from '@/shared/components/comunes/EstadoError'

type Tab = 'historial' | 'papelera'

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatCurrency(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

function formatFechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// Badge visual de estado
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { clase: string; label: string }> = {
    pendiente: { clase: 'status--pending', label: '⏳ Pendiente' },
    en_preparacion: { clase: 'status--cooking', label: '🔥 Preparando' },
    listo: { clase: 'status--ready', label: '✅ Listo' },
    entregado: { clase: 'status--done', label: '📦 Entregado' },
    cancelado: { clase: 'status--done', label: '❌ Cancelado' },
  }
  const s = map[status] || { clase: '', label: status }
  return <span className={`status-badge ${s.clase}`}>{s.label}</span>
}

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>('historial')
  const { orders, loading, error, refetch, enviarAPapelera, restaurarDePapelera, eliminarPermanente } = useAdminOrders()

  // Filtros
  const todayStr = toDateStr(new Date())
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [busquedaCliente, setBusquedaCliente] = useState('')

  // Expandir detalle de pedido
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Separar activos de papelera
  const ordenesFiltradas = useMemo(() => {
    let filtered = orders.filter(o => tab === 'historial' ? !o.deleted_at : !!o.deleted_at)

    // Filtro por fecha
    if (dateFrom) {
      const from = new Date(dateFrom)
      from.setHours(0, 0, 0, 0)
      filtered = filtered.filter(o => new Date(o.created_at) >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      filtered = filtered.filter(o => new Date(o.created_at) <= to)
    }

    // Filtro por nombre de cliente
    if (busquedaCliente.trim()) {
      const q = busquedaCliente.toLowerCase()
      filtered = filtered.filter(o =>
        (o.customer_name || '').toLowerCase().includes(q) ||
        String(o.order_number).includes(q)
      )
    }

    return filtered
  }, [orders, tab, dateFrom, dateTo, busquedaCliente])

  // Enviar a papelera (soft delete)
  const handlePapelera = async (id: string) => {
    if (!window.confirm('¿Enviar este pedido a la papelera?')) return
    const result = await enviarAPapelera(id)
    if (result.error) alert(`Error: ${result.error}`)
  }

  // Restaurar desde papelera
  const handleRestaurar = async (id: string) => {
    const result = await restaurarDePapelera(id)
    if (result.error) alert(`Error: ${result.error}`)
  }

  // Eliminar permanente (resta de caja)
  const handleEliminarPermanente = async (order: OrderConDetalle) => {
    const confirm = window.confirm(
      `⚠️ ELIMINAR PERMANENTE\n\nPedido #${order.order_number} — ${formatCurrency(order.total)}\n\nEste monto se restará de la caja. Esta acción NO se puede deshacer.`
    )
    if (!confirm) return

    const result = await eliminarPermanente(order.id)
    if (result.error) alert(`Error: ${result.error}`)
    else refetch()
  }

  if (loading) return <EstadoCargando />
  if (error) return <EstadoError mensaje={error} onReintentar={refetch} />

  return (
    <div className="orders-page">
      {/* Header con tabs */}
      <div className="orders-page__header">
        <div className="orders-page__tabs">
          <button
            onClick={() => setTab('historial')}
            className={`orders-page__tab ${tab === 'historial' ? 'orders-page__tab--active' : ''}`}
          >
            📋 Historial
          </button>
          <button
            onClick={() => setTab('papelera')}
            className={`orders-page__tab ${tab === 'papelera' ? 'orders-page__tab--active' : ''}`}
          >
            🗑️ Papelera
          </button>
        </div>

        <span className="orders-page__count">
          {ordenesFiltradas.length} pedido{ordenesFiltradas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filtros */}
      <div className="orders-filters">
        <div className="orders-filters__row">
          <label className="orders-filters__field">
            <span>Desde</span>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || todayStr}
              onChange={e => setDateFrom(e.target.value)}
              className="orders-filters__input"
            />
          </label>
          <label className="orders-filters__field">
            <span>Hasta</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              max={todayStr}
              onChange={e => setDateTo(e.target.value)}
              className="orders-filters__input"
            />
          </label>
          <div className="orders-filters__field orders-filters__field--search">
            <span>Cliente / Nº</span>
            <input
              type="text"
              placeholder="Buscar cliente o Nº..."
              value={busquedaCliente}
              onChange={e => setBusquedaCliente(e.target.value)}
              className="orders-filters__input"
            />
          </div>
          {(dateFrom || dateTo || busquedaCliente) && (
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => { setDateFrom(''); setDateTo(''); setBusquedaCliente('') }}
              style={{ alignSelf: 'flex-end' }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Lista de órdenes */}
      <div className="orders-list">
        {ordenesFiltradas.length === 0 ? (
          <div className="orders-empty">
            <span>📭</span>
            <p>{tab === 'historial' ? 'No hay pedidos en el historial' : 'La papelera está vacía'}</p>
          </div>
        ) : (
          ordenesFiltradas.map(order => {
            const isExpanded = expandedId === order.id
            return (
              <div key={order.id} className="order-card">
                {/* Cabecera naranja */}
                <div
                  className="order-card__header"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="order-card__header-left">
                    <span className="order-card__number">#{order.order_number}</span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="order-card__header-right">
                    <span className="order-card__total">{formatCurrency(order.total)}</span>
                    <span className="order-card__chevron">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Info básica */}
                <div className="order-card__body">
                  <div className="order-card__meta">
                    <span>📅 {formatFechaCorta(order.created_at)}</span>
                    <span>🏷️ {order.type}</span>
                    <span>💳 {order.payment_method}</span>
                    {order.customer_name && <span>👤 {order.customer_name}</span>}
                  </div>

                  {/* Detalle expandido de items */}
                  {isExpanded && (
                    <div className="order-card__detail">
                      <div className="order-card__detail-title">Detalle del pedido</div>
                      {order.order_items && order.order_items.length > 0 ? (
                        <div className="order-card__items">
                          {order.order_items.map(item => (
                            <div key={item.id} className="order-card__item">
                              <span className="order-card__item-qty">{item.quantity}x</span>
                              <span className="order-card__item-name">{item.product_name}</span>
                              <span className="order-card__item-price">
                                {formatCurrency(item.unit_price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Sin detalle de ítems</p>
                      )}
                      {order.notes && (
                        <div className="order-card__notes">
                          📝 {order.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="order-card__actions">
                  {tab === 'historial' ? (
                    <button
                      onClick={() => handlePapelera(order.id)}
                      className="btn btn--danger-soft btn--sm"
                      style={{ flex: 1 }}
                    >
                      🗑️ Papelera
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRestaurar(order.id)}
                        className="btn btn--success-soft btn--sm"
                        style={{ flex: 1 }}
                      >
                        ♻️ Restaurar
                      </button>
                      <button
                        onClick={() => handleEliminarPermanente(order)}
                        className="btn btn--danger-solid btn--sm"
                        style={{ flex: 1 }}
                      >
                        ❌ Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
