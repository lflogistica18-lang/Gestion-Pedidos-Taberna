import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { NavBar } from './NavBar'
import { useAuth } from '@/modules/auth/hooks/useAuth'

// Reloj en tiempo real — actualiza cada segundo
function useReloj() {
  const [ahora, setAhora] = useState(new Date())

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(intervalo)
  }, [])

  const fecha = ahora.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const hora = ahora.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return { fecha, hora }
}

export function Layout() {
  const { fecha, hora } = useReloj()
  const { user, signOut } = useAuth()
  const [confirmLogout, setConfirmLogout] = useState(false)

  // Abreviar email — mostrar usuario antes del @
  const displayName = user?.email?.split('@')[0] ?? ''

  const handleLogout = async () => {
    if (!confirmLogout) {
      setConfirmLogout(true)
      setTimeout(() => setConfirmLogout(false), 3000) // Auto-cancela en 3s
      return
    }
    await signOut()
  }

  return (
    <div className="layout">
      {/* Header naranja con logo, reloj y logout */}
      <header className="app-header">
        <div className="app-header__brand">
          <img
            src="/logo-taberna.png"
            alt="La Taberna"
            className="app-header__logo"
          />
          <span className="app-header__name">La Taberna</span>
        </div>

        <div className="app-header__right">
          <div className="app-header__clock">
            <span className="app-header__time">{hora}</span>
            <span className="app-header__date">{fecha}</span>
          </div>

          {/* Botón de logout — doble tap para confirmar */}
          <button
            onClick={handleLogout}
            className={`app-header__logout ${confirmLogout ? 'app-header__logout--confirm' : ''}`}
            title={confirmLogout ? 'Tocá de nuevo para salir' : `Sesión: ${user?.email}`}
          >
            {confirmLogout ? '¿Salir?' : `👤 ${displayName}`}
          </button>
        </div>
      </header>

      <main className="layout__content">
        <Outlet />
      </main>
      <NavBar />
    </div>
  )
}
