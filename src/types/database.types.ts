export type ProductCategory = string
export type OrderStatus = 'pendiente' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado'
export type OrderType = 'local' | 'delivery' | 'directo'
export type PaymentMethod = 'efectivo' | 'debito' | 'transferencia'

export interface ProductCategoryRow {
  id: string
  name: string
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Product {
  id: string
  name: string
  category: ProductCategory
  price: number
  cost: number  // Valor de costo — para calcular margen de ganancia
  active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Order {
  id: string
  order_number: number
  type: OrderType
  status: OrderStatus
  payment_method: PaymentMethod
  total: number
  notes: string | null
  customer_name: string | null
  delivery_address: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  // Migración 014: anulación con motivo y marca de edición
  anulado_por?: string | null
  motivo_anulacion?: string | null
  editado_at?: string | null
  ediciones?: number
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string  // snapshot
  unit_price: number    // snapshot
  quantity: number
  notes: string | null
  subtotal: number      // generado por DB
}

export interface OrderStatusLog {
  id: string
  order_id: string
  action: string
  previous_status: string | null
  new_status: string
  created_at: string
}

// ─── Personal (migración 016) ───────────────────────────────────
// Montos en pesos. Los totales de pagos_personal los llena un trigger de la base.
export type TipoConcepto = 'extra' | 'descuento'
export type ModoConcepto = 'fijo' | 'porcentaje' | 'por_unidad' | 'dias_de_sueldo'
export type EstadoPago = 'borrador' | 'pagado' | 'anulado'
export type MedioPagoPersonal = 'efectivo' | 'transferencia'
export type TipoNovedad = 'inasistencia' | 'llegada_tarde' | 'adelanto' | 'charla' | 'otro'

export interface Empleado {
  id: string
  nombre: string
  telefono: string | null
  sueldo_semanal: number
  dias_por_semana: number
  fecha_ingreso: string | null
  notas: string | null
  active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ConceptoPago {
  id: string
  nombre: string
  tipo: TipoConcepto
  modo: ModoConcepto
  valor: number
  active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PagoPersonal {
  id: string
  empleado_id: string
  semana_desde: string
  semana_hasta: string
  sueldo_semanal: number
  dias_por_semana: number
  total_extras: number
  total_descuentos: number
  total_a_cobrar: number
  estado: EstadoPago
  pagado_at: string | null
  medio_pago: MedioPagoPersonal | null
  recibo_ruta: string | null
  notas: string | null
  anulado_at: string | null
  anulado_motivo: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PagoPersonalItem {
  id: string
  pago_id: string
  concepto_id: string | null
  nombre: string
  tipo: TipoConcepto
  modo: ModoConcepto
  valor: number
  cantidad: number
  monto: number
  novedad_id: string | null
  created_at: string
  deleted_at: string | null
}

export interface NovedadPersonal {
  id: string
  empleado_id: string
  fecha: string
  tipo: TipoNovedad
  detalle: string
  monto: number | null
  descontar: boolean
  pago_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}
