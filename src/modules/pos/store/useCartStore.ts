import { create } from 'zustand'
import type { Product, OrderType, PaymentMethod } from '@/types/database.types'

export interface CartItem {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
}

interface CartStore {
  // Estado
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

export const useCartStore = create<CartStore>((set, get) => ({
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

  clearCart: () => set({ items: [], notes: '', customerName: '', deliveryAddress: '' }),

  setOrderType: (orderType) => set({ orderType }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setNotes: (notes) => set({ notes }),
  setCustomerName: (customerName) => set({ customerName }),
  setDeliveryAddress: (deliveryAddress) => set({ deliveryAddress }),

  getTotal: () =>
    get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),

  getItemCount: () =>
    get().items.reduce((sum, i) => sum + i.quantity, 0),
}))
