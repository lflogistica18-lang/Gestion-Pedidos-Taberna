import { useEffect, useRef, useState } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Receipt } from './Receipt'
import { PreguntaSalioTicket } from './PreguntaSalioTicket'
import type { OrderWithItems } from '../hooks/useActiveOrders'
import { useEncolarImpresion } from '../hooks/useEncolarImpresion'
import { Modal, mostrarToast } from '@/shared/components/panel'

// PROVISORIO-WIFI: sacar este componente (y su uso en pos-page) el día que haya impresión directa por WiFi.

interface Props {
  /** Pedido recién confirmado en este aparato; al cambiar a un pedido, abre el diálogo de imprimir. */
  pedido: OrderWithItems | null
  /** Se llama cuando se cierra el diálogo de imprimir (ya se puede soltar `pedido`). */
  alTerminarDialogo: () => void
}

/**
 * Imprime el ticket de un pedido tomado en la misma compu y, al cerrarse el diálogo del
 * navegador (que no dice si se imprimió o se canceló), pregunta si salió. Si no salió,
 * el ticket pasa a la franja "Para imprimir".
 */
export function TicketPedidoPropio({ pedido, alTerminarDialogo }: Props) {
  const ticketRef = useRef<HTMLDivElement>(null)
  const pedidoRef = useRef<OrderWithItems | null>(null)
  const [preguntando, setPreguntando] = useState<OrderWithItems | null>(null)
  const { encolar } = useEncolarImpresion()

  const imprimirTicket = useReactToPrint({
    contentRef: ticketRef,
    documentTitle: pedido ? `Ticket_Pedido_${pedido.order_number}` : 'Ticket',
    onAfterPrint: () => {
      const impreso = pedidoRef.current
      pedidoRef.current = null
      alTerminarDialogo()
      if (impreso) setPreguntando(impreso)
    },
  })

  // Se imprime recién cuando el ticket ya está montado en el DOM
  useEffect(() => {
    if (!pedido) return
    pedidoRef.current = pedido
    imprimirTicket()
  }, [pedido, imprimirTicket])

  const dejarPendiente = async () => {
    const p = preguntando
    if (!p) return
    setPreguntando(null)
    const { error } = await encolar(p.id)
    if (error) {
      mostrarToast(`No se pudo dejar pendiente el ticket del pedido #${p.order_number}: ${error}. Reimprimí desde Pedidos.`, 'error')
    } else {
      mostrarToast(`Pedido #${p.order_number} queda para imprimir`, 'info')
    }
  }

  return (
    <>
      {pedido && (
        <div style={{ display: 'none' }}>
          <Receipt ref={ticketRef} order={pedido} />
        </div>
      )}
      {/* Cerrar con X o Escape = "No, dejar pendiente": ante la duda no se pierde el ticket */}
      <Modal open={preguntando !== null} onClose={() => void dejarPendiente()} title="¿Salió el ticket?">
        {preguntando && (
          <PreguntaSalioTicket
            numeroPedido={preguntando.order_number}
            numeroGrande
            onSi={() => setPreguntando(null)}
            onNo={() => void dejarPendiente()}
          />
        )}
      </Modal>
    </>
  )
}
