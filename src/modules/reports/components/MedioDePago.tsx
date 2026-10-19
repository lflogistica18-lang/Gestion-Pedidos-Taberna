// Ventas por medio de pago: dos barras simples (Efectivo / Déb-Transfer) con monto y porcentaje.

import { Banknote } from 'lucide-react'
import { EncabezadoSeccion, SeccionPanel, fmtMonto } from '@/shared/components/panel'

interface MedioDePagoProps {
  efectivo: number
  transferencia: number
}

interface FilaProps {
  nombre: string
  monto: number
  porcentaje: number
  color: string
}

function Fila({ nombre, monto, porcentaje, color }: FilaProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-texto-primario">{nombre}</span>
        <span className="text-sm text-texto-secundario">
          <strong className="font-bold text-texto-primario">{fmtMonto(monto)}</strong> · {porcentaje}%
        </span>
      </div>
      <div
        role="meter"
        aria-label={`${nombre}: ${fmtMonto(monto)}, ${porcentaje}% de las ventas`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentaje}
        className="h-3 w-full overflow-hidden rounded-full bg-superficie-2"
      >
        <div className={`h-full rounded-full ${color}`} style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  )
}

export function MedioDePago({ efectivo, transferencia }: MedioDePagoProps) {
  const total = efectivo + transferencia
  const pEfectivo = total > 0 ? Math.round((efectivo / total) * 100) : 0
  const pTransf = total > 0 ? 100 - pEfectivo : 0
  return (
    <SeccionPanel>
      <EncabezadoSeccion
        icono={<Banknote size={16} />}
        titulo="Medio de pago"
        subtitulo={<>Cobrado en total <strong>{fmtMonto(total)}</strong></>}
      />
      <div className="mt-4 space-y-4">
        <Fila nombre="Efectivo" monto={efectivo} porcentaje={pEfectivo} color="bg-grafico-1" />
        <Fila nombre="Déb/Transfer" monto={transferencia} porcentaje={pTransf} color="bg-grafico-2" />
      </div>
    </SeccionPanel>
  )
}
