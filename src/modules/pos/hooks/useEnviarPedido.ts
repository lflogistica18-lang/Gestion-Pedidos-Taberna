import { useState } from 'react'
import { mostrarToast } from '@/shared/components/panel'
import { medioDePagoValido } from '@/shared/lib/config'
import { useConfiguracion } from '@/shared/store/useConfiguracion'
import { useAparato } from '@/shared/store/useAparato'
import { useCartStore } from '../store/useCartStore'
import { useCreateOrder } from './useCreateOrder'
import { useEditarPedido } from './useEditarPedido'
import { useEncolarImpresion } from './useEncolarImpresion'
import type { OrderWithItems } from './useActiveOrders'

interface Opciones {
  /** Después de guardar bien: cerrar la hoja del carrito, etc. */
  alTerminar: () => void
  /** Después de editar: refrescar los pedidos activos. */
  refrescarPedidos: () => void
}

interface UseEnviarPedidoResult {
  submitting: boolean
  error: string | null
  confirmar: () => Promise<void>
  /** Pedido que hay que imprimir en este aparato (lo toma TicketPedidoPropio). */
  pedidoAImprimir: OrderWithItems | null
  soltarPedidoAImprimir: () => void
}

/**
 * Confirma el carrito: crea un pedido nuevo o, si hay uno en edición, guarda los cambios en
 * ese mismo pedido. En los dos casos manda el ticket a imprimir por el mismo camino.
 */
export function useEnviarPedido({ alTerminar, refrescarPedidos }: Opciones): UseEnviarPedidoResult {
  const modoImpresion = useConfiguracion((s) => s.config.modo_impresion)
  const mediosPago = useConfiguracion((s) => s.config.medios_pago)
  const imprimeAca = useAparato((s) => s.imprimeAca)
  const editando = useCartStore((s) => s.editando)
  const { submitting, error: errorCrear, createOrder } = useCreateOrder()
  const { guardando, error: errorEditar, editarPedido } = useEditarPedido()
  const { encolar } = useEncolarImpresion()
  // Ticket para cocina: se imprime solo al confirmar cada pedido (PROVISORIO-WIFI)
  const [pedidoAImprimir, setPedidoAImprimir] = useState<OrderWithItems | null>(null)

  // `accion`: 'creado' o 'actualizado' (para el texto del aviso)
  const imprimir = async (pedido: OrderWithItems, accion: 'creado' | 'actualizado') => {
    const n = pedido.order_number
    if (modoImpresion === 'servidor') {
      // El pedido ya está guardado: si falla la cola, se avisa y se reimprime con 🖨️
      const { error: colaErr } = await encolar(pedido.id)
      if (colaErr) {
        mostrarToast(`Pedido #${n} ${accion}, pero no se mandó a imprimir: ${colaErr}. Reimprimí desde Pedidos.`, 'error')
      } else {
        mostrarToast(`Pedido #${n} ${accion} — enviado a la comandera`, 'exito')
      }
    } else if (!imprimeAca) {
      // PROVISORIO-WIFI: sacar esta rama (celu/tablet que no imprimen) cuando haya impresora WiFi
      const { error: colaErr } = await encolar(pedido.id)
      if (colaErr) {
        mostrarToast(`Pedido #${n} ${accion}, pero no quedó para imprimir: ${colaErr}. Reimprimí desde Pedidos.`, 'error')
      } else {
        mostrarToast(`Pedido #${n} ${accion} — queda para imprimir en la compu`, 'exito')
      }
    } else {
      setPedidoAImprimir(pedido)
      mostrarToast(`Pedido #${n} ${accion} — imprimiendo ticket`, 'exito')
    }
  }

  const confirmar = async () => {
    const c = useCartStore.getState()
    // Si Configuración apagó el medio elegido, se cobra con el primero habilitado (lo que ve el carrito)
    const paymentMethod = medioDePagoValido(c.paymentMethod, mediosPago)

    if (c.editando) {
      const { orderId, orderNumber } = c.editando
      const { guardado, pedido } = await editarPedido({
        orderId,
        items: c.items,
        orderType: c.orderType,
        paymentMethod,
        notes: c.notes,
        customerName: c.customerName,
        deliveryAddress: c.deliveryAddress,
      })
      // Si falló, no se pierde lo cargado: sigue en edición y la pantalla muestra el error
      if (!guardado) return
      c.clearCart()
      alTerminar()
      refrescarPedidos()
      if (pedido) {
        await imprimir(pedido, 'actualizado')
      } else {
        mostrarToast(`Pedido #${orderNumber} actualizado, pero no se pudo preparar el ticket. Reimprimí desde Pedidos.`, 'error')
      }
      return
    }

    const pedido = await createOrder({
      items: c.items,
      orderType: c.orderType,
      paymentMethod,
      notes: c.notes,
      customerName: c.customerName,
      deliveryAddress: c.deliveryAddress,
      total: c.getTotal(),
    })
    if (!pedido) return
    c.clearCart()
    alTerminar()
    await imprimir(pedido, 'creado')
  }

  return {
    submitting: submitting || guardando,
    error: editando ? errorEditar : errorCrear,
    confirmar,
    pedidoAImprimir,
    soltarPedidoAImprimir: () => setPedidoAImprimir(null),
  }
}
