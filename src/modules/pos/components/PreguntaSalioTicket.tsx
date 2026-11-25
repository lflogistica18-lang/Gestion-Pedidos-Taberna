import { Boton } from '@/shared/components/panel'

// PROVISORIO-WIFI: sacar este componente el día que haya impresión directa por WiFi.
// El navegador no avisa si el diálogo de imprimir terminó en papel o en Cancelar:
// se le pregunta a la persona. Lo usan la franja "Para imprimir" y el pedido propio de la compu.

interface Props {
  numeroPedido: number
  /** El ticket salió. */
  onSi: () => void
  /** No salió: que quede pendiente. */
  onNo: () => void
  disabled?: boolean
  /** Número bien grande (cuando la pregunta va sola en un modal). */
  numeroGrande?: boolean
}

export function PreguntaSalioTicket({ numeroPedido, onSi, onNo, disabled, numeroGrande }: Props) {
  return (
    <div role="alert" className="space-y-3 rounded-xl border border-tono-naranja-borde bg-tono-naranja-fondo p-3">
      <p className="text-base font-semibold text-texto-primario">
        ¿Salió el ticket del pedido{' '}
        <span className={numeroGrande ? 'text-3xl font-bold' : undefined}>#{numeroPedido}</span>?
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Boton variante="primario" className="min-h-12 flex-1 sm:min-h-12" onClick={onSi} disabled={disabled}>
          Sí, salió
        </Boton>
        <Boton className="min-h-12 flex-1 sm:min-h-12" onClick={onNo} disabled={disabled}>
          No, dejar pendiente
        </Boton>
      </div>
    </div>
  )
}
