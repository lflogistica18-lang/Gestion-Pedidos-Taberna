import { useState, useRef, useEffect } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Receipt } from './components/Receipt'
import type { OrderWithItems } from './hooks/useActiveOrders'
import { useProducts } from '@/modules/products/hooks/useProducts'
import { useCategories } from '@/modules/products/hooks/useCategories'
import { useCartStore } from './store/useCartStore'
import { useCreateOrder } from './hooks/useCreateOrder'
import { useActiveOrders } from './hooks/useActiveOrders'
import { ProductGrid } from './components/ProductGrid'
import { CartPanel } from './components/CartPanel'
import { ActiveOrdersPanel } from './components/ActiveOrdersPanel'
import { ClipboardList, ShoppingCart } from 'lucide-react'
import { EstadoError } from '@/shared/components/comunes/EstadoError'
import { Boton, EncabezadoPagina, FiltrosPastilla, Modal, Pastilla, mostrarToast } from '@/shared/components/panel'
import { BarraCarrito } from './components/BarraCarrito'
import { useEncolarImpresion } from './hooks/useEncolarImpresion'
import { useConfiguracion } from '@/shared/store/useConfiguracion'
import { medioDePagoValido } from '@/shared/lib/config'

export default function PosPage() {
  const [categoriaElegida, setCategoriaElegida] = useState<string>('')
  const modoImpresion = useConfiguracion((s) => s.config.modo_impresion)
  const mediosPago = useConfiguracion((s) => s.config.medios_pago)
  const [cartOpen, setCartOpen] = useState(false)
  const [ordersOpen, setOrdersOpen] = useState(false)

  // Ticket para cocina: se imprime solo al confirmar cada pedido
  const [pedidoAImprimir, setPedidoAImprimir] = useState<OrderWithItems | null>(null)
  const ticketRef = useRef<HTMLDivElement>(null)
  const imprimirTicket = useReactToPrint({
    contentRef: ticketRef,
    documentTitle: pedidoAImprimir ? `Ticket_Pedido_${pedidoAImprimir.order_number}` : 'Ticket',
    onAfterPrint: () => setPedidoAImprimir(null),
  })

  // Se imprime recién cuando el ticket ya está montado en el DOM
  useEffect(() => {
    if (pedidoAImprimir) imprimirTicket()
  }, [pedidoAImprimir, imprimirTicket])

  const { categories } = useCategories()
  const { products, loading, error: productsError, refetch: refetchProducts } = useProducts({ activeOnly: true })
  const { submitting, error, createOrder } = useCreateOrder()
  const { encolar } = useEncolarImpresion()
  const {
    orders: activeOrders,
    loading: ordersLoading,
    error: ordersError,
    activeCount,
    refetch: refetchOrders,
  } = useActiveOrders()

  // Categoría activa derivada: si la elegida no existe (todavía no cargaron, o
  // la renombraron) cae a la primera. Derivarla evita un setState dentro de un effect.
  const activeCategory = categories.some(c => c.name === categoriaElegida)
    ? categoriaElegida
    : (categories[0]?.name ?? '')

  const items = useCartStore((s) => s.items)
  const orderType = useCartStore((s) => s.orderType)
  const paymentMethod = useCartStore((s) => s.paymentMethod)
  const notes = useCartStore((s) => s.notes)
  const customerName = useCartStore((s) => s.customerName)
  const deliveryAddress = useCartStore((s) => s.deliveryAddress)
  const getTotal = useCartStore((s) => s.getTotal)
  const getItemCount = useCartStore((s) => s.getItemCount)
  const clearCart = useCartStore((s) => s.clearCart)

  const filteredProducts = products.filter((p) => p.category === activeCategory)

  const handleConfirm = async () => {
    const pedido = await createOrder({
      items,
      orderType,
      // Si Configuración apagó el medio elegido, se cobra con el primero habilitado (lo que ve el carrito)
      paymentMethod: medioDePagoValido(paymentMethod, mediosPago),
      notes,
      customerName,
      deliveryAddress,
      total: getTotal(),
    })

    if (pedido) {
      clearCart()
      setCartOpen(false)

      if (modoImpresion === 'servidor') {
        // El pedido ya está guardado: si falla la cola, se avisa y se reimprime con 🖨️
        const { error: colaErr } = await encolar(pedido.id)
        if (colaErr) {
          mostrarToast(`Pedido #${pedido.order_number} creado, pero no se mandó a imprimir: ${colaErr}. Reimprimí desde Pedidos.`, 'error')
        } else {
          mostrarToast(`Pedido #${pedido.order_number} creado — enviado a la comandera`, 'exito')
        }
      } else {
        setPedidoAImprimir(pedido)
        mostrarToast(`Pedido #${pedido.order_number} creado — imprimiendo ticket`, 'exito')
      }
    }
  }

  const itemCount = getItemCount()
  const total = getTotal()
  const cantidadPorCategoria = (nombre: string) => products.filter((p) => p.category === nombre).length

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:flex-row">
      {/* Ticket oculto — solo existe mientras se imprime */}
      {pedidoAImprimir && (
        <div style={{ display: 'none' }}>
          <Receipt ref={ticketRef} order={pedidoAImprimir} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:overflow-y-auto">
        <div className="flex-1 px-4 py-4 sm:px-6 sm:py-6">
          <EncabezadoPagina
            icono={<ShoppingCart size={22} />}
            titulo="Caja"
            detalle={`${filteredProducts.length} ${filteredProducts.length === 1 ? 'producto' : 'productos'}${activeCategory ? ` · ${activeCategory}` : ''}`}
            acciones={
              <>
                {ordersError && <Pastilla tono="rojo">No se pudieron cargar los pedidos</Pastilla>}
                <Boton
                  onClick={() => setOrdersOpen(true)}
                  aria-label={`Ver pedidos activos: ${activeCount}`}
                >
                  <ClipboardList size={16} />
                  Pedidos
                  {activeCount > 0 && <Pastilla tono="naranja">{activeCount}</Pastilla>}
                </Boton>
              </>
            }
            pestanas={
              <FiltrosPastilla
                etiqueta="Categorías"
                value={activeCategory}
                onChange={setCategoriaElegida}
                opciones={categories.map(({ name }) => ({
                  value: name,
                  label: name,
                  cantidad: loading ? undefined : cantidadPorCategoria(name),
                }))}
              />
            }
          />

          {productsError ? (
            <EstadoError mensaje={productsError} onReintentar={refetchProducts} />
          ) : (
            <ProductGrid products={filteredProducts} loading={loading} />
          )}
        </div>

        {itemCount > 0 && <BarraCarrito cantidad={itemCount} total={total} onAbrir={() => setCartOpen(true)} />}
      </div>

      {/* Carrito fijo a la derecha desde lg */}
      <aside
        aria-label="Pedido en curso"
        className="hidden w-[360px] shrink-0 border-l border-borde-sutil bg-bg-tarjeta lg:block"
      >
        <CartPanel variante="panel" submitting={submitting} error={error} onConfirm={handleConfirm} />
      </aside>

      {/* Carrito como hoja inferior en celu y tablet parada */}
      <Modal
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        title="Pedido"
        subtitulo={`${itemCount} ${itemCount === 1 ? 'ítem' : 'ítems'}`}
      >
        <CartPanel variante="hoja" submitting={submitting} error={error} onConfirm={handleConfirm} />
      </Modal>

      <ActiveOrdersPanel
        open={ordersOpen}
        onClose={() => setOrdersOpen(false)}
        orders={activeOrders}
        loading={ordersLoading}
        error={ordersError}
        refetch={refetchOrders}
      />
    </div>
  )
}
