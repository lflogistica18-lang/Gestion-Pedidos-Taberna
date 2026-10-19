import { Wallet } from 'lucide-react'
import { ETIQUETAS_PAGO, ORDEN_PAGOS } from '@/shared/lib/config'
import type { PaymentMethod } from '@/types/database.types'
import { valorDe, type PropsSeccion } from '../secciones'
import { useGuardarSeccion } from '../hooks/useGuardarSeccion'
import { Interruptor } from './Interruptor'
import { TarjetaSeccion } from './TarjetaSeccion'

const DETALLES: Partial<Record<PaymentMethod, string>> = {
  transferencia: 'Débito y transferencia juntos',
  debito: 'Solo si querés separar débito de transferencia en los reportes',
}

export function SeccionMediosPago({ config, borrador, onCambiar, onGuardado, bloqueado }: PropsSeccion) {
  const { guardando, guardar } = useGuardarSeccion(onGuardado)
  const medios = ORDEN_PAGOS.filter((m) => valorDe(config, borrador, 'medios_pago').includes(m))
  const hayCambios = medios.join() !== config.medios_pago.join()
  const unico = medios.length === 1

  function alternar(m: PaymentMethod, encender: boolean) {
    onCambiar({ medios_pago: ORDEN_PAGOS.filter((x) => (x === m ? encender : medios.includes(x))) })
  }

  return (
    <TarjetaSeccion
      icono={<Wallet size={16} />}
      titulo="Medios de pago"
      subtitulo="Qué opciones ofrece la Caja al cobrar"
      hayCambios={hayCambios}
      guardando={guardando}
      motivoBloqueo={bloqueado ? 'Reintentá antes de guardar' : undefined}
      onGuardar={() => void guardar({ medios_pago: medios })}
    >
      <div className="space-y-2">
        {ORDEN_PAGOS.map((m) => {
          const activo = medios.includes(m)
          return (
            <Interruptor
              key={m}
              etiqueta={ETIQUETAS_PAGO[m]}
              detalle={DETALLES[m]}
              activo={activo}
              deshabilitado={unico && activo}
              onChange={(v) => alternar(m, v)}
            />
          )
        })}
      </div>
      {unico && <p className="text-xs text-texto-secundario">Tiene que quedar al menos un medio de pago</p>}
    </TarjetaSeccion>
  )
}
