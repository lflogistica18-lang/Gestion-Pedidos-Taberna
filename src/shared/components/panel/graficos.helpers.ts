// =============================================================================
// graficos.helpers.ts — Formato compartido por los gráficos (BarrasRanking,
// TendenciaArea). Aparte de los componentes para que estos exporten solo
// componentes (requisito de fast refresh).
// =============================================================================

/** Un punto de un gráfico: nombre en el eje y su valor. */
export interface PuntoGrafico {
  etiqueta: string
  valor: number
}

/** Monto en pesos, sin decimales: 12500 → "$12.500". */
export function fmtMonto(n: number): string {
  return `$${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n)}`
}

/** Monto abreviado para los ejes: 1.600.000 → "$1,6 M", 800.000 → "$800 mil". */
export function fmtCompacto(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) {
    return `$${(n / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M`
  }
  if (abs >= 1_000) {
    return `$${Math.round(n / 1_000).toLocaleString('es-AR')} mil`
  }
  return fmtMonto(n)
}

/** Recorta un nombre largo para el eje (el nombre completo queda en el tooltip). */
export function acortar(texto: string, max: number): string {
  return texto.length > max ? `${texto.slice(0, max - 1).trimEnd()}…` : texto
}

/** Saca de lo que entrega Recharts el punto que se está mirando, si es uno de los nuestros. */
export function puntoDeTooltip(payload: ReadonlyArray<{ payload?: unknown }> | undefined): PuntoGrafico | null {
  const crudo = payload?.[0]?.payload
  if (typeof crudo !== 'object' || crudo === null) return null
  const etiqueta: unknown = Reflect.get(crudo, 'etiqueta')
  const valor: unknown = Reflect.get(crudo, 'valor')
  if (typeof etiqueta !== 'string' || typeof valor !== 'number') return null
  return { etiqueta, valor }
}
