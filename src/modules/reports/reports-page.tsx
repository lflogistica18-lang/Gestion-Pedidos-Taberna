import { useState } from 'react'
import { useDashboardStats } from './hooks/useDashboardStats'

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

function parseLocalDate(str: string): Date {
  // evita desfase de timezone al parsear YYYY-MM-DD
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function ReportsPage() {
  const todayStr = toDateStr(new Date())
  const [dateFrom, setDateFrom] = useState(todayStr)
  const [dateTo, setDateTo] = useState(todayStr)

  const dateFromObj = parseLocalDate(dateFrom)
  const dateToObj = parseLocalDate(dateTo)

  const { stats, loading } = useDashboardStats(dateFromObj, dateToObj)

  const isToday = dateFrom === todayStr && dateTo === todayStr

  const handleToday = () => {
    setDateFrom(todayStr)
    setDateTo(todayStr)
  }

  // Formato para mostrar tiempo de prep.
  const prepMinutes = stats ? Math.round(stats.averagePrepTimeMs / 60000) : 0

  return (
    <div className="reports-page">
      <header className="pos-header">
        <h1 className="pos-header__title">📊 Reportes</h1>
      </header>

      {/* Filtro de fechas */}
      <div className="reports-date-filter">
        <div className="reports-date-filter__row">
          <label className="reports-date-filter__label">
            Desde
            <input
              type="date"
              className="reports-date-filter__input"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className="reports-date-filter__label">
            Hasta
            <input
              type="date"
              className="reports-date-filter__input"
              value={dateTo}
              min={dateFrom}
              max={todayStr}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
          {!isToday && (
            <button className="btn btn--secondary" onClick={handleToday}>
              Hoy
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <div className="spinner" />
        </div>
      ) : !stats ? null : (
        <>
          <div className="reports-grid">
            <div className="stat-card">
              <span className="stat-card__icon">💰</span>
              <h3 className="stat-card__title">Ingresos Brutos</h3>
              <span className="stat-card__value">${stats.totalRevenue.toLocaleString('es-AR')}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.9rem', color: '#6b7280' }}>
                <span>Efectivo: <b>${stats.totalRevenueCash.toLocaleString('es-AR')}</b></span>
                <span>Transf/Déb: <b>${stats.totalRevenueTransfer.toLocaleString('es-AR')}</b></span>
              </div>
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
        </>
      )}
    </div>
  )
}
