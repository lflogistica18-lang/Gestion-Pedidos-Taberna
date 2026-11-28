import { useState } from 'react'
import { Boton, Pastilla } from '@/shared/components/panel'
import { fechaCorta, pesos } from '@/shared/lib/formato'
import type { Empleado, PagoPersonal } from '@/types/database.types'
import { useAbrirRecibo } from '../hooks/useAbrirRecibo'
import { textoDiferencia, textoMedioPagado } from '../lib/recibo'
import { ModalAnularPago } from './ModalAnularPago'

interface Props {
  empleado: Pick<Empleado, 'nombre'>
  pagos: PagoPersonal[]
  onCambio: () => void
}

/** Pagos de una empleada (pagados y anulados); cada uno abre su recibo guardado. */
export function ListaRecibos({ empleado, pagos, onCambio }: Props) {
  const { abrir, ocupado } = useAbrirRecibo(onCambio)
  const [abriendo, setAbriendo] = useState<string | null>(null)
  const [anulando, setAnulando] = useState<PagoPersonal | null>(null)

  if (pagos.length === 0) return <p className="text-sm text-texto-secundario">Todavía no tiene pagos registrados.</p>
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2">
        {pagos.map((p) => {
          const anulado = p.estado === 'anulado'
          return (
            <li key={p.id} className="min-w-0 rounded-xl border border-borde-sutil bg-bg-tarjeta p-4 shadow-tarjeta">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-texto-primario">
                  {fechaCorta(p.semana_desde)} al {fechaCorta(p.semana_hasta)}
                </p>
                {anulado ? <Pastilla tono="rojo" conPunto>Anulado</Pastilla> : <Pastilla tono="verde" conPunto>Pagado</Pastilla>}
              </div>
              <p className={anulado ? 'mt-1 text-lg font-bold text-texto-secundario line-through' : 'mt-1 text-lg font-bold text-texto-primario'}>
                {pesos(p.total_a_cobrar)}
              </p>
              <p className="break-words text-xs text-texto-secundario">
                {textoMedioPagado(p)}
                {p.pagado_at ? ` · ${fechaCorta(p.pagado_at)}` : ''}
              </p>
              {!anulado && textoDiferencia(p) && <p className="text-xs text-tono-ambar-texto">{textoDiferencia(p)}</p>}
              {anulado && (
                <p className="mt-2 break-words text-sm text-texto-primario">
                  Anulado{p.anulado_at ? ` el ${fechaCorta(p.anulado_at)}` : ''}: {p.anulado_motivo ?? 'sin motivo'}
                </p>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {/* Un anulado sin PDF guardado no se genera de nuevo: la base ya no lo deja tocar */}
                {(!anulado || p.recibo_ruta) && (
                  <Boton
                    className="w-full sm:flex-1"
                    disabled={ocupado}
                    onClick={() => {
                      setAbriendo(p.id)
                      void abrir(p, empleado)
                    }}
                  >
                    {ocupado && abriendo === p.id ? 'Abriendo…' : p.recibo_ruta ? 'Abrir recibo' : 'Generar recibo'}
                  </Boton>
                )}
                {!anulado && (
                  <Boton variante="peligro" className="w-full sm:flex-1" onClick={() => setAnulando(p)}>Anular</Boton>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <ModalAnularPago pago={anulando} onClose={() => setAnulando(null)} onAnulado={onCambio} />
    </>
  )
}
