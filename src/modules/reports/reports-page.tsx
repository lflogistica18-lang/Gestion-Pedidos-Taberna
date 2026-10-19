import { useState } from 'react'
import { LineChart, ReceiptText } from 'lucide-react'
import {
  BannerSaludo, EncabezadoSeccion, SeccionPanel, TendenciaArea, fmtMonto,
} from '@/shared/components/panel'
import { EstadoError } from '@/shared/components/comunes/EstadoError'
import { EstadoVacio } from '@/shared/components/comunes/EstadoVacio'
import { useDashboardStats } from './hooks/useDashboardStats'
import { IndicadoresVentas } from './components/IndicadoresVentas'
import { MedioDePago } from './components/MedioDePago'
import { SelectorPeriodo } from './components/SelectorPeriodo'
import { TopPorCategoria } from './components/TopPorCategoria'
import { TopProductos } from './components/TopProductos'
import {
  parseLocalDate, periodoEnPalabras, rangoDePreset, toDateStr, type PeriodoPreset,
} from './components/periodo'

export default function ReportsPage() {
  const hoyDate = new Date()
  const hoy = toDateStr(hoyDate)
  const [preset, setPreset] = useState<PeriodoPreset>('hoy')
  const [elegido, setElegido] = useState({ desde: hoy, hasta: hoy })

  const { desde, hasta } = rangoDePreset(preset, hoyDate, elegido)
  const { stats, loading, error, refetch } = useDashboardStats(parseLocalDate(desde), parseLocalDate(hasta))

  // Al pasar a "Elegir" arranca con el rango que se estaba viendo.
  const cambiarPreset = (p: PeriodoPreset) => {
    if (p === 'elegir' && preset !== 'elegir') setElegido({ desde, hasta })
    setPreset(p)
  }
  const cambiarDesde = (v: string) => setElegido((e) => ({ desde: v, hasta: v > e.hasta ? v : e.hasta }))
  const cambiarHasta = (v: string) => setElegido((e) => ({ desde: v < e.desde ? v : e.desde, hasta: v }))

  const hayDatos = !!stats && stats.totalOrders > 0
  const variosDias = !!stats && stats.dailyData.length > 1

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
      <BannerSaludo
        titulo={`Ventas de ${periodoEnPalabras(preset, desde, hasta)}`}
        acciones={
          <SelectorPeriodo
            preset={preset} onPreset={cambiarPreset} desde={elegido.desde} hasta={elegido.hasta}
            hoy={hoy} onDesde={cambiarDesde} onHasta={cambiarHasta}
          />
        }
      >
        {error ? null : loading || !stats ? (
          <div className="h-10 w-48 animate-pulse rounded bg-sobre-acento/20" aria-hidden="true" />
        ) : (
          <>
            <p className="text-4xl font-extrabold tracking-tight sm:text-5xl">{fmtMonto(stats.totalRevenue)}</p>
            <p className="mt-1 text-sm font-semibold text-sobre-acento/90 sm:text-base">
              {stats.totalOrders} {stats.totalOrders === 1 ? 'pedido' : 'pedidos'}
            </p>
          </>
        )}
      </BannerSaludo>

      {error ? (
        <SeccionPanel>
          <EstadoError mensaje={error} onReintentar={refetch} />
        </SeccionPanel>
      ) : loading || !stats ? (
        <IndicadoresVentas stats={null} loading />
      ) : !hayDatos ? (
        <SeccionPanel>
          <EstadoVacio mensaje="No hubo ventas en este período" icono={<ReceiptText size={26} />} />
        </SeccionPanel>
      ) : (
        <>
          <IndicadoresVentas stats={stats} />
          <MedioDePago efectivo={stats.totalRevenueCash} transferencia={stats.totalRevenueTransfer} />
          {variosDias && (
            <SeccionPanel>
              <EncabezadoSeccion icono={<LineChart size={16} />} titulo="Tendencia de ingresos" subtitulo="Evolución diaria del período" />
              <div className="mt-3">
                <TendenciaArea
                  datos={stats.dailyData.map((d) => ({ etiqueta: d.date, valor: d.revenue }))}
                  idGradiente="gradiente-ingresos"
                  descripcion="Ingresos por día del período"
                  etiquetaValor="Ingresos"
                />
              </div>
            </SeccionPanel>
          )}
          <TopProductos productos={stats.topProducts} />
          <TopPorCategoria porCategoria={stats.topByCategory} />
        </>
      )}
    </div>
  )
}
