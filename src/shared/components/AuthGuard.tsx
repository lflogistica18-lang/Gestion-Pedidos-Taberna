import { Navigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'

interface AuthGuardProps {
  children: React.ReactNode
}

// Protege rutas — si no hay sesión redirige a /login
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth()

  // Mientras verifica la sesión, mostrar pantalla en blanco (evita flash)
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#fffbf0',
      }}>
        <span style={{ fontSize: '2rem', animation: 'pulse 1.2s ease-in-out infinite' }}>🍺</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
