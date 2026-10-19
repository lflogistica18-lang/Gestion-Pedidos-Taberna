// Selector de período: Hoy / Ayer / 7 días / 30 días / Elegir (con Desde y Hasta).

import { ControlSegmentado, Entrada } from '@/shared/components/panel'
import type { PeriodoPreset } from './periodo'

const OPCIONES: { value: PeriodoPreset; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'ayer', label: 'Ayer' },
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
  { value: 'elegir', label: 'Elegir' },
]

interface SelectorPeriodoProps {
  preset: PeriodoPreset
  onPreset: (p: PeriodoPreset) => void
  desde: string
  hasta: string
  hoy: string
  onDesde: (v: string) => void
  onHasta: (v: string) => void
}

export function SelectorPeriodo({ preset, onPreset, desde, hasta, hoy, onDesde, onHasta }: SelectorPeriodoProps) {
  return (
    <div className="flex w-full flex-col gap-3">
      <ControlSegmentado etiqueta="Período" opciones={OPCIONES} value={preset} onChange={onPreset} className="self-start" />
      {preset === 'elegir' && (
        <div className="grid max-w-md grid-cols-1 gap-3 rounded-xl bg-bg-tarjeta p-3 text-texto-primario shadow-tarjeta sm:grid-cols-2">
          <Entrada
            type="date"
            etiqueta="Desde"
            value={desde}
            max={hasta}
            onChange={(e) => e.target.value && onDesde(e.target.value)}
          />
          <Entrada
            type="date"
            etiqueta="Hasta"
            value={hasta}
            min={desde}
            max={hoy}
            onChange={(e) => e.target.value && onHasta(e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
