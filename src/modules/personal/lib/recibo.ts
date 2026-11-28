import { pesos } from '@/shared/lib/formato'
import type { Empleado, PagoPersonal, PagoPersonalItem } from '@/types/database.types'
import type { DatosRecibo, MontosPagados } from '../pdf/tipos'
import { repartoPago } from './calculos'
import { ETIQUETA_MEDIO } from './etiquetas'

/** Montos pagados de un pago; null si es un pago viejo (solo tiene el medio). */
export function montosPagados(pago: Pick<PagoPersonal, 'monto_efectivo' | 'monto_transferencia' | 'total_a_cobrar'>): MontosPagados | null {
  if (pago.monto_efectivo === null && pago.monto_transferencia === null) return null
  const r = repartoPago(pago.total_a_cobrar, pago.monto_efectivo, pago.monto_transferencia)
  return { efectivo: pago.monto_efectivo ?? 0, transferencia: pago.monto_transferencia ?? 0, diferencia: r.diferencia }
}


/** Lo pagado por cada medio para mostrar en pantalla ("Efectivo $90.000 · Transferencia $100.000"); sin montos, el medio. */
export function textoMedioPagado(pago: Pick<PagoPersonal, 'monto_efectivo' | 'monto_transferencia' | 'total_a_cobrar' | 'medio_pago'>): string {
  const m = montosPagados(pago)
  if (!m) return pago.medio_pago ? ETIQUETA_MEDIO[pago.medio_pago] : '—'
  const partes: string[] = []
  if (m.efectivo > 0) partes.push(`${ETIQUETA_MEDIO.efectivo} ${pesos(m.efectivo)}`)
  if (m.transferencia > 0) partes.push(`${ETIQUETA_MEDIO.transferencia} ${pesos(m.transferencia)}`)
  return partes.join(' · ') || '—'
}

/** "Cobró $10.000 de más" / "de menos"; null si no hay diferencia o es un pago viejo. */
export function textoDiferencia(pago: Pick<PagoPersonal, 'monto_efectivo' | 'monto_transferencia' | 'total_a_cobrar'>): string | null {
  const m = montosPagados(pago)
  if (!m || m.diferencia === 0) return null
  return `Cobró ${pesos(Math.abs(m.diferencia))} ${m.diferencia > 0 ? 'de más' : 'de menos'} que lo calculado`
}

/** Ruta del recibo en el bucket sgp-recibos: <empleado_id>/<semana_desde>_<pago_id>.pdf */
export function rutaRecibo(pago: Pick<PagoPersonal, 'id' | 'empleado_id' | 'semana_desde'>): string {
  return `${pago.empleado_id}/${pago.semana_desde}_${pago.id}.pdf`
}

/** Junta los datos del pago ya guardado (con los totales de la base) para el PDF. */
export function armarDatosRecibo(
  pago: PagoPersonal,
  empleado: Pick<Empleado, 'nombre'>,
  items: PagoPersonalItem[],
  local: string,
): DatosRecibo {
  return {
    local,
    empleada: empleado.nombre,
    semanaDesde: pago.semana_desde,
    semanaHasta: pago.semana_hasta,
    sueldo: pago.sueldo_semanal,
    lineas: items.map((i) => ({ nombre: i.nombre, tipo: i.tipo, modo: i.modo, cantidad: i.cantidad, monto: i.monto })),
    totalExtras: pago.total_extras,
    totalDescuentos: pago.total_descuentos,
    total: pago.total_a_cobrar,
    medioPago: pago.medio_pago ? ETIQUETA_MEDIO[pago.medio_pago] : '—',
    montosPagados: montosPagados(pago),
    pagadoAt: pago.pagado_at,
  }
}
