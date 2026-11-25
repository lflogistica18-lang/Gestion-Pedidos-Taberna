import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Product, OrderType, PaymentMethod } from '@/types/database.types'
import type { OrderWithItems } from '../hooks/useActiveOrders'

export interface CartItem {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
}

/** Pedido que se está modificando desde el carrito (null = pedido nuevo). */
export interface PedidoEnEdicion {
  orderId: string
  orderNumber: number
}

interface CartStore {
  // Estado
  editando: PedidoEnEdicion | null
  items: CartItem[]
  orderType: OrderType
  paymentMethod: PaymentMethod
  notes: string
  customerName: string
  deliveryAddress: string

  // Acciones de carrito
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, delta: number) => void
  clearCart: () => void

  // Modo edición: el carrito pasa a ser el pedido existente
  cargarPedido: (order: OrderWithItems) => void
  salirDeEdicion: () => void

  // Checkout
  setOrderType: (type: OrderType) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setNotes: (notes: string) => void
  setCustomerName: (name: string) => void
  setDeliveryAddress: (address: string) => void

  // Computed
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
  editando: null,
  items: [],
  orderType: 'local',
  paymentMethod: 'efectivo',
  notes: '',
  customerName: '',
  deliveryAddress: '',
  addItem: (product) => {
    set((state) => {
      const existing = state.items.find((i) => i.productId === product.id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        }
      }
      return {
        items: [
          ...state.items,
          {
            productId: product.id,
            productName: product.name,
            unitPrice: product.price,
            quantity: 1,
          },
        ],
      }
    })
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    }))
  },

  updateQuantity: (productId, delta) => {
    set((state) => {
      const updated = state.items.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.max(0, i.quantity + delta) }
          : i
      )
      return { items: updated.filter((i) => i.quantity > 0) }
    })
  },

  // Cada pedido nuevo arranca en Local: si es delivery, se elige a mano
  clearCart: () => set({ items: [], orderType: 'local', notes: '', customerName: '', deliveryAddress: '', editando: null }),

  cargarPedido: (order) =>
    set({
      editando: { orderId: order.id, orderNumber: order.order_number },
      items: order.order_items.flatMap((l) =>
        l.product_id
          ? [{ productId: l.product_id, productName: l.product_name, unitPrice: l.unit_price, quantity: l.quantity }]
          : [],
      ),
      orderType: order.type,
      paymentMethod: order.payment_method,
      notes: order.notes ?? '',
      customerName: order.customer_name ?? '',
      deliveryAddress: order.delivery_address ?? '',
    }),

  salirDeEdicion: () => set({ items: [], orderType: 'local', notes: '', customerName: '', deliveryAddress: '', editando: null }),

  setOrderType: (orderType) => set({ orderType }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setNotes: (notes) => set({ notes }),
  setCustomerName: (customerName) => set({ customerName }),
  setDeliveryAddress: (deliveryAddress) => set({ deliveryAddress }),

  getTotal: () =>
    get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),

  getItemCount: () =>
    get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      // Sobrevive a una recarga (p. ej. actualización automática) sin borrar el pedido en curso
      name: 'sgp.carrito',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        editando: s.editando,
        items: s.items,
        orderType: s.orderType,
        paymentMethod: s.paymentMethod,
        notes: s.notes,
        customerName: s.customerName,
        deliveryAddress: s.deliveryAddress,
      }),
    }
  )
)
