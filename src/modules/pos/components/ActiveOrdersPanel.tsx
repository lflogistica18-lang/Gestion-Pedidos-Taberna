import { Bell, ChefHat, Clock, type LucideIcon } from 'lucide-react'
import type { OrderWithItems } from '../hooks/useActiveOrders'
import { useUpdateOrderStatus } from '../hooks/useUpdateOrderStatus'
import { ActiveOrderCard } from './ActiveOrderCard'
import { EstadoError } from '@/shared/components/comunes/EstadoError'
import { EstadoVacio } from '@/shared/components/comunes/EstadoVacio'
import { EncabezadoSeccion, Modal, mostrarToast } from '@/shared/components/panel'

interface ActiveOrdersPanelProps {
  open: boolean
  onClose: () => void
  orders: OrderWithItems[]
  loading: boolean
  error: string | null
  refetch: () => void
  /** Tocaron "Editar" en un pedido: la pantalla carga ese pedido en el carrito. */
  onEditar: (order: OrderWithItems) => void
}

const STATUS_ORDER = ['listo', 'en_preparacion', 'pendiente'] as const

const GRUPOS: Record<(typeof STATUS_ORDER)[number], { titulo: string; icono: LucideIcon }> = {
  listo: { titulo: 'Listos para entregar', icono: Bell },
  en_preparacion: { titulo: 'En preparación', icono: ChefHat },
  pendiente: { titulo: 'Pendientes', icono: Clock },
}

export function ActiveOrdersPanel({ open, onClose, orders, loading, error, refetch, onEditar }: ActiveOrdersPanelProps) {
  const { updatingId, updateStatus } = useUpdateOrderStatus()

  const handleDeliver = async (orderId: string) => {
    const { error: err } = await updateStatus(orderId, 'entregado')
    if (err) mostrarToast('No se pudo actualizar el pedido: ' + err, 'error')
  }

  const grupos = STATUS_ORDER
    .map((status) => ({ status, pedidos: orders.filter((o) => o.status === status) }))
    .filter((g) => g.pedidos.length > 0)

  return (
    <Modal open={open} onClose={onClose} title="Pedidos activos" subtitulo={`${orders.length} en curso`} wide>
      {loading ? (
        <div className="space-y-3" role="status" aria-label="Cargando pedidos">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-superficie-2" />
          ))}
        </div>
      ) : error ? (
        <EstadoError mensaje={error} onReintentar={refetch} />
      ) : orders.length === 0 ? (
        <EstadoVacio mensaje="No hay pedidos en curso" icono={<Clock size={26} />} />
      ) : (
        <div className="space-y-6">
          {grupos.map(({ status, pedidos }) => {
            const { titulo, icono: Icono } = GRUPOS[status]
            return (
              <section key={status} className="space-y-3">
                <EncabezadoSeccion icono={<Icono size={16} />} titulo={titulo} subtitulo={`${pedidos.length} ${pedidos.length === 1 ? 'pedido' : 'pedidos'}`} />
                {pedidos.map((order) => (
                  <ActiveOrderCard
                    key={order.id}
                    order={order}
                    updating={updatingId === order.id}
                    onDeliver={handleDeliver}
                    onEditar={onEditar}
                    onAnulado={refetch}
                  />
                ))}
              </section>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
