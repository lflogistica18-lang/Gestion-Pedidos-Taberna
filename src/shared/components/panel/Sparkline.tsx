// =============================================================================
// Sparkline.tsx — Mini-línea de tendencia en SVG inline (sin Recharts)
//
// Toma el color del texto (`currentColor`): dentro de una KpiCard hereda el del
// indicador. El punto final es un div y no un <circle> porque el SVG se estira al
// 100 % del ancho (preserveAspectRatio="none") y un círculo se vería achatado.
// =============================================================================

import { ALTO, ANCHO, puntosSparkline, serieConDatos, trazoLinea, trazoRelleno } from './sparkline.helpers'

interface SparklineProps {
  serie: number[] | undefined
  /** Texto accesible, ej. "Ventas por día, últimos 7 días". */
  etiqueta: string
  /** Leyenda chica debajo de la línea, ej. "ventas: últimos 7 días". */
  leyenda?: string
  loading?: boolean
}

export function Sparkline({ serie, etiqueta, leyenda, loading }: SparklineProps) {
  const puntos = !loading && serieConDatos(serie) ? puntosSparkline(serie) : []
  const ultimo = puntos[puntos.length - 1]

  return (
    <div>
      {loading ? (
        <div className="h-10 w-full animate-pulse rounded bg-borde-sutil" aria-hidden="true" />
      ) : !ultimo ? (
        <div className="flex h-10 w-full items-center text-xs text-texto-secundario">Sin movimientos en el período</div>
      ) : (
        <div className="relative h-10 w-full">
          <svg
            role="img"
            aria-label={etiqueta}
            viewBox={`0 0 ${ANCHO} ${ALTO}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
          >
            <path d={trazoRelleno(puntos)} fill="currentColor" fillOpacity={0.12} />
            <path
              d={trazoLinea(puntos)}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span
            aria-hidden="true"
            className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current"
            style={{ left: `${(ultimo.x / ANCHO) * 100}%`, top: `${(ultimo.y / ALTO) * 100}%` }}
          />
        </div>
      )}
      {leyenda && <p className="mt-1 text-[11px] text-texto-secundario">{leyenda}</p>}
    </div>
  )
}
