import { useState } from 'react'
import { Clock, ListOrdered, Tag } from 'lucide-react'
import { AvisoEstado, Boton, Modal, TarjetaDato, TarjetaDatoMini, fmtMonto, mostrarToast } from '@/shared/components/panel'
import type { OrderConDetalle, UseAdminOrdersResult } from '../hooks/useAdminOrders'
import { ESTADO_PEDIDO, ETIQUETA_PAGO, ETIQUETA_TIPO, fmtFechaCompleta, fmtHora } from './formato'

interface Props {
  pedido: OrderConDetalle | null
  onCerrar: () => void
  enviarAPapelera: UseAdminOrdersResult['enviarAPapelera']
  restaurarDePapelera: UseAdminOrdersResult['restaurarDePapelera']
}

export function DetallePedido({ pedido, onCerrar, enviarAPapelera, restaurarDePapelera }: Props) {
  const [trabajando, setTrabajando] = useState(false)
  if (!pedido) return null

  const enPapelera = !!pedido.deleted_at
  const cancelado = pedido.status === 'cancelado'
  const items = pedido.order_items ?? []
  const cantidadItems = items.reduce((s, i) => s + i.quantity, 0)

  const ejecutar = async (
    accion: (id: string) => Promise<{ error: string | null }>,
    mensajeOk: string,
  ) => {
    setTrabajando(true)
    const r = await accion(pedido.id)
    setTrabajando(false)
    if (r.error) {
      mostrarToast(`No se pudo completar: ${r.error}`, 'error')
      return
    }
    mostrarToast(mensajeOk, 'exito')
    onCerrar()
  }

  const alPapelera = () => {
    if (!window.confirm('¿Enviar este pedido a la papelera?')) return
    void ejecutar(enviarAPapelera, `Pedido #${pedido.order_number} enviado a la papelera`)
  }

  return (
    <Modal
      open
      onClose={onCerrar}
      wide
      title={`Pedido #${pedido.order_number}`}
      subtitulo={`${ETIQUETA_TIPO[pedido.type]} · ${fmtFechaCompleta(pedido.created_at)}`}
    >
      <div className="space-y-4">
        {cancelado && <AvisoEstado tono="rojo" titulo="Pedido cancelado" />}
        {enPapelera && (
          <AvisoEstado tono="ambar" titulo="En la papelera">
            No cuenta en los reportes. Podés restaurarlo.
          </AvisoEstado>
        )}

        <TarjetaDato etiqueta="Total" valor={fmtMonto(pedido.total)} detalle={ETIQUETA_PAGO[pedido.payment_method]} />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <TarjetaDatoMini icono={<Clock size={16} />} etiqueta="Hora" valor={fmtHora(pedido.created_at)} />
          <TarjetaDatoMini icono={<ListOrdered size={16} />} etiqueta="Ítems" valor={cantidadItems} />
          <TarjetaDatoMini
            icono={<Tag size={16} />}
            etiqueta="Estado"
            className="col-span-2 sm:col-span-1"
            valor={ESTADO_PEDIDO[pedido.status].etiqueta}
            valorTexto={ESTADO_PEDIDO[pedido.status].etiqueta}
          />
        </div>

        {(pedido.customer_name || pedido.delivery_address) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {pedido.customer_name && <TarjetaDato etiqueta="Cliente" valor={<span className="text-lg">{pedido.customer_name}</span>} />}
            {pedido.delivery_address && <TarjetaDato etiqueta="Dirección" valor={<span className="text-lg">{pedido.delivery_address}</span>} />}
          </div>
        )}

        <section aria-label="Ítems del pedido">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-texto-secundario">Ítems</h4>
          {items.length === 0 ? (
            <p className="text-sm text-texto-secundario">Sin detalle de ítems</p>
          ) : (
            <ul className="divide-y divide-borde-sutil rounded-xl border border-borde-sutil">
              {items.map((it) => (
                <li key={it.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-texto-primario">
                      {it.quantity} × {it.product_name}
                    </p>
                    {it.quantity > 1 && (
                      <p className="text-xs text-texto-secundario">{fmtMonto(it.unit_price)} c/u</p>
                    )}
                    {it.notes && <p className="text-xs text-texto-secundario">{it.notes}</p>}
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-texto-primario">
                    {fmtMonto(it.unit_price * it.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {pedido.notes && (
          <div className="rounded-xl bg-superficie-2 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-texto-secundario">Notas</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-texto-primario">{pedido.notes}</p>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-borde-sutil pt-4 sm:flex-row sm:justify-end">
          <Boton onClick={onCerrar}>Cerrar</Boton>
          {enPapelera ? (
            <Boton variante="primario" disabled={trabajando} onClick={() => void ejecutar(restaurarDePapelera, `Pedido #${pedido.order_number} restaurado`)}>
              {trabajando ? 'Restaurando…' : 'Restaurar'}
            </Boton>
          ) : (
            <Boton variante="peligro" disabled={trabajando} onClick={alPapelera}>
              {trabajando ? 'Enviando…' : 'Enviar a la papelera'}
            </Boton>
          )}
        </div>
      </div>
    </Modal>
  )
}
