import { Navigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useAuth, ROL_APP } from '@/modules/auth/hooks/useAuth'
import { Boton } from './panel'

interface AuthGuardProps {
  children: React.ReactNode
}

// Protege rutas — si no hay sesión redirige a /login.
// Si hay sesión pero el usuario no tiene el rol de la app, la base le va a
// negar todo (RLS): mejor decirlo acá que mostrar pantallas vacías.
export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, tieneRol, loading, user, signOut } = useAuth()

  // Mientras verifica la sesión, mostrar el logo pulsando (evita el flash de login)
  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg-principal" role="status" aria-label="Cargando">
        <img src="/logo-taberna.png" alt="" className="size-16 animate-pulse rounded-2xl object-cover" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!tieneRol) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg-principal p-4">
        <div className="w-full max-w-100 rounded-2xl border border-borde-sutil bg-bg-tarjeta p-6 text-center shadow-tarjeta sm:p-8">
          <span className="mx-auto flex size-14 items-center justify-center rounded-xl border border-tono-ambar-borde bg-tono-ambar-fondo text-tono-ambar-solido" aria-hidden="true">
            <Lock size={26} />
          </span>
          <h1 className="mt-4 text-xl font-bold text-texto-primario">Sin acceso</h1>
          <p className="mt-2 break-words text-sm text-texto-secundario">
            El usuario <b className="text-texto-primario">{user?.email}</b> no tiene habilitado el acceso a La Taberna.
            Pedile al administrador que le asigne el rol <code className="rounded bg-superficie-2 px-1 py-0.5 text-texto-primario">{ROL_APP}</code>.
          </p>
          <Boton variante="contorneado" className="mt-6 w-full" onClick={signOut}>
            Salir
          </Boton>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
