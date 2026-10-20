// Línea de tendencia para el banner naranja: área clara sobre el degradé, sin grilla ni
// ejes pesados. Muestra el monto con tooltip; sin animación (la plata no "crece" sola).

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { TooltipGrafico } from '@/shared/components/panel/TooltipGrafico'
import { fmtMonto, type PuntoGrafico } from '@/shared/components/panel'

interface TendenciaBannerProps {
  datos: PuntoGrafico[]
  descripcion: string
  etiquetaValor: string
}

const TICK = { fontSize: 11, fill: 'var(--color-sobre-acento)', fillOpacity: 0.9 }

export function TendenciaBanner({ datos, descripcion, etiquetaValor }: TendenciaBannerProps) {
  return (
    <>
      <div role="img" aria-label={descripcion} className="h-24 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 320, height: 96 }}>
          <AreaChart data={datos} margin={{ top: 6, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradiente-banner" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-sobre-acento)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--color-sobre-acento)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="etiqueta" tick={TICK} axisLine={false} tickLine={false} minTickGap={36} interval="preserveStartEnd" />
            <Tooltip
              cursor={{ stroke: 'var(--color-sobre-acento)', strokeOpacity: 0.5 }}
              content={<TooltipGrafico etiquetaValor={etiquetaValor} formatoValor={fmtMonto} />}
            />
            <Area
              isAnimationActive={false}
              type="monotone"
              dataKey="valor"
              stroke="var(--color-sobre-acento)"
              strokeOpacity={0.9}
              strokeWidth={2}
              fill="url(#gradiente-banner)"
              activeDot={{ r: 4, fill: 'var(--color-sobre-acento)', stroke: 'var(--color-banner-hasta)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{descripcion}</caption>
        <thead>
          <tr><th scope="col">Momento</th><th scope="col">{etiquetaValor}</th></tr>
        </thead>
        <tbody>
          {datos.map((p) => (
            <tr key={p.etiqueta}><th scope="row">{p.etiqueta}</th><td>{fmtMonto(p.valor)}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
