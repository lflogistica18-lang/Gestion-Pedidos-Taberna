import { Bike, Clock, Printer, Store, UtensilsCrossed } from 'lucide-react'
import type { TrabajoPendiente } from '../hooks/useImpresionesPendientes'
import { Boton } from '@/shared/components/panel'
import { useMinutosDesde } from '@/shared/hooks/useMinutosDesde'

// PROVISORIO-WIFI: sacar este componente el día que haya impresora WiFi.

const TIPOS: Record<string, { label: string; Icono: typeof Store }> = {
  local: { label: 'Local', Icono: UtensilsCrossed },
  delivery: { label: 'Delivery', Icono: Bike },
  directo: { label: 'Directo', Icono: Store },
}

interface Props {
  trabajo: TrabajoPendiente
  ocupado: boolean
  onImprimir: (trabajo: TrabajoPendiente) => void
}

export function FilaParaImprimir({ trabajo, ocupado, onImprimir }: Props) {
  const pedido = trabajo.orders
  const minutos = useMinutosDesde(trabajo.created_at)
  if (!pedido) return null
  const tipo = TIPOS[pedido.type] ?? { label: pedido.type, Icono: UtensilsCrossed }
  const cantidad = pedido.order_items.reduce((suma, i) => suma + i.quantity, 0)

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-borde-sutil bg-bg-tarjeta p-3">
      <div className="min-w-0 space-y-1">
        <p className="text-lg font-bold text-texto-primario">#{pedido.order_number}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-texto-secundario">
          <span className="inline-flex items-center gap-1">
            <tipo.Icono size={14} aria-hidden="true" />
            {tipo.label}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={14} aria-hidden="true" />
            hace {minutos} min
          </span>
          <span>{cantidad} {cantidad === 1 ? 'ítem' : 'ítems'}</span>
        </p>
        {pedido.customer_name && <p className="break-words text-sm text-texto-primario">{pedido.customer_name}</p>}
      </div>
      <Boton variante="primario" className="min-h-11 min-w-11 shrink-0" onClick={() => onImprimir(trabajo)} disabled={ocupado}>
        <Printer size={16} />
        Imprimir
      </Boton>
    </li>
  )
}
