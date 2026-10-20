// Tooltip de los gráficos: panel claro, igual que las tarjetas.

import { puntoDeTooltip } from './graficos.helpers'

interface TooltipGraficoProps {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  etiquetaValor: string
  formatoValor: (n: number) => string
}

export function TooltipGrafico({ active, payload, etiquetaValor, formatoValor }: TooltipGraficoProps) {
  const punto = active ? puntoDeTooltip(payload) : null
  if (!punto) return null
  return (
    <div className="min-w-36 rounded-lg border border-borde-sutil bg-bg-tarjeta p-3 text-sm shadow-tarjeta">
      <p className="mb-1 font-semibold text-texto-primario">{punto.etiqueta}</p>
      <p className="flex items-baseline justify-between gap-4">
        <span className="text-texto-secundario">{etiquetaValor}</span>
        <span className="font-semibold tabular-nums text-texto-primario">{formatoValor(punto.valor)}</span>
      </p>
    </div>
  )
}
