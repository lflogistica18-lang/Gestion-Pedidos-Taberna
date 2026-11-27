import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from '@/shared/components/panel'
import { fechaCorta } from '@/shared/lib/formato'
import type { Semana } from '../lib/calculos'

interface Props {
  semana: Semana
  /** Es la semana vencida (la última que ya se puede pagar): no se puede ir más adelante. */
  esLaVencida: boolean
  onAnterior: () => void
  onSiguiente: () => void
}

export function NavegadorSemana({ semana, esLaVencida, onAnterior, onSiguiente }: Props) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-borde-sutil bg-bg-tarjeta p-1 shadow-tarjeta">
      <IconButton etiqueta="Semana anterior" onClick={onAnterior}>
        <ChevronLeft size={20} />
      </IconButton>
      <div className="min-w-0 text-center">
        <p className="text-sm font-semibold text-texto-primario">
          Del {fechaCorta(semana.desde)} al {fechaCorta(semana.hasta)}
        </p>
        <p className="text-xs text-texto-secundario">{esLaVencida ? 'Última semana para pagar' : 'Semana atrasada'}</p>
      </div>
      <IconButton etiqueta="Semana siguiente" onClick={onSiguiente} disabled={esLaVencida}>
        <ChevronRight size={20} />
      </IconButton>
    </div>
  )
}
