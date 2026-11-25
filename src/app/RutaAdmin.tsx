import { Navigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'

// Envuelve las pantallas que solo ve el admin (Caja, Productos, Configuración,
// Cocina). El rol solo pedidos rebota a Pedido +. La base además le niega los datos.
export function RutaAdmin({ children }: { children: React.ReactNode }) {
  const { esAdmin } = useAuth()
  return esAdmin ? <>{children}</> : <Navigate to="/pos" replace />
}

// Pantalla de inicio según el rol: el admin entra a Caja, solo pedidos a Pedido +.
export function RutaInicio() {
  const { esAdmin } = useAuth()
  return <Navigate to={esAdmin ? '/reports' : '/pos'} replace />
}
