// "Qué días se vende más": una barra por día (Lun → Dom) con el monto al lado.
// Sin ejes, grilla ni porcentajes: solo día, barra y plata. El mejor día va en acento fuerte.

import { CalendarDays } from 'lucide-react'
import { EncabezadoSeccion, SeccionPanel, fmtMonto } from '@/shared/components/panel'
import { EstadoError } from '@/shared/components/comunes/EstadoError'
import { EstadoVacio } from '@/shared/components/comunes/EstadoVacio'
import type { PromedioDia } from '../lib/calculos'

interface DiasDeVentaProps {
  dias: PromedioDia[] | null
  hayDatos: boolean
  loading: boolean
  error: string | null
  onReintentar: () => void
}

export function DiasDeVenta({ dias, hayDatos, loading, error, onReintentar }: DiasDeVentaProps) {
  const max = dias ? Math.max(...dias.map((d) => d.valor)) : 0
  return (
    <SeccionPanel>
      <EncabezadoSeccion
        icono={<CalendarDays size={16} />}
        titulo="Qué días se vende más"
        subtitulo="Promedio por día, últimas 8 semanas"
      />
      {error ? (
        <EstadoError mensaje={error} onReintentar={onReintentar} />
      ) : loading || !dias ? (
        <div className="mt-4 space-y-3" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-md bg-superficie-2" />
          ))}
        </div>
      ) : !hayDatos ? (
        <EstadoVacio mensaje="Todavía no hay ventas en las últimas 8 semanas" icono={<CalendarDays size={26} />} />
      ) : (
        <ul className="mt-4 space-y-2">
          {dias.map((d) => (
            <li
              key={d.etiqueta}
              aria-label={`${d.etiqueta}: ${fmtMonto(d.valor)} por día${d.esMax ? ', el día que más se vende' : ''}`}
              className="grid min-h-11 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3"
            >
              <span className={`text-sm ${d.esMax ? 'font-bold text-texto-primario' : 'font-medium text-texto-secundario'}`}>
                {d.etiqueta}
              </span>
              <div className="h-6 min-w-0" aria-hidden="true">
                <div
                  className={`h-full rounded-r-md ${d.esMax ? 'bg-grafico-1' : 'bg-grafico-1/35'}`}
                  style={{ width: max > 0 && d.valor > 0 ? `${Math.max(2, (d.valor / max) * 100)}%` : '0%' }}
                />
              </div>
              <span className="min-w-20 text-right text-sm font-bold tabular-nums text-texto-primario">
                {fmtMonto(d.valor)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SeccionPanel>
  )
}
