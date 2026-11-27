import { Link } from 'react-router-dom'
import { Boton, Pastilla } from '@/shared/components/panel'
import type { TonoPastilla } from '@/shared/components/panel'
import { pesos } from '@/shared/lib/formato'
import type { Empleado, PagoPersonal } from '@/types/database.types'
import type { EstadoEmpleada } from '../lib/calculos'

const ESTADOS: Record<EstadoEmpleada, { tono: TonoPastilla; texto: string }> = {
  por_pagar: { tono: 'naranja', texto: 'Semana por pagar' },
  con_adelanto: { tono: 'azul', texto: 'Con adelanto' },
  al_dia: { tono: 'verde', texto: 'Al día' },
}

interface Props {
  empleado: Empleado
  estado: EstadoEmpleada
  /** Pago de la semana que se está mirando (si ya hay uno). */
  pago: PagoPersonal | undefined
  ocupado: boolean
  onPagar: () => void
  onRecibo: () => void
}

export function TarjetaEmpleada({ empleado, estado, pago, ocupado, onPagar, onRecibo }: Props) {
  const e = ESTADOS[estado]
  const pagado = pago?.estado === 'pagado'
  return (
    <li className="min-w-0 rounded-xl border border-borde-sutil bg-bg-tarjeta p-4 shadow-tarjeta">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/personal/${empleado.id}`} className="inline-flex min-h-11 min-w-0 items-center break-words text-base font-semibold text-texto-primario hover:text-acento-primario">
          {empleado.nombre}
        </Link>
        <Pastilla tono={e.tono} conPunto>{e.texto}</Pastilla>
      </div>
      <p className="text-sm text-texto-secundario">{pesos(empleado.sueldo_semanal)} por semana</p>
      <p className="mt-2 text-sm text-texto-primario">
        {pagado
          ? `Pagada: ${pesos(pago.total_a_cobrar)}`
          : pago
            ? `Borrador guardado: ${pesos(pago.total_a_cobrar)}`
            : 'Esta semana todavía no tiene pago'}
      </p>
      <div className="mt-3">
        {pagado ? (
          <Boton className="w-full" onClick={onRecibo} disabled={ocupado}>
            {ocupado ? 'Abriendo…' : pago.recibo_ruta ? 'Ver recibo' : 'Generar recibo'}
          </Boton>
        ) : (
          <Boton variante="primario" className="w-full" onClick={onPagar}>
            {pago ? 'Continuar pago' : 'Pagar semana'}
          </Boton>
        )}
      </div>
    </li>
  )
}
