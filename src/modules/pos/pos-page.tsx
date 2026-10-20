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
import { ClipboardList, PlusCircle, Search, X } from 'lucide-react'
import { EstadoError } from '@/shared/components/comunes/EstadoError'
import { Boton, EncabezadoPagina, Entrada, FiltrosPastilla, IconButton, Modal, Pastilla, mostrarToast } from '@/shared/components/panel'
import { BarraCarrito } from './components/BarraCarrito'
import { useEncolarImpresion } from './hooks/useEncolarImpresion'
import { useConfiguracion } from '@/shared/store/useConfiguracion'
import { medioDePagoValido } from '@/shared/lib/config'

/** Minúsculas y sin acentos, para buscar sin distinguir. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export default function PosPage() {
  const [categoriaElegida, setCategoriaElegida] = useState<string>('')
  const modoImpresion = useConfiguracion((s) => s.config.modo_impresion)
  const mediosPago = useConfiguracion((s) => s.config.medios_pago)
  const [busqueda, setBusqueda] = useState('')
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

  // Categoría activa derivada: '' = todas. Si la elegida ya no existe (la renombraron)
  // cae a todas. Derivarla evita un setState dentro de un effect.
  const activeCategory = categories.some(c => c.name === categoriaElegida) ? categoriaElegida : ''

  const items = useCartStore((s) => s.items)
  const orderType = useCartStore((s) => s.orderType)
  const paymentMethod = useCartStore((s) => s.paymentMethod)
  const notes = useCartStore((s) => s.notes)
  const customerName = useCartStore((s) => s.customerName)
  const deliveryAddress = useCartStore((s) => s.deliveryAddress)
  const getTotal = useCartStore((s) => s.getTotal)
  const getItemCount = useCartStore((s) => s.getItemCount)
  const clearCart = useCartStore((s) => s.clearCart)

  // Con texto en el buscador se busca en todas las categorías
  const textoBusqueda = normalizar(busqueda.trim())
  const buscando = textoBusqueda !== ''
  const filteredProducts = products.filter((p) =>
    buscando ? normalizar(p.name).includes(textoBusqueda) : !activeCategory || p.category === activeCategory,
  )

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
        <div className="flex-1 px-4 py-3 sm:px-6 sm:py-6">
          <EncabezadoPagina
            icono={<PlusCircle size={22} />}
            titulo="Pedido +"
            enLinea
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
              <div className="flex flex-col gap-2 sm:gap-3">
              <div className="relative">
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-secundario" aria-hidden="true" />
                <Entrada
                  type="search"
                  aria-label="Buscar producto"
                  placeholder="Buscar producto…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  autoComplete="off"
                  className="w-full pl-10 pr-12 [&::-webkit-search-cancel-button]:appearance-none"
                />
                {busqueda && (
                  <IconButton
                    etiqueta="Borrar búsqueda"
                    onClick={() => setBusqueda('')}
                    className="absolute right-0 top-1/2 -translate-y-1/2"
                  >
                    <X size={18} />
                  </IconButton>
                )}
              </div>
                <FiltrosPastilla
                  etiqueta="Categorías"
                contadorDesdeSm
                  value={activeCategory}
                  onChange={setCategoriaElegida}
                  opciones={[
                    { value: '', label: 'Todas', cantidad: loading ? undefined : products.length },
                    ...categories.map(({ name }) => ({
                      value: name,
                      label: name,
                      cantidad: loading ? undefined : cantidadPorCategoria(name),
                    })),
                  ]}
                />
              </div>
            }
          />

          {productsError ? (
            <EstadoError mensaje={productsError} onReintentar={refetchProducts} />
          ) : (
            <ProductGrid
              products={filteredProducts}
              loading={loading}
              agrupar={buscando || !activeCategory}
              mensajeVacio={buscando ? 'No hay productos que coincidan con la búsqueda' : 'No hay productos en esta categoría'}
            />
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
