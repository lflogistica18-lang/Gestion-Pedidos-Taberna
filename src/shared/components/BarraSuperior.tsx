// =============================================================================
// BarraSuperior.tsx — Barra de arriba. En celu y tablet parada (< lg): logo y
// nombre a la izquierda. Desde lg el logo ya está en el menú lateral y en su
// lugar va el título de la pantalla. A la derecha, siempre: reloj y usuario.
// =============================================================================

import { useLocation } from 'react-router-dom'
import { MenuUsuario } from './MenuUsuario'
import { Reloj } from './Reloj'
import { tituloDeRuta } from './navegacion'

interface BarraSuperiorProps {
  email: string
  onSalir: () => Promise<void>
}

export function BarraSuperior({ email, onSalir }: BarraSuperiorProps) {
  const { pathname } = useLocation()
  const titulo = tituloDeRuta(pathname)

  return (
    <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b border-borde-sutil bg-bg-tarjeta px-4 lg:px-6">
      {/* < lg: marca */}
      <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
        <img src="/logo-taberna.png" alt="" className="size-8 shrink-0 rounded-lg object-cover" />
        <span className="truncate text-base font-bold tracking-tight text-texto-primario">La Taberna</span>
      </div>
      {/* ≥ lg: título de la pantalla */}
      <h1 className="hidden min-w-0 truncate text-lg font-bold text-texto-primario lg:block">{titulo}</h1>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <Reloj />
        <MenuUsuario email={email} onSalir={onSalir} />
      </div>
    </header>
  )
}
