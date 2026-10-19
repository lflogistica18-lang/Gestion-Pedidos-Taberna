import type { OrderConDetalle } from '../hooks/useAdminOrders'
import { FilaPedido } from './FilaPedido'
import { COLUMNAS_PEDIDO } from './formato'
import { cn } from '@/shared/lib/cn'

interface Props {
  pedidos: OrderConDetalle[]
  onAbrir: (id: string) => void
}

const ENCABEZADOS = ['Pedido', 'Cliente', 'Tipo', 'Pago', 'Estado']

export function ListaPedidos({ pedidos, onAbrir }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-borde-sutil bg-bg-tarjeta shadow-tarjeta">
      <div
        aria-hidden="true"
        className={cn('hidden gap-4 border-b border-borde-sutil bg-superficie-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-texto-secundario md:grid', COLUMNAS_PEDIDO)}
      >
        {ENCABEZADOS.map((h) => <span key={h}>{h}</span>)}
        <span className="text-right">Total</span>
        <span />
      </div>
      <ul className="divide-y divide-borde-sutil">
        {pedidos.map((p) => <FilaPedido key={p.id} pedido={p} onAbrir={onAbrir} />)}
      </ul>
    </div>
  )
}
