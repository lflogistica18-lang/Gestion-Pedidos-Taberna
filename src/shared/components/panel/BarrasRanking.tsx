// =============================================================================
// BarrasRanking.tsx — Ranking en barras horizontales (Recharts) con selección
//
// Una sola serie en grafico-1. Con una barra elegida, las demás pasan a gris
// (grafico-apagado). Grilla vertical, que sigue al eje de valores. Hay una tabla
// oculta (sr-only) con los mismos valores: ni el SVG ni el tooltip son legibles
// para un lector de pantalla.
// =============================================================================

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { acortar, fmtCompacto, fmtMonto, type PuntoGrafico } from './graficos.helpers'
import { TooltipGrafico } from './TooltipGrafico'

interface BarrasRankingProps {
  /** Ya ordenados como se quieren ver (de arriba hacia abajo). */
  datos: PuntoGrafico[]
  /** Descripción para lectores de pantalla, ej. "Ventas por producto". */
  descripcion: string
  /** Cómo se llama el valor en el tooltip y en la tabla accesible. */
  etiquetaValor?: string
  /** Formato del valor; por defecto pesos. */
  formatoValor?: (n: number) => string
  /** Etiqueta de la barra elegida; si hay una, las demás se apagan. */
  seleccionada?: string | null
  onSeleccionar?: (etiqueta: string) => void
}

const TICK = { fontSize: 11, fill: 'var(--color-texto-secundario)' }
const ALTO_FILA = 40
const ALTO_EJE = 32

export function BarrasRanking({
  datos, descripcion, etiquetaValor = 'Total', formatoValor = fmtMonto, seleccionada = null, onSeleccionar,
}: BarrasRankingProps) {
  // Alto fijo según la cantidad de filas, e incluye la banda del eje inferior.
  const alto = Math.max(160, datos.length * ALTO_FILA + ALTO_EJE)

  function colorBarra(etiqueta: string): string {
    if (seleccionada && seleccionada !== etiqueta) return 'var(--color-grafico-apagado)'
    return 'var(--color-grafico-1)'
  }

  return (
    <div>
      <div role="img" aria-label={descripcion} style={{ height: alto }} className="w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke="var(--color-grafico-grilla)" strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={fmtCompacto} axisLine={false} tickLine={false} tick={TICK} />
            <YAxis
              dataKey="etiqueta"
              type="category"
              width={116}
              tickFormatter={(v: string) => acortar(String(v), 18)}
              axisLine={false}
              tickLine={false}
              tick={{ ...TICK, fill: 'var(--color-texto-primario)' }}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-grafico-grilla)', opacity: 0.5 }}
              content={<TooltipGrafico etiquetaValor={etiquetaValor} formatoValor={formatoValor} />}
            />
            <Bar
              dataKey="valor"
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
              className={onSeleccionar ? 'cursor-pointer' : undefined}
              onClick={(_d, index) => {
                const punto = datos[index]
                if (punto && onSeleccionar) onSeleccionar(punto.etiqueta)
              }}
            >
              {datos.map((punto) => (
                <Cell key={punto.etiqueta} fill={colorBarra(punto.etiqueta)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>{descripcion}</caption>
        <thead>
          <tr><th scope="col">Nombre</th><th scope="col">{etiquetaValor}</th></tr>
        </thead>
        <tbody>
          {datos.map((punto) => (
            <tr key={punto.etiqueta}><th scope="row">{punto.etiqueta}</th><td>{formatoValor(punto.valor)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
