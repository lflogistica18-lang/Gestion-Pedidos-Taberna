import { Boton, Modal } from '@/shared/components/panel'

interface Props {
  /** Número del pedido que se quiere editar; null = cerrado. */
  numeroPedido: number | null
  onConfirmar: () => void
  onCancelar: () => void
}

/** Pregunta antes de pisar un pedido a medio cargar con el que se va a editar. */
export function ModalReemplazarCarrito({ numeroPedido, onConfirmar, onCancelar }: Props) {
  return (
    <Modal open={numeroPedido !== null} onClose={onCancelar} title="Pedido a medio cargar">
      <div className="space-y-4">
        <p className="text-base text-texto-primario">
          Tenés un pedido a medio cargar. Si editás el #{numeroPedido} se descarta.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton onClick={onCancelar}>Volver</Boton>
          <Boton variante="primario" onClick={onConfirmar}>Editar el #{numeroPedido}</Boton>
        </div>
      </div>
    </Modal>
  )
}
