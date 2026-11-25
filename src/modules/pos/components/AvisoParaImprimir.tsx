import { useCallback, useEffect, useRef, useState } from 'react'
import { Printer } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import { Receipt } from './Receipt'
import { FilaParaImprimir } from './FilaParaImprimir'
import { PreguntaSalioTicket } from './PreguntaSalioTicket'
import { useImpresionesPendientes, type TrabajoPendiente } from '../hooks/useImpresionesPendientes'
import { EstadoError } from '@/shared/components/comunes/EstadoError'
import { Modal, Pastilla, mostrarToast } from '@/shared/components/panel'
import { useConfiguracion } from '@/shared/store/useConfiguracion'
import { useAparato } from '@/shared/store/useAparato'

// PROVISORIO-WIFI: sacar este componente (y su montaje en Layout) el día que haya impresora WiFi.

/** Beep corto; si el navegador lo bloquea (sin gesto previo), no pasa nada. */
function sonarAviso() {
  try {
    const Ctx = window.AudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const ganancia = ctx.createGain()
    osc.frequency.value = 880
    ganancia.gain.value = 0.15
    osc.connect(ganancia)
    ganancia.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.25)
    osc.onended = () => { void ctx.close() }
  } catch {
    // Silencio: el aviso visual alcanza
  }
}

export function AvisoParaImprimir() {
  const modo = useConfiguracion((s) => s.config.modo_impresion)
  const imprimeAca = useAparato((s) => s.imprimeAca)
  const activo = modo === 'navegador' && imprimeAca

  const [abierto, setAbierto] = useState(false)
  const [imprimiendo, setImprimiendo] = useState<TrabajoPendiente | null>(null)
  // Ticket cuyo diálogo de imprimir ya se cerró y falta que la persona diga si salió
  const [preguntando, setPreguntando] = useState<TrabajoPendiente | null>(null)
  const [guardando, setGuardando] = useState(false)
  const ticketRef = useRef<HTMLDivElement>(null)
  const trabajoRef = useRef<TrabajoPendiente | null>(null)

  const alLlegarNuevo = useCallback((nuevos: TrabajoPendiente[]) => {
    for (const j of nuevos) {
      if (j.orders) mostrarToast(`Llegó el pedido #${j.orders.order_number} para imprimir`, 'info')
    }
    sonarAviso()
  }, [])

  const { pendientes, error, refetch, marcarImpreso } = useImpresionesPendientes(activo, alLlegarNuevo)

  const imprimirTicket = useReactToPrint({
    contentRef: ticketRef,
    documentTitle: imprimiendo?.orders ? `Ticket_Pedido_${imprimiendo.orders.order_number}` : 'Ticket',
    // El navegador dispara onAfterPrint tanto si se imprimió como si se canceló, y no avisa cuál fue.
    // Por eso no se marca nada acá: se le pregunta a la persona (ver PreguntaSalioTicket).
    onAfterPrint: () => {
      const trabajo = trabajoRef.current
      trabajoRef.current = null
      setImprimiendo(null)
      if (trabajo) setPreguntando(trabajo)
    },
  })

  // Se imprime recién cuando el ticket ya está montado en el DOM
  useEffect(() => {
    if (imprimiendo) imprimirTicket()
  }, [imprimiendo, imprimirTicket])

  const empezar = (trabajo: TrabajoPendiente) => {
    trabajoRef.current = trabajo
    setImprimiendo(trabajo)
  }

  const confirmarSalio = async () => {
    if (!preguntando || guardando) return
    setGuardando(true)
    const { error: err } = await marcarImpreso(preguntando.id)
    setGuardando(false)
    if (err) {
      mostrarToast(`No se pudo marcar el pedido como impreso: ${err}`, 'error')
      return
    }
    setPreguntando(null)
  }

  const cerrarModal = () => {
    setPreguntando(null)
    setAbierto(false)
  }

  // Si el trabajo ya no está pendiente (lo marcó otro aparato), la pregunta no tiene sentido
  const preguntaVigente = preguntando && pendientes.some((t) => t.id === preguntando.id) ? preguntando : null

  if (!activo) return null
  if (pendientes.length === 0 && !error) return null

  return (
    <>
      {imprimiendo?.orders && (
        <div style={{ display: 'none' }}>
          <Receipt ref={ticketRef} order={imprimiendo.orders} />
        </div>
      )}

      {/* Franja arriba del contenido: empuja la pantalla, no tapa menú, barra inferior ni carrito */}
      <div className="flex shrink-0 items-center justify-center gap-2 border-b border-tono-naranja-borde bg-tono-naranja-fondo px-4 py-2">
        {pendientes.length > 0 ? (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-texto-primario hover:bg-superficie-2"
          >
            <Printer size={18} aria-hidden="true" />
            Para imprimir
            <Pastilla tono="naranja">{pendientes.length}</Pastilla>
          </button>
        ) : (
          <button type="button" onClick={() => setAbierto(true)} className="min-h-11 rounded-lg px-3">
            <Pastilla tono="rojo">No se pudo leer la cola de impresión</Pastilla>
          </button>
        )}
      </div>

      <Modal
        open={abierto}
        onClose={cerrarModal}
        title="Para imprimir"
        subtitulo={`${pendientes.length} ${pendientes.length === 1 ? 'ticket' : 'tickets'} de celu y tablet`}
      >
        {error && <EstadoError mensaje={error} onReintentar={() => void refetch()} />}
        {preguntaVigente?.orders && (
          <div className="mb-3">
            <PreguntaSalioTicket
              numeroPedido={preguntaVigente.orders.order_number}
              onSi={() => void confirmarSalio()}
              onNo={() => setPreguntando(null)}
              disabled={guardando}
            />
          </div>
        )}
        <ul className="space-y-2">
          {pendientes.map((t) => (
            <FilaParaImprimir key={t.id} trabajo={t} ocupado={imprimiendo !== null || preguntaVigente !== null} onImprimir={empezar} />
          ))}
        </ul>
      </Modal>
    </>
  )
}
