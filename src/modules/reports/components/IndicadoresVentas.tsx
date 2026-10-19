// Grilla de KPIs del dashboard: ingresos, margen, pedidos, delivery vs local (+ preparación si hay cocina).

import { Bike, Receipt, Timer, TrendingUp, Wallet } from 'lucide-react'
import { KpiCard, Sparkline, fmtMonto } from '@/shared/components/panel'
import { COCINA_ACTIVA } from '@/shared/lib/config'
import type { DailyStats } from '../hooks/useDashboardStats'

interface IndicadoresVentasProps {
  stats: DailyStats | null
  loading?: boolean
}

function pct(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 100) : 0
}

export function IndicadoresVentas({ stats, loading }: IndicadoresVentasProps) {
  const s = stats
  const revenue = s?.totalRevenue ?? 0
  const orders = s?.totalOrders ?? 0
  const ticket = orders > 0 ? Math.round(revenue / orders) : 0
  const d = s?.deliveryCount ?? 0
  const l = s?.localCount ?? 0
  const serie = s && s.dailyData.length > 1 ? s.dailyData.map((x) => x.revenue) : undefined
  const sinCosto = !!s && s.totalCost === 0

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard tono="naranja" titulo="Ingresos" icono={<Wallet size={16} />} valor={fmtMonto(revenue)} valorTexto={fmtMonto(revenue)} loading={loading}>
        {loading || !s ? null : (
          <>
            {serie && <Sparkline serie={serie} etiqueta="Ingresos por día del período" leyenda="ingresos por día" />}
            <p className="mt-2 text-xs text-texto-secundario">
              Efectivo {fmtMonto(s.totalRevenueCash)} · Déb/Transfer {fmtMonto(s.totalRevenueTransfer)}
            </p>
          </>
        )}
      </KpiCard>

      <KpiCard
        tono="verde" titulo="Margen" icono={<TrendingUp size={16} />}
        valor={fmtMonto(s?.totalMargin ?? 0)} valorTexto={fmtMonto(s?.totalMargin ?? 0)} loading={loading}
        subtexto={sinCosto && !loading ? 'Cargá el costo de los productos para ver el margen real' : undefined}
      >
        {loading || !s ? null : (
          <p className="text-xs text-texto-secundario">Costo {fmtMonto(s.totalCost)} · {pct(s.totalMargin, s.totalRevenue)}%</p>
        )}
      </KpiCard>

      <KpiCard tono="azul" titulo="Pedidos" icono={<Receipt size={16} />} valor={String(orders)} valorTexto={String(orders)} loading={loading}>
        {loading || !s ? null : (
          <p className="text-xs text-texto-secundario">{s.totalUnits} unidades · ticket promedio {fmtMonto(ticket)}</p>
        )}
      </KpiCard>

      <KpiCard
        tono="violeta" titulo="Delivery vs Local" icono={<Bike size={16} />}
        valor={<>{d} <span className="text-sm font-semibold text-texto-secundario">delivery / {l} local</span></>}
        valorTexto={`${d} delivery / ${l} local`} loading={loading}
      >
        {loading || !s ? null : <p className="text-xs text-texto-secundario">{pct(d, d + l)}% delivery</p>}
      </KpiCard>

      {COCINA_ACTIVA && (
        <KpiCard
          tono="azul" titulo="Preparación promedio" icono={<Timer size={16} />}
          valor={s && s.avgPrepTimeMinutes > 0 ? `${s.avgPrepTimeMinutes} min` : '--'}
          valorTexto={s ? `${s.avgPrepTimeMinutes} min` : '--'} loading={loading}
          subtexto={s ? `Solo cocina · ${s.kitchenOrdersCount} pedido${s.kitchenOrdersCount !== 1 ? 's' : ''}` : undefined}
        />
      )}
    </div>
  )
}
