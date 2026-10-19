// =============================================================================
// sparkline.ts — Geometría de la mini-línea de tendencia (cálculo puro)
//
// Trabaja en un lienzo de 100 x 40 (viewBox del SVG). El margen deja lugar al
// punto final y al grosor de la línea para que no se corten en el borde.
// =============================================================================

export const ANCHO = 100
export const ALTO = 40
const MARGEN_X = 3
const MARGEN_Y = 5

export interface Punto {
  x: number
  y: number
}

/** Una serie dibuja algo solo si tiene al menos dos puntos y no es todo cero. */
export function serieConDatos(serie: number[] | undefined): serie is number[] {
  return !!serie && serie.length >= 2 && serie.some((v) => v !== 0)
}

/** Lleva cada valor a coordenadas del lienzo (y crece hacia abajo). */
export function puntosSparkline(serie: number[]): Punto[] {
  if (serie.length === 0) return []
  const min = Math.min(...serie)
  const max = Math.max(...serie)
  const rango = max - min
  const util = ALTO - MARGEN_Y * 2
  const paso = serie.length > 1 ? (ANCHO - MARGEN_X * 2) / (serie.length - 1) : 0

  return serie.map((v, i) => ({
    x: MARGEN_X + paso * i,
    // Serie plana: línea a media altura en vez de dividir por cero.
    y: rango === 0 ? ALTO / 2 : MARGEN_Y + util * (1 - (v - min) / rango),
  }))
}

const r = (n: number) => Math.round(n * 100) / 100

export function trazoLinea(puntos: Punto[]): string {
  return puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${r(p.x)} ${r(p.y)}`).join(' ')
}

/** Misma línea cerrada contra la base, para el relleno suave. */
export function trazoRelleno(puntos: Punto[]): string {
  const primero = puntos[0]
  const ultimo = puntos[puntos.length - 1]
  if (!primero || !ultimo) return ''
  return `${trazoLinea(puntos)} L${r(ultimo.x)} ${ALTO} L${r(primero.x)} ${ALTO} Z`
}
