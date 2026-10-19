import { useRef } from 'react'
import { Bike, Check, Clock, Printer, Store, Trash2, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import type { OrderWithItems } from '../hooks/useActiveOrders'
import { Receipt } from './Receipt'
import { Boton, fmtMonto, IconButton, mostrarToast, Pastilla } from '@/shared/components/panel'
import type { TonoPastilla } from '@/shared/components/panel'
import { cn } from '@/shared/lib/cn'
import { useMinutosDesde } from '@/shared/hooks/useMinutosDesde'
import { useConfiguracion } from '@/shared/store/useConfiguracion'
import { useEncolarImpresion } from '../hooks/useEncolarImpresion'

const ESTADOS: Record<string, { label: string; tono: TonoPastilla }> = {
  pendiente: { label: 'Pendiente', tono: 'ambar' },
  en_preparacion: { label: 'En preparación', tono: 'azul' },
  listo: { label: 'Listo', tono: 'verde' },
  entregado: { label: 'Entregado', tono: 'neutro' },
  cancelado: { label: 'Cancelado', tono: 'rojo' },
}

const TIPOS: Record<string, { label: string; icono: LucideIcon }> = {
  local: { label: 'Local', icono: UtensilsCrossed },
  delivery: { label: 'Delivery', icono: Bike },
  directo: { label: 'Directo', icono: Store },
}

const MEDIOS_PAGO: Record<string, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  transferencia: 'Transferencia',
}

interface ActiveOrderCardProps {
  order: OrderWithItems
  updating: boolean
  onDeliver: (orderId: string) => void
  onDelete: (orderId: string) => void
}

export function ActiveOrderCard({ order, updating, onDeliver, onDelete }: ActiveOrderCardProps) {
  const estado = ESTADOS[order.status] ?? { label: order.status, tono: 'neutro' as const }
  const tipo = TIPOS[order.type] ?? { label: order.type, icono: UtensilsCrossed }
  const IconoTipo = tipo.icono
  const isReady = order.status === 'listo'
  const cocinaActiva = useConfiguracion((s) => s.config.cocina_activa)
  const modoImpresion = useConfiguracion((s) => s.config.modo_impresion)
  // Sin pantalla de cocina nadie marca "listo": la caja entrega desde cualquier estado activo
  const puedeEntregar = cocinaActiva ? isReady : order.status !== 'entregado' && order.status !== 'cancelado'

  const minutesAgo = useMinutosDesde(order.created_at)

  const printRef = useRef<HTMLDivElement>(null)

  const imprimirEnNavegador = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Ticket_Pedido_${order.order_number}`
  })
  const { encolando, encolar } = useEncolarImpresion()

  // Reimprimir: en modo 'servidor' va a la cola; si no, diálogo del navegador (RawBT)
  const handlePrint = async () => {
    if (modoImpresion !== 'servidor') {
      imprimirEnNavegador()
      return
    }
    const { error } = await encolar(order.id)
    if (error) mostrarToast('No se pudo mandar a imprimir: ' + error, 'error')
  }

  return (
    <article
      className={cn(
        'rounded-xl border p-3 sm:p-4',
        isReady ? 'border-tono-verde-borde bg-tono-verde-fondo/60' : 'border-borde-sutil bg-bg-tarjeta',
      )}
    >
      {/* Componente de Impresión Oculto */}
      <div style={{ display: 'none' }}>
        <Receipt ref={printRef} order={order} />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-bold text-texto-primario">#{order.order_number}</span>
            <Pastilla tono={estado.tono} conPunto>{estado.label}</Pastilla>
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-texto-secundario">
            <span className="inline-flex items-center gap-1">
              <IconoTipo size={14} aria-hidden="true" />
              {tipo.label}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={14} aria-hidden="true" />
              hace {minutesAgo} min
            </span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold tabular-nums text-texto-primario">{fmtMonto(order.total)}</p>
          <p className="text-xs text-texto-secundario">{MEDIOS_PAGO[order.payment_method] ?? order.payment_method}</p>
        </div>
      </div>

      {(order.customer_name || order.delivery_address) && (
        <p className="mt-2 break-words text-sm text-texto-primario">
          {order.customer_name}
          {order.customer_name && order.delivery_address && <span className="text-texto-secundario"> · </span>}
          {order.delivery_address && <span className="text-texto-secundario">{order.delivery_address}</span>}
        </p>
      )}

      <ul className="mt-2 space-y-0.5 text-sm text-texto-primario">
        {order.order_items.map((item) => (
          <li key={item.id} className="break-words">
            <span className="font-semibold tabular-nums">{item.quantity}×</span> {item.product_name}
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="mt-2 break-words rounded-lg bg-superficie-2 px-2.5 py-1.5 text-sm text-texto-secundario">
          Nota: {order.notes}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-borde-sutil pt-2">
        <IconButton etiqueta="Reimprimir" onClick={handlePrint} disabled={updating || encolando}>
          <Printer size={18} />
        </IconButton>
        <IconButton
          etiqueta="Enviar a la papelera"
          variante="peligro"
          onClick={() => {
            if (window.confirm('¿Estás seguro de eliminar este pedido?')) {
              onDelete(order.id)
            }
          }}
          disabled={updating}
        >
          <Trash2 size={18} />
        </IconButton>
        {/* Solo cajero marca entregado (con cocina: cuando está listo) */}
        {puedeEntregar && (
          <Boton variante="primario" className="sm:min-h-11" onClick={() => onDeliver(order.id)} disabled={updating}>
            <Check size={16} />
            {updating ? 'Entregando...' : 'Entregar'}
          </Boton>
        )}
      </div>
    </article>
  )
}
