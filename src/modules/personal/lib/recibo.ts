import type { Empleado, MedioPagoPersonal, PagoPersonal, PagoPersonalItem } from '@/types/database.types'
import type { DatosRecibo } from '../pdf/tipos'

export const ETIQUETA_MEDIO: Record<MedioPagoPersonal, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
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
    pagadoAt: pago.pagado_at,
  }
}
