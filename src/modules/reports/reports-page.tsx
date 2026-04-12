import { useState } from 'react'
import { useDashboardStats } from './hooks/useDashboardStats'

export default function ReportsPage() {
  const [date] = useState(new Date()) // TODO: Agregar date picker si se desea
  const { stats, loading } = useDashboardStats(date)

  if (loading) {
    return (
      <div className="reports-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!stats) return null

  const isToday = new Date().toDateString() === date.toDateString()

  // Formato para mostrar tiempo de prep.
  const prepMinutes = Math.round(stats.averagePrepTimeMs / 60000)

  return (
    <div className="reports-page">
      <header className="pos-header">
        <h1 className="pos-header__title">📊 Reportes {isToday ? '- Hoy' : ''}</h1>
      </header>

      <div className="reports-grid">
        <div className="stat-card">
          <span className="stat-card__icon">💰</span>
          <h3 className="stat-card__title">Ingresos Brutos</h3>
          <span className="stat-card__value">${stats.totalRevenue.toLocaleString('es-AR')}</span>
        </div>

        <div className="stat-card">
          <span className="stat-card__icon">📦</span>
          <h3 className="stat-card__title">Total Pedidos</h3>
          <span className="stat-card__value">{stats.totalOrders}</span>
        </div>

        <div className="stat-card">
          <span className="stat-card__icon">🛵</span>
          <h3 className="stat-card__title">Delivery vs Local</h3>
          <span className="stat-card__value" style={{ fontSize: '1.4rem' }}>
            {stats.deliveryCount} Del. / {stats.localCount} Loc.
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-card__icon">⏱️</span>
          <h3 className="stat-card__title">Promedio de Preparación</h3>
          <span className="stat-card__value">{prepMinutes > 0 ? `${prepMinutes} min` : '--'}</span>
        </div>
      </div>

      <div className="top-products-list">
        <h2 className="top-products-list__title">👑 Top 5 Productos Más Vendidos</h2>
        {stats.topProducts.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No hay ventas registradas.</p>
        ) : (
          <div>
            {stats.topProducts.map((p, i) => (
              <div key={p.name} className="top-product-item">
                <span className="top-product-item__name">
                  {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}
                  {p.name}
                </span>
                <span className="top-product-item__qty">{p.qty} unid.</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
