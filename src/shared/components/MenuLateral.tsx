// =============================================================================
// MenuLateral.tsx — Menú oscuro fijo a la izquierda, solo desde lg. Marca arriba,
// secciones OPERACIÓN y GESTIÓN, y la tarjeta del usuario abajo. Se recoge a un riel
// angosto de íconos (botón arriba; la preferencia queda en useMenu, por aparato).
// =============================================================================

import { NavLink } from 'react-router-dom'
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { TITULOS_SECCION, useItemsNavegacion, type SeccionMenu } from './navegacion'
import { useMenu } from '@/shared/store/useMenu'
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
  const recogido = useMenu((m) => m.recogido)
  const alternar = useMenu((m) => m.alternar)
  const IconoPliegue = recogido ? PanelLeftOpen : PanelLeftClose
  const etiquetaPliegue = recogido ? 'Expandir el menú' : 'Recoger el menú'

  return (
    <aside
      aria-label="Menú principal"
      className={cn(
        'hidden shrink-0 flex-col overflow-hidden border-r border-menu-borde bg-menu-fondo text-menu-texto transition-[width] duration-200 motion-reduce:transition-none lg:flex',
        recogido ? 'w-16' : 'w-60',
      )}
    >
      <div className={cn('flex shrink-0 items-center pb-3 pt-4', recogido ? 'flex-col gap-2 px-3' : 'gap-2.5 px-5')}>
        <img src="/logo-taberna.png" alt={recogido ? 'La Taberna' : ''} className="size-9 shrink-0 rounded-lg object-cover" />
        {!recogido && <span className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight text-menu-texto">La Taberna</span>}
        <button
          type="button"
          onClick={alternar}
          aria-expanded={!recogido}
          aria-label={etiquetaPliegue}
          title={etiquetaPliegue}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-menu-apagado transition-colors hover:bg-menu-activo hover:text-menu-texto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-menu-acento"
        >
          <IconoPliegue size={20} aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Secciones" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3">
        {SECCIONES.map((seccion) => {
          const items = itemsMenu.filter((i) => i.seccion === seccion)
          if (items.length === 0) return null
          return (
            <div key={seccion} role="group" aria-labelledby={`menu-${seccion}`} className="mt-4">
              {/* Recogido: el título queda para lectores de pantalla y una línea separa las secciones */}
              <h2
                id={`menu-${seccion}`}
                className={cn(
                  'text-[11px] font-bold uppercase tracking-widest text-menu-apagado',
                  recogido ? 'sr-only' : 'px-2.5 pb-1.5',
                )}
              >
                {TITULOS_SECCION[seccion]}
              </h2>
              <div className="space-y-0.5">
                {items.map(({ to, label, icono: Icono }) => (
                  <NavLink
                    key={to}
                    to={to}
                    title={recogido ? label : undefined}
                    aria-label={recogido ? label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group flex min-h-11 items-center rounded-lg text-sm transition-colors',
                        recogido ? 'min-w-11 justify-center' : 'gap-3 px-3',
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
                        {!recogido && <span className="min-w-0 truncate">{label}</span>}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Tarjeta del usuario (recogido: solo el avatar y el botón de salir, uno sobre otro) */}
      <div className="shrink-0 p-3">
        <div className={cn('flex items-center rounded-xl border border-menu-borde bg-menu-fondo-2', recogido ? 'flex-col gap-1 p-1' : 'gap-3 p-2.5')}>
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full bg-acento-primario text-sm font-bold text-sobre-acento"
            aria-hidden="true"
            title={recogido ? email : undefined}
          >
            {inicial}
          </span>
          {!recogido && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-menu-texto" title={email}>{abreviado}</p>
              <p className="truncate text-[11px] text-menu-apagado">{armado ? 'Tocá de nuevo para salir' : 'Sesión iniciada'}</p>
            </div>
          )}
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
