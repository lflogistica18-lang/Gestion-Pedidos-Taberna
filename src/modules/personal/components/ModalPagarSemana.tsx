import { Modal } from '@/shared/components/panel'
import { fechaCorta } from '@/shared/lib/formato'
import type { ConceptoPago, Empleado, NovedadPersonal, PagoPersonal } from '@/types/database.types'
import type { Semana } from '../lib/calculos'
import { PagarSemanaContenido } from './PagarSemanaContenido'

interface Props {
  empleado: Empleado
  semana: Semana
  /** Borrador ya guardado de esa semana, si hay. */
  pago: PagoPersonal | null
  conceptos: ConceptoPago[]
  /** Novedades todavía sin descontar (de ahí salen los ítems propuestos). */
  novedades: NovedadPersonal[]
  onCerrar: () => void
  /** Algo cambió en la base: la pantalla de atrás tiene que recargar. */
  onCambio: () => void
}

/** Ventana de pago de una semana. Se monta solo cuando hay que abrirla. */
export function ModalPagarSemana({ empleado, semana, pago, conceptos, novedades, onCerrar, onCambio }: Props) {
  return (
    <Modal
      open
      onClose={onCerrar}
      title={`Pagar semana: ${empleado.nombre}`}
      subtitulo={`Del ${fechaCorta(semana.desde)} al ${fechaCorta(semana.hasta)}`}
    >
      <PagarSemanaContenido
        empleado={empleado}
        semana={semana}
        pagoInicial={pago}
        conceptos={conceptos}
        novedades={novedades}
        onCerrar={onCerrar}
        onCambio={onCambio}
      />
    </Modal>
  )
}
