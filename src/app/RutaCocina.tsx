import { Navigate } from 'react-router-dom'
import { useConfiguracion } from '@/shared/store/useConfiguracion'
import { EstadoCargando } from '@/shared/components/comunes/EstadoCargando'
import KdsPage from '@/modules/kds/kds-page'

// La Cocina solo existe si la configuración del local la activa. Se espera a la
// primera lectura de la configuración: si no, un link directo a /kds rebotaría
// a la Caja antes de saber si la Cocina está encendida.
export function RutaCocina() {
  const cargada = useConfiguracion((s) => s.cargada)
  const cocinaActiva = useConfiguracion((s) => s.config.cocina_activa)

  if (!cargada) return <EstadoCargando />
  return cocinaActiva ? <KdsPage /> : <Navigate to="/pos" replace />
}
