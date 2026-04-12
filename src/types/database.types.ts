export type ProductCategory = 'comida' | 'bebida' | 'postre'
export type OrderStatus = 'pendiente' | 'en_preparacion' | 'listo' | 'entregado'
export type OrderType = 'local' | 'delivery'
export type PaymentMethod = 'efectivo' | 'debito' | 'transferencia'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  price: number
  active: boolean
  created_at: string
  updated_at: string
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
