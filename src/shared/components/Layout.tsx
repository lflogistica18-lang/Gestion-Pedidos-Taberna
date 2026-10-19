// =============================================================================
// Layout.tsx — Cáscara de la app. Desde lg: menú lateral a la izquierda y barra
// superior arriba del contenido. Debajo de lg: barra superior arriba y NavBar
// abajo. El contenido (`<main>`) scrollea solo y no lleva padding: cada pantalla
// pone el suyo.
// =============================================================================

import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useConfiguracion } from '@/shared/store/useConfiguracion'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { BarraSuperior } from './BarraSuperior'
import { MenuLateral } from './MenuLateral'
import { NavBar } from './NavBar'
import { ContenedorToasts } from './panel'

export function Layout() {
  const { user, signOut } = useAuth()
  const email = user?.email ?? ''
  const cargarConfiguracion = useConfiguracion((s) => s.cargar)

  // La configuración del local se lee una vez al entrar (ya con sesión iniciada)
  useEffect(() => {
    void cargarConfiguracion()
  }, [cargarConfiguracion])

  return (
    <div className="flex h-dvh overflow-hidden bg-bg-principal">
      <MenuLateral email={email} onSalir={signOut} />
      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior email={email} onSalir={signOut} />
        {/* `relative` contiene los textos sr-only de los gráficos, que si no estiran el scroll */}
        <main className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-bg-principal [-webkit-overflow-scrolling:touch]">
          <Outlet />
        </main>
        <NavBar />
      </div>
      <ContenedorToasts />
    </div>
  )
}
