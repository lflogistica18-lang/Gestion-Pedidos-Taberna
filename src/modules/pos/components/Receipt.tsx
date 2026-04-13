import { forwardRef } from 'react'
import type { OrderWithItems } from '../hooks/useActiveOrders'

interface ReceiptProps {
  order: OrderWithItems,
  tabernaName?: string
}

export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({ order, tabernaName = "Taberna" }, ref) => {
  const dateObj = new Date(order.created_at)
  const dFormat = dateObj.toLocaleDateString('es-AR')
  const tFormat = dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div ref={ref} className="print-receipt">
      <div className="print-receipt__header">
        <h2 className="print-receipt__title">{tabernaName}</h2>
        <div className="print-receipt__meta">
          <p>Pedido: <span className="print-receipt__bold">#{order.order_number}</span></p>
          <p>Fecha: {dFormat} {tFormat}</p>
          <p>Tipo: {order.type === 'local' ? 'Local' : 'Delivery'}</p>
          <p>Pago: <span className="print-receipt__capitalize">{order.payment_method}</span></p>
        </div>
        {order.customer_name && (
          <div className="print-receipt__customer">
            <p>Cliente: {order.customer_name}</p>
            {order.delivery_address && <p>Dir: {order.delivery_address}</p>}
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
              <td className="desc">{item.product_name}</td>
              <td className="amt">${item.subtotal.toLocaleString('es-AR')}</td>
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
        <span className="print-receipt__total-value">${order.total.toLocaleString('es-AR')}</span>
      </div>

      <div className="print-receipt__footer">
        <p>¡Gracias por su compra!</p>
      </div>
    </div>
  )
})

Receipt.displayName = 'Receipt'
