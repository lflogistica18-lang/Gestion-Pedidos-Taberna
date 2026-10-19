// =============================================================================
// BarraSuperior.tsx — Barra de arriba. En celu y tablet parada (< lg): logo y
// nombre a la izquierda. Desde lg el logo ya está en el menú lateral y en su
// lugar va la ruta chica (Gestión › Productos). A la derecha, siempre: reloj y usuario.
// =============================================================================

import { useLocation } from 'react-router-dom'
import { MenuUsuario } from './MenuUsuario'
import { Reloj } from './Reloj'
import { ChevronRight } from 'lucide-react'
import { seccionDeRuta, tituloDeRuta } from './navegacion'

interface BarraSuperiorProps {
  email: string
  onSalir: () => Promise<void>
}

export function BarraSuperior({ email, onSalir }: BarraSuperiorProps) {
  const { pathname } = useLocation()
  const titulo = tituloDeRuta(pathname)
  const seccion = seccionDeRuta(pathname)

  return (
    <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b border-borde-sutil bg-bg-tarjeta px-4 lg:px-6">
      {/* < lg: marca */}
      <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
        <img src="/logo-taberna.png" alt="" className="size-8 shrink-0 rounded-lg object-cover" />
        <span className="truncate text-base font-bold tracking-tight text-texto-primario">La Taberna</span>
      </div>
      {/* ≥ lg: ruta chica. El título grande lo pone el EncabezadoPagina de cada pantalla */}
      <nav aria-label="Ubicación" className="hidden min-w-0 items-center gap-1.5 truncate text-sm lg:flex">
        <span className="text-texto-secundario">{seccion}</span>
        <ChevronRight size={14} className="shrink-0 text-texto-secundario" aria-hidden="true" />
        <span className="font-semibold text-texto-primario" aria-current="page">{titulo}</span>
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <Reloj />
        <MenuUsuario email={email} onSalir={onSalir} />
      </div>
    </header>
  )
}
