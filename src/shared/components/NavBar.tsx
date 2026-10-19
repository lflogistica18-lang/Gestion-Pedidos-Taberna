// Barra de navegación de abajo: solo en celu y tablet parada (< lg).

import { NavLink } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { useItemsNavegacion } from './navegacion'

export function NavBar() {
  const items = useItemsNavegacion().filter((i) => i.enBarraInferior !== false)
  return (
    <nav
      aria-label="Navegación principal"
      className="flex shrink-0 border-t border-borde-sutil bg-bg-tarjeta pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {items.map(({ to, label, icono: Icono }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11px] font-semibold transition-colors',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-acento-primario',
              isActive ? 'text-acento-primario' : 'text-texto-secundario hover:text-texto-primario',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', isActive && 'bg-acento-primario/10')}>
                <Icono size={22} aria-hidden="true" />
              </span>
              <span className="max-w-full truncate">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
