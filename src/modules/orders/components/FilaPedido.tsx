import { ChevronRight } from 'lucide-react'
import { fmtMonto } from '@/shared/components/panel'
import { cn } from '@/shared/lib/cn'
import type { OrderConDetalle } from '../hooks/useAdminOrders'
import { PastillaEstado } from './PastillaEstado'
import { COLUMNAS_PEDIDO, ETIQUETA_PAGO, ETIQUETA_TIPO, ICONO_TIPO, fmtFechaCorta } from './formato'

interface Props {
  pedido: OrderConDetalle
  onAbrir: (id: string) => void
}

export function FilaPedido({ pedido, onAbrir }: Props) {
  const enPapelera = !!pedido.deleted_at
  const cancelado = pedido.status === 'cancelado'
  const Icono = ICONO_TIPO[pedido.type]
  const tenue = enPapelera ? 'text-texto-secundario' : 'text-texto-primario'

  return (
    <li>
      <button
        type="button"
        onClick={() => onAbrir(pedido.id)}
        aria-label={`Ver pedido número ${pedido.order_number}`}
        className={cn(
          'block w-full text-left transition-colors hover:bg-superficie-2',
          'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-acento-primario',
          cancelado && !enPapelera && 'bg-tono-rojo-fondo/60 hover:bg-tono-rojo-fondo',
        )}
      >
        {/* Celu: card */}
        <div className="flex min-h-16 items-center gap-3 px-4 py-3 md:hidden">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className={cn('font-bold', tenue)}>#{pedido.order_number}</span>
              <span className={cn('font-bold tabular-nums', tenue)}>{fmtMonto(pedido.total)}</span>
            </div>
            <p className={cn('truncate text-sm', tenue)}>{pedido.customer_name || '—'}</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <PastillaEstado estado={pedido.status} enPapelera={enPapelera} />
              <span className="inline-flex items-center gap-1 text-xs text-texto-secundario">
                <Icono size={13} aria-hidden="true" />
                {ETIQUETA_TIPO[pedido.type]} · {ETIQUETA_PAGO[pedido.payment_method]}
              </span>
            </div>
            <p className="text-xs text-texto-secundario">{fmtFechaCorta(pedido.created_at)}</p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-texto-secundario" aria-hidden="true" />
        </div>

        {/* Tabla */}
        <div className={cn('hidden min-h-14 items-center gap-4 px-4 py-3 md:grid', COLUMNAS_PEDIDO)}>
          <div>
            <p className={cn('font-bold', tenue)}>#{pedido.order_number}</p>
            <p className="text-xs text-texto-secundario">{fmtFechaCorta(pedido.created_at)}</p>
          </div>
          <div className="min-w-0">
            <p className={cn('truncate text-sm', tenue)}>{pedido.customer_name || '—'}</p>
            {pedido.delivery_address && (
              <p className="truncate text-xs text-texto-secundario">{pedido.delivery_address}</p>
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm text-texto-secundario">
            <Icono size={15} aria-hidden="true" />
            {ETIQUETA_TIPO[pedido.type]}
          </span>
          <span className="text-sm text-texto-secundario">{ETIQUETA_PAGO[pedido.payment_method]}</span>
          <div><PastillaEstado estado={pedido.status} enPapelera={enPapelera} /></div>
          <span className={cn('text-right font-bold tabular-nums', tenue)}>{fmtMonto(pedido.total)}</span>
          <ChevronRight size={16} className="text-texto-secundario" aria-hidden="true" />
        </div>
      </button>
    </li>
  )
}
