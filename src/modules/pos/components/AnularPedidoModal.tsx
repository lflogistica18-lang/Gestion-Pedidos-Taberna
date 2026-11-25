import { useState } from 'react'
import { AvisoEstado, Boton, Entrada, Modal, mostrarToast } from '@/shared/components/panel'
import { useAnularPedido } from '../hooks/useAnularPedido'

const ATAJOS = ['Se cargó mal', 'El cliente canceló', 'Pedido duplicado']

interface AnularPedidoModalProps {
  open: boolean
  orderId: string
  orderNumber: number
  onClose: () => void
  /** Se llama después de anular (para refrescar la lista). */
  onAnulado: () => void
}

type FormularioProps = Omit<AnularPedidoModalProps, 'open'>

function FormularioAnular({ orderId, orderNumber, onClose, onAnulado }: FormularioProps) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { anulando, anular } = useAnularPedido()

  const confirmar = async () => {
    setError(null)
    const { error: err } = await anular(orderId, motivo.trim())
    if (err) {
      setError(err)
      return
    }
    mostrarToast(`Pedido #${orderNumber} anulado`, 'exito')
    onClose()
    onAnulado()
  }

  return (
    <div className="space-y-4">
      <Entrada
        etiqueta="Motivo"
        obligatorio
        placeholder="Ej: se cargó mal"
        value={motivo}
        maxLength={200}
        onChange={(e) => setMotivo(e.target.value)}
        autoComplete="off"
      />
      <div className="flex flex-wrap gap-2" aria-label="Motivos frecuentes">
        {ATAJOS.map((texto) => (
          <Boton key={texto} compacto onClick={() => setMotivo(texto)} disabled={anulando}>
            {texto}
          </Boton>
        ))}
      </div>
      {error && <AvisoEstado tono="rojo" titulo="No se pudo anular el pedido">{error}</AvisoEstado>}
      <div className="flex flex-col-reverse gap-2 border-t border-borde-sutil pt-4 sm:flex-row sm:justify-end">
        <Boton onClick={onClose} disabled={anulando}>Volver</Boton>
        <Boton variante="peligro" onClick={() => void confirmar()} disabled={anulando || motivo.trim().length < 3}>
          {anulando ? 'Anulando...' : 'Anular pedido'}
        </Boton>
      </div>
    </div>
  )
}

/** Pide el motivo y anula el pedido (queda en la papelera con quién y por qué). */
export function AnularPedidoModal({ open, onClose, ...resto }: AnularPedidoModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={`Anular el pedido #${resto.orderNumber}`} subtitulo="Va a la papelera y no cuenta en los reportes">
      <FormularioAnular {...resto} onClose={onClose} />
    </Modal>
  )
}
