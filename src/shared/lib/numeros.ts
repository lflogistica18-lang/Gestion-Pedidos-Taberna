/**
 * numeros.ts — leer un número tal como lo escribe una persona en Argentina.
 *
 * Formato argentino: el punto separa miles y la coma es el decimal ("1.234.567,5").
 * Caso ambiguo (sin coma): un solo punto seguido de 1 o 2 dígitos ("12.5") se toma como decimal
 * (así un número que viene de la base, como 1234.5, vuelve igual); seguido de exactamente
 * 3 dígitos ("200.000") es de miles.
 */

/** Tope de la base (NUMERIC(12,2) con margen): 99.999.999. */
export const MONTO_MAXIMO = 99_999_999

export function leerNumeroAR(texto: string): number | null {
  const t = texto.trim()
  if (t === '') return null

  let entero: string
  let decimales = ''

  if (t.includes(',')) {
    // Con coma: la coma es el decimal y los puntos, de miles.
    const partes = t.split(',')
    if (partes.length !== 2) return null
    entero = partes[0]
    decimales = partes[1]
    if (!/^(\d{1,3}(\.\d{3})+|\d*)$/.test(entero)) return null
  } else if (t.includes('.')) {
    const partes = t.split('.')
    if (partes.length === 2 && /^\d{1,2}$/.test(partes[1]) && /^\d*$/.test(partes[0])) {
      entero = partes[0]
      decimales = partes[1]
    } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
      entero = t
    } else {
      return null
    }
  } else {
    entero = t
  }

  if (!/^\d*$/.test(decimales)) return null
  const soloEntero = entero.replace(/\./g, '')
  if (!/^\d*$/.test(soloEntero)) return null
  if (soloEntero === '' && decimales === '') return null

  const n = Number(`${soloEntero || '0'}${decimales ? `.${decimales}` : ''}`)
  return Number.isFinite(n) ? n : null
}
