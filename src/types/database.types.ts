export type ProductCategory = string
export type OrderStatus = 'pendiente' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado'
export type OrderType = 'local' | 'delivery' | 'directo'
export type PaymentMethod = 'efectivo' | 'transferencia'

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
