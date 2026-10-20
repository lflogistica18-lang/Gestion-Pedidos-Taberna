import { MonitorSmartphone } from 'lucide-react'
import { valorDe, type PropsSeccion } from '../secciones'
import { useGuardarSeccion } from '../hooks/useGuardarSeccion'
import { Interruptor } from './Interruptor'
import { TarjetaSeccion } from './TarjetaSeccion'

export function SeccionPantallas({ config, borrador, onCambiar, onGuardado, bloqueado }: PropsSeccion) {
  const { guardando, guardar } = useGuardarSeccion(onGuardado)
  const cocina = valorDe(config, borrador, 'cocina_activa')
  return (
    <TarjetaSeccion
      icono={<MonitorSmartphone size={16} />}
      titulo="Pantallas"
      subtitulo="Qué pantallas se ven en el menú"
      hayCambios={cocina !== config.cocina_activa}
      guardando={guardando}
      motivoBloqueo={bloqueado ? 'Reintentá antes de guardar' : undefined}
      onGuardar={() => void guardar({ cocina_activa: cocina })}
    >
      <Interruptor
        etiqueta="Pantalla de Cocina"
        detalle="Muestra los pedidos en una pantalla para la cocina. Apagada, la cocina trabaja con el ticket impreso y la Caja marca Entregado."
        activo={cocina}
        onChange={(v) => onCambiar({ cocina_activa: v })}
      />
    </TarjetaSeccion>
  )
}
