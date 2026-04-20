import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { useDashboardStats } from './hooks/useDashboardStats'
import { EstadoCargando } from '@/shared/components/comunes/EstadoCargando'

// CRÍTICO: NO usar toISOString() — retorna UTC y en AR (UTC-3) a las 21hs ya es el día siguiente
function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatCurrency(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

// Emoji por categoría — mapa visual
const CATEGORY_EMOJI: Record<string, string> = {
  'Comida': '🍔',
  'Bebida': '🍺',
  'Bebidas': '🍺',
  'Postres': '🍰',
  'Hamburguesas': '🍔',
  'Pizzas': '🍕',
  'Empanadas': '🥟',
  'Promociones': '🎉',
  'Extras': '➕',
}

function getCategoryEmoji(cat: string): string {
  return CATEGORY_EMOJI[cat] || '📦'
}

export default function ReportsPage() {
  const todayStr = toDateStr(new Date())
  const [dateFrom, setDateFrom] = useState(todayStr)
  const [dateTo, setDateTo] = useState(todayStr)

  const dateFromObj = parseLocalDate(dateFrom)
  const dateToObj = parseLocalDate(dateTo)

  const { stats, loading } = useDashboardStats(dateFromObj, dateToObj)

  const isToday = dateFrom === todayStr && dateTo === todayStr
  const isMultiDay = stats && stats.dailyData.length > 1

  const handleToday = () => {
    setDateFrom(todayStr)
    setDateTo(todayStr)
  }

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
          <EstadoCargando mensaje="Cargando reportes..." />
        </div>
      ) : !stats ? null : (
        <>
          {/* ── STAT CARDS ── */}
          <div className="reports-grid">
            <div className="stat-card stat-card--green">
              <span className="stat-card__icon">💰</span>
              <h3 className="stat-card__title">Ingresos Brutos</h3>
              <span className="stat-card__value">{formatCurrency(stats.totalRevenue)}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.9rem', color: '#6b7280' }}>
                <span>Efectivo: <b>{formatCurrency(stats.totalRevenueCash)}</b></span>
                <span>Transf/Déb: <b>{formatCurrency(stats.totalRevenueTransfer)}</b></span>
              </div>
            </div>

            {/* Card de Margen de Ganancia — nuevo */}
            <div className="stat-card stat-card--orange">
              <span className="stat-card__icon">📈</span>
              <h3 className="stat-card__title">Margen de Ganancia</h3>
              <span className="stat-card__value">{formatCurrency(stats.totalMargin)}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.85rem', color: '#6b7280' }}>
                <span>Costo: <b style={{ color: '#dc2626' }}>{formatCurrency(stats.totalCost)}</b></span>
                <span>Margen: <b style={{ color: '#16a34a' }}>
                  {stats.totalRevenue > 0 ? Math.round((stats.totalMargin / stats.totalRevenue) * 100) : 0}%
                </b></span>
              </div>
            </div>

            <div className="stat-card stat-card--blue">
              <span className="stat-card__icon">📦</span>
              <h3 className="stat-card__title">Total Pedidos</h3>
              <span className="stat-card__value">{stats.totalOrders}</span>
            </div>

            <div className="stat-card stat-card--purple">
              <span className="stat-card__icon">🛵</span>
              <h3 className="stat-card__title">Delivery vs Local</h3>
              <span className="stat-card__value" style={{ fontSize: '1.4rem' }}>
                {stats.deliveryCount} Del. / {stats.localCount} Loc.
              </span>
            </div>

            <div className="stat-card stat-card--gray">
              <span className="stat-card__icon">⏱️</span>
              <h3 className="stat-card__title">Promedio Preparación</h3>
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', marginBottom: '2px' }}>
                Solo cocina · {stats.kitchenOrdersCount} pedido{stats.kitchenOrdersCount !== 1 ? 's' : ''}
              </span>
              <span className="stat-card__value">
                {stats.avgPrepTimeMinutes > 0 ? `${stats.avgPrepTimeMinutes} min` : '--'}
              </span>
            </div>
          </div>

          {/* ── GRÁFICO DE TENDENCIA (solo si hay varios días) ── */}
          {isMultiDay && (
            <div className="chart-card">
              <h2 className="chart-card__title">📈 Tendencia de ingresos</h2>
              <p className="chart-card__subtitle">Evolución diaria del período seleccionado</p>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.dailyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f9a825" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f9a825" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      width={44}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value)), 'Ingresos']}
                      contentStyle={{ borderRadius: '10px', border: '1px solid #f3f4f6', fontSize: '0.85rem' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#f9a825"
                      strokeWidth={2.5}
                      fill="url(#colorRevenue)"
                      dot={{ fill: '#f9a825', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── TOP PRODUCTOS GLOBAL (con montos) ── */}
          <div className="top-products-list">
            <h2 className="top-products-list__title">👑 Top 5 Productos Más Vendidos</h2>
            {stats.topProducts.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No hay ventas registradas.</p>
            ) : (
              <div>
                {stats.topProducts.map((p, i) => {
                  const avgPerDay = stats.dailyData.length > 1
                    ? (p.qty / stats.dailyData.length).toFixed(1)
                    : null
                  return (
                    <div key={p.name} className="top-product-item">
                      <span className="top-product-item__name">
                        {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}
                        {p.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {avgPerDay && (
                          <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                            ~{avgPerDay}/día
                          </span>
                        )}
                        <span className="top-product-item__revenue">
                          {formatCurrency(p.revenue)}
                        </span>
                        <span className="top-product-item__qty">{p.qty} unid.</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── TOP POR CATEGORÍA (separado) ── */}
          {Object.keys(stats.topByCategory).length > 0 && (
            <div className="reports-grid" style={{ marginTop: '24px' }}>
              {Object.entries(stats.topByCategory).map(([category, items]) => (
                <div key={category} className="top-products-list">
                  <h2 className="top-products-list__title" style={{ fontSize: '1rem' }}>
                    {getCategoryEmoji(category)} {category} — Más vendidos
                  </h2>
                  {items.map((p, i) => (
                    <div key={p.name} className="top-product-item">
                      <span className="top-product-item__name">
                        {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}
                        {p.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="top-product-item__revenue">
                          {formatCurrency(p.revenue)}
                        </span>
                        <span className="top-product-item__qty">{p.qty} unid.</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
