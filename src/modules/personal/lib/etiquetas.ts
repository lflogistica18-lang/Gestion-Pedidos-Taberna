import { pesos } from '@/shared/lib/formato'
import { MONTO_MAXIMO, leerNumeroAR } from '@/shared/lib/numeros'
import type { ModoConcepto, TipoConcepto, TipoNovedad } from '@/types/database.types'

export const ETIQUETA_TIPO: Record<TipoConcepto, string> = {
  extra: 'Extra',
  descuento: 'Descuento',
}

export const ETIQUETA_MODO: Record<ModoConcepto, string> = {
  fijo: 'Monto fijo',
  porcentaje: '% del sueldo',
  por_unidad: 'Por unidad',
  dias_de_sueldo: 'Días de sueldo',
}

export const ETIQUETA_NOVEDAD: Record<TipoNovedad, string> = {
  inasistencia: 'Inasistencia',
  llegada_tarde: 'Llegada tarde',
  adelanto: 'Adelanto',
  charla: 'Para charlar',
  otro: 'Otra',
}

export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

/** Valor de un concepto como se lee en la lista: "$5.000", "10 %", "—". */
export function textoValor(modo: ModoConcepto, valor: number): string {
  if (modo === 'dias_de_sueldo') return '—'
  if (modo === 'porcentaje') return `${String(valor).replace('.', ',')} %`
  return pesos(valor)
}

export { leerNumeroAR as leerNumero } from '@/shared/lib/numeros'

/** Texto chico bajo un campo de monto: "= $200.000", o undefined si está vacío. */
export function ayudaMonto(texto: string): string | undefined {
  if (texto.trim() === '') return undefined
  const n = leerNumeroAR(texto)
  return n === null ? 'No se entiende como número' : `= ${pesos(n)}`
}

/** Mensaje si un monto pasa el tope de la base (NUMERIC(12,2)), o null si está bien. */
export function errorTopeMonto(n: number, que: string): string | null {
  return n > MONTO_MAXIMO ? `${que} no puede pasar de ${pesos(MONTO_MAXIMO)}` : null
}

/** Cantidad como se muestra: sin ceros de más. */
export function textoCantidad(n: number): string {
  return String(n).replace('.', ',')
}
