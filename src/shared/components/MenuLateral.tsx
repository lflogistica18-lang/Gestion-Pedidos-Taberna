// =============================================================================
// MenuLateral.tsx — Menú oscuro fijo a la izquierda, solo desde lg. Marca arriba,
// secciones OPERACIÓN y GESTIÓN, y la tarjeta del usuario abajo. No se pliega.
// =============================================================================

import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { TITULOS_SECCION, useItemsNavegacion, type SeccionMenu } from './navegacion'
import { useConfirmarSalida } from './useConfirmarSalida'

interface MenuLateralProps {
  email: string
  onSalir: () => Promise<void>
}

const SECCIONES: SeccionMenu[] = ['operacion', 'gestion', 'ajustes']

export function MenuLateral({ email, onSalir }: MenuLateralProps) {
  const itemsMenu = useItemsNavegacion()
  const { armado, alTocar } = useConfirmarSalida(onSalir)
  const inicial = (email.trim()[0] ?? '?').toUpperCase()
  const abreviado = email.split('@')[0] ?? email

  return (
    <aside
      aria-label="Menú principal"
      className="hidden w-60 shrink-0 flex-col border-r border-menu-borde bg-menu-fondo text-menu-texto lg:flex"
    >
      <div className="flex shrink-0 items-center gap-2.5 px-5 pb-3 pt-4">
        <img src="/logo-taberna.png" alt="" className="size-9 shrink-0 rounded-lg object-cover" />
        <span className="text-lg font-bold tracking-tight text-menu-texto">La Taberna</span>
      </div>

      <nav aria-label="Secciones" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {SECCIONES.map((seccion) => {
          const items = itemsMenu.filter((i) => i.seccion === seccion)
          if (items.length === 0) return null
          return (
            <div key={seccion} role="group" aria-labelledby={`menu-${seccion}`} className="mt-4">
              <h2 id={`menu-${seccion}`} className="px-2.5 pb-1.5 text-[11px] font-bold uppercase tracking-widest text-menu-apagado">
                {TITULOS_SECCION[seccion]}
              </h2>
              <div className="space-y-0.5">
                {items.map(({ to, label, icono: Icono }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        'group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors',
                        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-menu-acento',
                        isActive
                          ? 'bg-menu-activo font-semibold text-sobre-acento'
                          : 'font-medium text-menu-texto hover:bg-menu-activo/60',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icono size={18} aria-hidden="true" className={cn('shrink-0 transition-colors', isActive ? 'text-menu-acento' : 'text-menu-apagado group-hover:text-menu-texto')} />
                        {label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Tarjeta del usuario */}
      <div className="shrink-0 p-3">
        <div className="flex items-center gap-3 rounded-xl border border-menu-borde bg-menu-fondo-2 p-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-acento-primario text-sm font-bold text-sobre-acento" aria-hidden="true">
            {inicial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-menu-texto" title={email}>{abreviado}</p>
            <p className="truncate text-[11px] text-menu-apagado">{armado ? 'Tocá de nuevo para salir' : 'Sesión iniciada'}</p>
          </div>
          <button
            type="button"
            onClick={alTocar}
            aria-label={armado ? 'Confirmar salida' : 'Salir'}
            title={armado ? 'Tocá de nuevo para salir' : 'Salir'}
            className={cn(
              'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg transition-colors',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-menu-acento',
              armado ? 'bg-tono-rojo-solido text-sobre-acento' : 'text-menu-apagado hover:bg-menu-activo hover:text-menu-texto',
            )}
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  )
}
