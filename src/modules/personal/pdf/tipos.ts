import type { ModoConcepto, TipoConcepto } from '@/types/database.types'

export interface LineaRecibo {
  nombre: string
  tipo: TipoConcepto
  modo: ModoConcepto
  cantidad: number
  monto: number
}

/** Todo lo que lleva el recibo, ya resuelto: el PDF no calcula nada. */
export interface DatosRecibo {
  local: string
  empleada: string
  semanaDesde: string
  semanaHasta: string
  sueldo: number
  lineas: LineaRecibo[]
  totalExtras: number
  totalDescuentos: number
  total: number
  medioPago: string
  /** Lo pagado por cada medio; null en pagos viejos que solo tienen el medio. */
  montosPagados: MontosPagados | null
  pagadoAt: string | null
}

export interface MontosPagados {
  efectivo: number
  transferencia: number
  /** Pagado menos lo calculado (positivo = de más). */
  diferencia: number
}
