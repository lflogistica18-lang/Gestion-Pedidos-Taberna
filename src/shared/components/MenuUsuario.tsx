// Botón de usuario (inicial en círculo) con un menú chico: email y Cerrar sesión.

import { useEffect, useRef, useState } from 'react'
import { LogOut } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { useConfirmarSalida } from './useConfirmarSalida'

interface MenuUsuarioProps {
  email: string
  onSalir: () => Promise<void>
}

export function MenuUsuario({ email, onSalir }: MenuUsuarioProps) {
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)
  const { armado, alTocar } = useConfirmarSalida(onSalir)
  const inicial = (email.trim()[0] ?? '?').toUpperCase()

  // Se cierra al tocar afuera o con Escape.
  useEffect(() => {
    if (!abierto) return
    const alTocarAfuera = (e: PointerEvent) => {
      if (e.target instanceof Node && !contenedor.current?.contains(e.target)) setAbierto(false)
    }
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('pointerdown', alTocarAfuera)
    document.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('pointerdown', alTocarAfuera)
      document.removeEventListener('keydown', alTeclear)
    }
  }, [abierto])

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        aria-label="Menú de usuario"
        aria-haspopup="menu"
        aria-expanded={abierto}
        title={email}
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors hover:bg-superficie-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento-primario"
      >
        <span className="grid size-9 place-items-center rounded-full bg-acento-primario text-sm font-bold text-sobre-acento">{inicial}</span>
      </button>

      {abierto && (
        <div
          role="menu"
          aria-label="Menú de usuario"
          className="absolute right-0 top-full z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-borde-sutil bg-bg-tarjeta p-1.5 shadow-tarjeta"
        >
          <div className="px-3 pb-2 pt-1.5">
            <p className="text-xs text-texto-secundario">Sesión iniciada como</p>
            <p className="truncate text-sm font-semibold text-texto-primario" title={email}>{email}</p>
          </div>
          <div className="border-t border-borde-sutil pt-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={alTocar}
              className={cn(
                'flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium transition-colors',
                armado ? 'bg-tono-rojo-fondo text-tono-rojo-texto' : 'text-texto-primario hover:bg-superficie-2',
              )}
            >
              <LogOut size={16} aria-hidden="true" className={armado ? undefined : 'text-texto-secundario'} />
              {armado ? 'Tocá de nuevo para salir' : 'Cerrar sesión'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
