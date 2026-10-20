import { Check, ShoppingCart, Trash2 } from 'lucide-react'
import { AreaTexto, AvisoEstado, Boton, Campo, ControlSegmentado, Entrada, fmtMonto } from '@/shared/components/panel'
import { EstadoVacio } from '@/shared/components/comunes/EstadoVacio'
import { useCartStore } from '../store/useCartStore'
import { CartItemRow } from './CartItemRow'
import type { OrderType } from '@/types/database.types'
import { useConfiguracion } from '@/shared/store/useConfiguracion'
import { ETIQUETAS_PAGO, medioDePagoValido } from '@/shared/lib/config'

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: 'local', label: 'Local' },
  { value: 'delivery', label: 'Delivery' },
]

// El control segmentado de la pieza es chico; en la caja se estira y sube a 44 px.
const CLASES_SEGMENTADO = 'flex w-full [&>button]:min-h-11 [&>button]:flex-1 [&>button]:text-sm'

interface CartPanelProps {
  /** `panel`: columna fija de lg (el pie queda abajo). `hoja`: dentro del Modal de celu. */
  variante: 'panel' | 'hoja'
  submitting: boolean
  error: string | null
  onConfirm: () => void
}

/** Contenido del carrito: se usa igual en el panel derecho y en la hoja del celu. */
export function CartPanel({ variante, submitting, error, onConfirm }: CartPanelProps) {
  const items = useCartStore((s) => s.items)
  const orderType = useCartStore((s) => s.orderType)
  const paymentMethod = useCartStore((s) => s.paymentMethod)
  const notes = useCartStore((s) => s.notes)
  const customerName = useCartStore((s) => s.customerName)
  const deliveryAddress = useCartStore((s) => s.deliveryAddress)
  const getTotal = useCartStore((s) => s.getTotal)
  const getItemCount = useCartStore((s) => s.getItemCount)
  const clearCart = useCartStore((s) => s.clearCart)
  const setOrderType = useCartStore((s) => s.setOrderType)
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod)
  // Medios que ofrece la Caja según Configuración; si el elegido se apagó, cae al primero
  const mediosPago = useConfiguracion((s) => s.config.medios_pago)
  const opcionesPago = mediosPago.map((m) => ({ value: m, label: ETIQUETAS_PAGO[m] }))
  const pagoElegido = medioDePagoValido(paymentMethod, mediosPago)
  const setNotes = useCartStore((s) => s.setNotes)
  const setCustomerName = useCartStore((s) => s.setCustomerName)
  const setDeliveryAddress = useCartStore((s) => s.setDeliveryAddress)

  const isDelivery = orderType === 'delivery'
  const esPanel = variante === 'panel'
  const cantidad = getItemCount()

  const cuerpo = (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="rounded-xl border border-borde-sutil bg-bg-principal">
          <EstadoVacio mensaje="El carrito está vacío" icono={<ShoppingCart size={26} />} />
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <CartItemRow key={item.productId} item={item} />
          ))}
        </ul>
      )}

      <Campo etiqueta="Tipo de pedido">
        <ControlSegmentado
          etiqueta="Tipo de pedido"
          opciones={ORDER_TYPES}
          value={orderType}
          onChange={setOrderType}
          className={CLASES_SEGMENTADO}
        />
      </Campo>

      <Entrada
        etiqueta="Nombre del cliente"
        obligatorio={isDelivery}
        placeholder="Ej: Juan García"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        autoComplete="off"
      />

      {isDelivery && (
        <Entrada
          etiqueta="Dirección de entrega"
          obligatorio
          placeholder="Ej: Av. Corrientes 1234, 3° B"
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
          autoComplete="street-address"
        />
      )}

      <Campo etiqueta="Método de pago">
        <ControlSegmentado
          etiqueta="Método de pago"
          opciones={opcionesPago}
          value={pagoElegido}
          onChange={setPaymentMethod}
          className={CLASES_SEGMENTADO}
        />
      </Campo>

      <AreaTexto
        etiqueta="Observaciones"
        opcional
        placeholder={isDelivery ? 'Ej: sin cebollas, timbre roto...' : 'Ej: sin cebollas, mesa 5...'}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />
    </div>
  )

  const aviso = error && <AvisoEstado tono="rojo" titulo="No se pudo confirmar el pedido">{error}</AvisoEstado>

  // En la hoja del celu el pie va pegado abajo: solo total y botón, para no tapar
  // los campos. El aviso de error queda al final del formulario.
  const pie = (
    <div className="space-y-3">
      {esPanel && aviso}
      <div className="flex items-baseline justify-between">
        <span className="text-base font-medium text-texto-secundario">Total</span>
        <span className="text-2xl font-bold tabular-nums text-texto-primario">{fmtMonto(getTotal())}</span>
      </div>
      <Boton
        variante="primario"
        className="w-full sm:min-h-11"
        onClick={onConfirm}
        disabled={submitting || items.length === 0}
      >
        <Check size={16} />
        {submitting ? 'Procesando...' : 'Confirmar pedido'}
      </Boton>
    </div>
  )

  const limpiar = (
    <Boton compacto onClick={clearCart} disabled={items.length === 0}>
      <Trash2 size={14} />
      Limpiar
    </Boton>
  )

  if (esPanel) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-borde-sutil px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-texto-primario">Pedido</h2>
            <p className="text-sm text-texto-secundario">{cantidad} {cantidad === 1 ? 'ítem' : 'ítems'}</p>
          </div>
          {limpiar}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">{cuerpo}</div>
        <div className="shrink-0 border-t border-borde-sutil p-4">{pie}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">{limpiar}</div>
      {cuerpo}
      {aviso && <div className="mt-4">{aviso}</div>}
      {/* Pie pegado al fondo de la hoja: compensa el padding del Modal */}
      <div className="sticky bottom-0 -mx-5 -mb-5 mt-4 border-t border-borde-sutil bg-bg-tarjeta px-5 pb-5 pt-3 sm:-mx-6 sm:-mb-6 sm:px-6 sm:pb-6">
        {pie}
      </div>
    </div>
  )
}
