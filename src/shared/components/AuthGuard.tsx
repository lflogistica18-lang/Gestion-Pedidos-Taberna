import { Navigate } from 'react-router-dom'
import { useAuth, ROL_APP } from '@/modules/auth/hooks/useAuth'

interface AuthGuardProps {
  children: React.ReactNode
}

// Protege rutas — si no hay sesión redirige a /login.
// Si hay sesión pero el usuario no tiene el rol de la app, la base le va a
// negar todo (RLS): mejor decirlo acá que mostrar pantallas vacías.
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, tieneRol, loading, user, signOut } = useAuth()

  // Mientras verifica la sesión, mostrar pantalla en blanco (evita flash)
  if (loading) {
    return (
      <div className="auth-splash">
        <span className="auth-splash__icon">🍺</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!tieneRol) {
    return (
      <div className="login-page">
        <div className="login-bg" />
        <div className="login-card">
          <div className="login-brand">
            <div className="login-brand__logo">🔒</div>
            <h1 className="login-brand__name">Sin acceso</h1>
            <p className="login-brand__sub">
              El usuario <b>{user?.email}</b> no tiene habilitado el acceso a La Taberna.
              Pedile al administrador que le asigne el rol <code>{ROL_APP}</code>.
            </p>
          </div>
          <button className="login-form__btn" onClick={signOut}>
            Salir
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
