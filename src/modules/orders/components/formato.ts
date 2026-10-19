// Utilidades de presentación del historial: etiquetas y fechas.
import { Bike, Utensils, Zap, type LucideIcon } from 'lucide-react'
import type { OrderStatus, OrderType, PaymentMethod } from '@/types/database.types'
import type { TonoPastilla } from '@/shared/components/panel'

export const ETIQUETA_TIPO: Record<OrderType, string> = {
  local: 'Local',
  delivery: 'Delivery',
  directo: 'Directo',
}

export const ETIQUETA_PAGO: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  transferencia: 'Transferencia',
}

export const ESTADO_PEDIDO: Record<OrderStatus, { tono: TonoPastilla; etiqueta: string }> = {
  pendiente: { tono: 'ambar', etiqueta: 'Pendiente' },
  en_preparacion: { tono: 'azul', etiqueta: 'En preparación' },
  listo: { tono: 'verde', etiqueta: 'Listo' },
  entregado: { tono: 'neutro', etiqueta: 'Entregado' },
  cancelado: { tono: 'rojo', etiqueta: 'Cancelado' },
}

export const ESTADOS_EN_CURSO: OrderStatus[] = ['pendiente', 'en_preparacion', 'listo']

// Fecha local YYYY-MM-DD — NO usar toISOString(): en UTC-3 a las 21hs ya es mañana
export function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** "19/10 21:35" */
export function fmtFechaCorta(iso: string): string {
  const f = new Date(iso)
  const dia = f.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  const hora = f.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${dia} ${hora}`
}

/** "19/10/2026, 21:35" */
export function fmtFechaCompleta(iso: string): string {
  const f = new Date(iso)
  const dia = f.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = f.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${dia} ${hora}`
}

export function fmtHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export const ICONO_TIPO: Record<OrderType, LucideIcon> = {
  local: Utensils,
  delivery: Bike,
  directo: Zap,
}

/** Columnas de la tabla (≥ md). La cabecera usa la misma. */
export const COLUMNAS_PEDIDO = 'md:grid-cols-[6.5rem_minmax(0,1.3fr)_7rem_8rem_9rem_7rem_1rem]'

