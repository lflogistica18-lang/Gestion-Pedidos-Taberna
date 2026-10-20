// Configuración del local. Los valores reales viven en sgp.configuracion (migración 012)
// y se editan desde la pantalla Configuración; acá quedan los tipos y los valores por
// defecto, que se usan mientras carga o si la base falla (la app sigue funcionando).

import type { PaymentMethod } from '@/types/database.types'

// Cómo sale el ticket al confirmar un pedido:
// - 'navegador': se abre el diálogo de imprimir del celu/tablet (con RawBT, la comandera WiFi).
// - 'servidor': la app deja el ticket en la cola (sgp.print_jobs) y el print server de la PC
//   del local lo imprime solo (ver print-server/README.md). Requiere la migración 011.
export type ModoImpresion = 'navegador' | 'servidor'
export type PapelMm = 58 | 80

export interface Configuracion {
  nombre_local: string
  direccion: string | null
  telefono: string | null
  modo_impresion: ModoImpresion
  papel_mm: PapelMm
  pie_ticket: string
  /** Pantalla de Cocina (KDS). Apagada: la cocina trabaja con el ticket impreso. */
  cocina_activa: boolean
  /** Medios de pago que ofrece la Caja, en este orden. */
  medios_pago: PaymentMethod[]
}

export const CONFIGURACION_POR_DEFECTO: Configuracion = {
  nombre_local: 'La Taberna',
  direccion: null,
  telefono: null,
  modo_impresion: 'navegador',
  papel_mm: 80,
  pie_ticket: '¡Gracias por su compra!',
  cocina_activa: false,
  medios_pago: ['efectivo', 'transferencia'],
}

// Débito y transferencia se ofrecen juntos como "Déb / Transfer" (decisión del local,
// abril 2026); 'debito' queda disponible por si algún día se quieren separar.
export const ETIQUETAS_PAGO: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Déb / Transfer',
  debito: 'Débito',
}

export const ORDEN_PAGOS: PaymentMethod[] = ['efectivo', 'transferencia', 'debito']

/** El medio elegido si la Caja lo sigue ofreciendo; si no, el primero habilitado. */
export function medioDePagoValido(elegido: PaymentMethod, habilitados: PaymentMethod[]): PaymentMethod {
  return habilitados.includes(elegido) ? elegido : (habilitados[0] ?? 'efectivo')
}
