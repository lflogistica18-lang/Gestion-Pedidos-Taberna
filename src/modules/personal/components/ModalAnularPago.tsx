import { useState } from 'react'
import { AvisoEstado, Boton, Entrada, Modal, mostrarToast } from '@/shared/components/panel'
import { fechaCorta, pesos } from '@/shared/lib/formato'
import type { PagoPersonal } from '@/types/database.types'
import { usePagos } from '../hooks/usePagos'

const ATAJOS = ['Se cargó mal un concepto', 'Monto equivocado', 'Pago duplicado']

interface Props {
  pago: PagoPersonal | null
  onClose: () => void
  /** Se llama después de anular (para recargar la ficha). */
  onAnulado: () => void
}

function Formulario({ pago, onClose, onAnulado }: { pago: PagoPersonal } & Pick<Props, 'onClose' | 'onAnulado'>) {
  const { anularPago } = usePagos()
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [anulando, setAnulando] = useState(false)

  const confirmar = async () => {
    setError(null)
    setAnulando(true)
    const r = await anularPago(pago.id, motivo)
    setAnulando(false)
    if (r.error) {
      setError(r.error)
      return
    }
    mostrarToast('Pago anulado: la semana volvió a quedar por pagar', 'exito')
    onClose()
    onAnulado()
  }

  const largo = motivo.trim().length
  return (
    <div className="space-y-4">
      <AvisoEstado tono="ambar" titulo="La semana vuelve a quedar por pagar">
        El recibo queda guardado como anulado.
      </AvisoEstado>
      <Entrada
        etiqueta="Motivo"
        obligatorio
        placeholder="Ej: eran 2 horas extra, no 3"
        value={motivo}
        maxLength={200}
        ayuda="Entre 3 y 200 letras"
        onChange={(e) => setMotivo(e.target.value)}
        autoComplete="off"
      />
      <div className="flex flex-wrap gap-2" aria-label="Motivos frecuentes">
        {ATAJOS.map((texto) => (
          <Boton key={texto} compacto onClick={() => setMotivo(texto)} disabled={anulando}>{texto}</Boton>
        ))}
      </div>
      {error && <AvisoEstado tono="rojo" titulo="No se pudo anular el pago">{error}</AvisoEstado>}
      <div className="flex flex-col-reverse gap-2 border-t border-borde-sutil pt-4 sm:flex-row sm:justify-end">
        <Boton onClick={onClose} disabled={anulando}>Volver</Boton>
        <Boton variante="peligro" onClick={() => void confirmar()} disabled={anulando || largo < 3 || largo > 200}>
          {anulando ? 'Anulando…' : 'Anular pago'}
        </Boton>
      </div>
    </div>
  )
}

/** Pide el motivo y anula un pago ya pagado. El recibo no se borra: queda con el sello ANULADO. */
export function ModalAnularPago({ pago, onClose, onAnulado }: Props) {
  return (
    <Modal
      open={pago !== null}
      onClose={onClose}
      title="Anular pago"
      subtitulo={pago ? `Del ${fechaCorta(pago.semana_desde)} al ${fechaCorta(pago.semana_hasta)} · ${pesos(pago.total_a_cobrar)}` : undefined}
    >
      {pago && <Formulario pago={pago} onClose={onClose} onAnulado={onAnulado} />}
    </Modal>
  )
}
