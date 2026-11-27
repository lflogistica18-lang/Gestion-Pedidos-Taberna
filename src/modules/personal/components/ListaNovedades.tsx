import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Boton, Modal, Pastilla } from '@/shared/components/panel'
import { fechaCorta, pesos } from '@/shared/lib/formato'
import type { NovedadPersonal } from '@/types/database.types'
import { ETIQUETA_NOVEDAD } from '../lib/etiquetas'

interface Props {
  novedades: NovedadPersonal[]
  /** Quita (borrado lógico) una novedad que todavía no entró en un pago. */
  onQuitar: (id: string) => Promise<void>
}

export function ListaNovedades({ novedades, onQuitar }: Props) {
  const [porQuitar, setPorQuitar] = useState<NovedadPersonal | null>(null)
  const [quitando, setQuitando] = useState(false)

  const confirmar = async () => {
    if (!porQuitar) return
    setQuitando(true)
    await onQuitar(porQuitar.id)
    setQuitando(false)
    setPorQuitar(null)
  }

  if (novedades.length === 0) return <p className="text-sm text-texto-secundario">Sin novedades cargadas.</p>
  return (
    <>
      <ul className="divide-y divide-borde-sutil rounded-xl border border-borde-sutil bg-bg-tarjeta shadow-tarjeta">
        {novedades.map((n) => (
          <li key={n.id} className="flex min-w-0 items-start justify-between gap-2 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-texto-primario">
                  {ETIQUETA_NOVEDAD[n.tipo]} · {fechaCorta(n.fecha)}
                </p>
                <div className="flex flex-wrap gap-1">
                  {n.tipo === 'inasistencia' && (
                    <Pastilla tono={n.descontar ? 'rojo' : 'neutro'}>{n.descontar ? 'Se descuenta' : 'No se descuenta'}</Pastilla>
                  )}
                  {(n.descontar || n.tipo === 'adelanto') && (
                    <Pastilla tono={n.pago_id ? 'verde' : 'azul'}>{n.pago_id ? 'Ya descontada' : 'Sin descontar'}</Pastilla>
                  )}
                </div>
              </div>
              {n.monto !== null && <p className="text-sm text-texto-primario">{pesos(n.monto)}</p>}
              {n.detalle && <p className="mt-1 break-words text-sm text-texto-secundario">{n.detalle}</p>}
            </div>
            {!n.pago_id && (
              <Boton className="min-w-11 shrink-0 sm:min-h-11" aria-label="Quitar novedad" onClick={() => setPorQuitar(n)}>
                <Trash2 size={16} />Quitar
              </Boton>
            )}
          </li>
        ))}
      </ul>
      <Modal open={porQuitar !== null} onClose={() => !quitando && setPorQuitar(null)} title="Quitar novedad">
        <div className="space-y-4">
          <p className="text-sm text-texto-primario">
            ¿Quitar {porQuitar ? `${ETIQUETA_NOVEDAD[porQuitar.tipo].toLowerCase()} del ${fechaCorta(porQuitar.fecha)}` : 'la novedad'}?
            Deja de contarse en los pagos.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Boton onClick={() => setPorQuitar(null)} disabled={quitando}>Cancelar</Boton>
            <Boton variante="peligro" onClick={() => void confirmar()} disabled={quitando}>{quitando ? 'Quitando…' : 'Quitar'}</Boton>
          </div>
        </div>
      </Modal>
    </>
  )
}
