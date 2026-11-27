import { useState } from 'react'
import { Boton, Pastilla } from '@/shared/components/panel'
import { fechaCorta, pesos } from '@/shared/lib/formato'
import type { Empleado, PagoPersonal } from '@/types/database.types'
import { useAbrirRecibo } from '../hooks/useAbrirRecibo'
import { ETIQUETA_MEDIO } from '../lib/recibo'

interface Props {
  empleado: Pick<Empleado, 'nombre'>
  pagos: PagoPersonal[]
  onCambio: () => void
}

/** Pagos ya hechos de una empleada; cada uno abre su recibo guardado. */
export function ListaRecibos({ empleado, pagos, onCambio }: Props) {
  const { abrir, ocupado } = useAbrirRecibo(onCambio)
  const [abriendo, setAbriendo] = useState<string | null>(null)

  if (pagos.length === 0) return <p className="text-sm text-texto-secundario">Todavía no tiene pagos registrados.</p>
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {pagos.map((p) => (
        <li key={p.id} className="min-w-0 rounded-xl border border-borde-sutil bg-bg-tarjeta p-4 shadow-tarjeta">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-texto-primario">
              {fechaCorta(p.semana_desde)} al {fechaCorta(p.semana_hasta)}
            </p>
            <Pastilla tono="verde" conPunto>Pagado</Pastilla>
          </div>
          <p className="mt-1 text-lg font-bold text-texto-primario">{pesos(p.total_a_cobrar)}</p>
          <p className="text-xs text-texto-secundario">
            {p.medio_pago ? ETIQUETA_MEDIO[p.medio_pago] : '—'}
            {p.pagado_at ? ` · ${fechaCorta(p.pagado_at)}` : ''}
          </p>
          <Boton
            className="mt-3 w-full"
            disabled={ocupado}
            onClick={() => {
              setAbriendo(p.id)
              void abrir(p, empleado)
            }}
          >
            {ocupado && abriendo === p.id ? 'Abriendo…' : p.recibo_ruta ? 'Abrir recibo' : 'Generar recibo'}
          </Boton>
        </li>
      ))}
    </ul>
  )
}
