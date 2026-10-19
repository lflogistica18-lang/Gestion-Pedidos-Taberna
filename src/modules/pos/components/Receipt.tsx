import { forwardRef } from 'react'
import type { OrderWithItems } from '../hooks/useActiveOrders'

const TYPE_LABELS: Record<string, string> = {
  local: 'Local',
  delivery: 'Delivery',
  directo: 'Directo',
}

const PAGO_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  transferencia: 'Déb / Transfer',
}

function precio(n: number): string {
  return '$' + Number(n).toLocaleString('es-AR')
}

interface ReceiptProps {
  order: OrderWithItems,
  tabernaName?: string
}

// Ticket que va a la cocina con el pedido (y que puede acompañar al delivery):
// ítems con precio, total, pago y dirección si la hay.
export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({ order, tabernaName = "Taberna" }, ref) => {
  const dateObj = new Date(order.created_at)
  const dFormat = dateObj.toLocaleDateString('es-AR')
  const tFormat = dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div ref={ref} className="print-receipt">
      <div className="print-receipt__header">
        <h2 className="print-receipt__title">{tabernaName}</h2>
        <p className="print-receipt__number">PEDIDO #{order.order_number}</p>
        <div className="print-receipt__meta">
          <p>Fecha: {dFormat} {tFormat}</p>
          <p>Tipo: <span className="print-receipt__bold">{TYPE_LABELS[order.type] ?? order.type}</span></p>
          <p>Pago: {PAGO_LABELS[order.payment_method] ?? order.payment_method}</p>
        </div>
        {(order.customer_name || order.delivery_address) && (
          <div className="print-receipt__customer">
            {order.customer_name && <p>Cliente: {order.customer_name}</p>}
            {order.delivery_address && (
              <p className="print-receipt__bold">Dirección: {order.delivery_address}</p>
            )}
          </div>
        )}
      </div>

      <div className="print-receipt__divider">--------------------------------</div>

      <table className="print-receipt__items">
        <thead>
          <tr>
            <th className="qty">Cant</th>
            <th className="desc">Descripción</th>
            <th className="amt">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.order_items.map((item) => (
            <tr key={item.id}>
              <td className="qty">{item.quantity}</td>
              <td className="desc">
                {item.product_name}
                {item.quantity > 1 && (
                  <span className="print-receipt__unit">{precio(item.unit_price)} c/u</span>
                )}
              </td>
              <td className="amt">{precio(item.subtotal ?? item.unit_price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {order.notes && (
        <div className="print-receipt__notes">
          <p className="print-receipt__bold">NOTAS:</p>
          <p>{order.notes}</p>
        </div>
      )}

      <div className="print-receipt__divider">--------------------------------</div>

      <div className="print-receipt__total-section">
        <span className="print-receipt__total-label">TOTAL:</span>
        <span className="print-receipt__total-value">{precio(order.total)}</span>
      </div>

      <div className="print-receipt__footer">
        <p>¡Gracias por su compra!</p>
      </div>
    </div>
  )
})

Receipt.displayName = 'Receipt'
