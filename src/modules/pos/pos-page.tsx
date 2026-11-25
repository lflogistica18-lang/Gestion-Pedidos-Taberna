import { useState } from 'react'
import { TicketPedidoPropio } from './components/TicketPedidoPropio'
import type { OrderWithItems } from './hooks/useActiveOrders'
import { useProducts } from '@/modules/products/hooks/useProducts'
import { useCategories } from '@/modules/products/hooks/useCategories'
import { useCartStore } from './store/useCartStore'
import { useEnviarPedido } from './hooks/useEnviarPedido'
import { useActiveOrders } from './hooks/useActiveOrders'
import { CatalogoPos } from './components/CatalogoPos'
import { BuscadorProductos } from './components/BuscadorProductos'
import { CartPanel } from './components/CartPanel'
import { ActiveOrdersPanel } from './components/ActiveOrdersPanel'
import { ClipboardList, PlusCircle } from 'lucide-react'
import { EstadoError } from '@/shared/components/comunes/EstadoError'
import { Boton, EncabezadoPagina, FiltrosPastilla, Modal, Pastilla } from '@/shared/components/panel'
import { BarraCarrito } from './components/BarraCarrito'
import { AvisoEditandoPedido } from './components/AvisoEditandoPedido'
import { ModalReemplazarCarrito } from './components/ModalReemplazarCarrito'

export default function PosPage() {
  const [categoriaElegida, setCategoriaElegida] = useState<string>('')
  const [busqueda, setBusqueda] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [ordersOpen, setOrdersOpen] = useState(false)

  // Pedido a medio cargar que se pisaría al tocar "Editar" en otro (pide confirmación)
  const [pedidoPorEditar, setPedidoPorEditar] = useState<OrderWithItems | null>(null)

  const { categories } = useCategories()
  const { products, loading, error: productsError, refetch: refetchProducts } = useProducts({ activeOnly: true })
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

  const editando = useCartStore((s) => s.editando)
  const cargarPedido = useCartStore((s) => s.cargarPedido)
  // Suscripción a los ítems: sin esto la barra "Ver pedido" del celu no se entera de que se sumó algo
  const itemCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0))
  const total = useCartStore((s) => s.items.reduce((n, i) => n + i.unitPrice * i.quantity, 0))

  const { submitting, error, confirmar, pedidoAImprimir, soltarPedidoAImprimir } = useEnviarPedido({
    alTerminar: () => setCartOpen(false),
    refrescarPedidos: () => void refetchOrders(),
  })

  // Editar un pedido desde "Pedidos": el carrito pasa a ser ese pedido (mismo número)
  const empezarEdicion = (order: OrderWithItems) => {
    cargarPedido(order)
    setPedidoPorEditar(null)
    setOrdersOpen(false)
  }
  const pedirEditar = (order: OrderWithItems) => {
    const { items: enCurso, editando: enEdicion } = useCartStore.getState()
    if (enEdicion?.orderId === order.id) setOrdersOpen(false) // ya lo está editando: no se pisan sus cambios
    else if (enCurso.length > 0) setPedidoPorEditar(order)
    else empezarEdicion(order)
  }

  const cantidadPorCategoria = (nombre: string) => products.filter((p) => p.category === nombre).length

  return (
    <div className="flex min-h-full flex-col md:h-full md:flex-row">
      <TicketPedidoPropio pedido={pedidoAImprimir} alTerminarDialogo={soltarPedidoAImprimir} />

      <div className="flex min-w-0 flex-1 flex-col md:overflow-y-auto">
        <div className="flex-1 px-4 py-3 sm:px-6 sm:py-6">
          <AvisoEditandoPedido className="mb-3" />
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
                <BuscadorProductos value={busqueda} onChange={setBusqueda} />
                {/* Pastillas solo en celular; en tablet se elige con tarjetas grandes */}
                {/* Con una categoría elegida (sin búsqueda) se quitan: queda la cabecera compacta con "Todas" */}
                <div className={activeCategory && busqueda.trim() === '' ? 'hidden' : 'md:hidden'}>
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
              </div>
            }
          />

          {productsError ? (
            <EstadoError mensaje={productsError} onReintentar={refetchProducts} />
          ) : (
            <CatalogoPos
              products={products}
              categories={categories}
              loading={loading}
              activeCategory={activeCategory}
              onElegirCategoria={setCategoriaElegida}
              busqueda={busqueda}
            />
          )}
        </div>

        {itemCount > 0 && <BarraCarrito cantidad={itemCount} total={total} onAbrir={() => setCartOpen(true)} />}
      </div>

      {/* Carrito fijo a la derecha desde md */}
      <aside
        aria-label="Pedido en curso"
        className="hidden w-80 shrink-0 border-l border-borde-sutil bg-bg-tarjeta md:block lg:w-[360px]"
      >
        <CartPanel variante="panel" submitting={submitting} error={error} onConfirm={() => void confirmar()} />
      </aside>

      {/* Carrito como hoja inferior solo en celu */}
      <Modal
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        title={editando ? `Pedido #${editando.orderNumber}` : 'Pedido'}
        subtitulo={`${itemCount} ${itemCount === 1 ? 'ítem' : 'ítems'}`}
      >
        <CartPanel variante="hoja" submitting={submitting} error={error} onConfirm={() => void confirmar()} />
      </Modal>

      <ActiveOrdersPanel
        open={ordersOpen}
        onClose={() => setOrdersOpen(false)}
        orders={activeOrders}
        loading={ordersLoading}
        error={ordersError}
        refetch={refetchOrders}
        onEditar={pedirEditar}
      />

      <ModalReemplazarCarrito
        numeroPedido={pedidoPorEditar?.order_number ?? null}
        onConfirmar={() => pedidoPorEditar && empezarEdicion(pedidoPorEditar)}
        onCancelar={() => setPedidoPorEditar(null)}
      />
    </div>
  )
}
