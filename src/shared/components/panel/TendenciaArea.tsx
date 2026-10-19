// =============================================================================
// TendenciaArea.tsx — Gráfico de área de una tendencia en el tiempo (ventas por
// día u hora): línea grafico-1 de 2 px con degradé de 25 % a 0 %, grilla
// horizontal punteada y ejes sin línea. Quien lo usa pone su tarjeta, su título y
// sus estados (cargando, vacío, error).
// =============================================================================

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtCompacto, fmtMonto, type PuntoGrafico } from './graficos.helpers'
import { TooltipGrafico } from './TooltipGrafico'

interface TendenciaAreaProps {
  datos: PuntoGrafico[]
  /** Id único del degradé SVG: dos gráficos en la misma pantalla no deben pisarse. */
  idGradiente: string
  /** Descripción para lectores de pantalla, ej. "Ventas por día". */
  descripcion: string
  /** Cómo se llama el valor en el tooltip y en la tabla accesible. */
  etiquetaValor?: string
  /** Formato del valor; por defecto pesos. */
  formatoValor?: (n: number) => string
}

const TICK = { fontSize: 11, fill: 'var(--color-texto-secundario)' }

export function TendenciaArea({ datos, idGradiente, descripcion, etiquetaValor = 'Ventas', formatoValor = fmtMonto }: TendenciaAreaProps) {
  return (
    <>
      <div role="img" aria-label={descripcion} className="h-44 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={datos} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-grafico-1)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-grafico-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-grafico-grilla)" />
            <XAxis dataKey="etiqueta" tick={TICK} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tickFormatter={fmtCompacto} tick={TICK} axisLine={false} tickLine={false} width={64} />
            <Tooltip
              cursor={{ stroke: 'var(--color-grafico-grilla)' }}
              content={<TooltipGrafico etiquetaValor={etiquetaValor} formatoValor={formatoValor} />}
            />
            <Area
              // Plata sin animar (guía Panel §f): una cifra que "crece" mientras se lee genera desconfianza
              isAnimationActive={false}
              type="monotone"
              dataKey="valor"
              stroke="var(--color-grafico-1)"
              strokeWidth={2}
              fill={`url(#${idGradiente})`}
              activeDot={{ r: 4, fill: 'var(--color-grafico-1)', stroke: 'var(--color-bg-tarjeta)', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla oculta con los mismos valores, para lectores de pantalla. */}
      <table className="sr-only">
        <caption>{descripcion}</caption>
        <thead>
          <tr><th scope="col">Período</th><th scope="col">{etiquetaValor}</th></tr>
        </thead>
        <tbody>
          {datos.map((punto) => (
            <tr key={punto.etiqueta}><th scope="row">{punto.etiqueta}</th><td>{formatoValor(punto.valor)}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
