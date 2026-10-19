// =============================================================================
// EncabezadoSeccion.tsx — Encabezado de una sección: ícono en círculo, título,
// subtítulo y, a la derecha, los selectores de la sección.
// =============================================================================

import type { ReactNode } from 'react'

interface EncabezadoSeccionProps {
  /** Ícono lucide chico (size 16); el círculo y el color los pone el encabezado. */
  icono: ReactNode
  titulo: string
  /** Puede llevar un <strong> para resaltar el número. */
  subtitulo?: ReactNode
  /** Selectores (período, orden). Debajo del título en celu. */
  children?: ReactNode
}

// flex-wrap: si los selectores no entran al lado del título, bajan a su propia línea.
export function EncabezadoSeccion({ icono, titulo, subtitulo, children }: EncabezadoSeccionProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex shrink-0 items-center gap-3">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-acento-primario/10 text-acento-primario"
          aria-hidden="true"
        >
          {icono}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-texto-primario">{titulo}</h2>
          {subtitulo && <p className="text-sm text-texto-secundario">{subtitulo}</p>}
        </div>
      </div>
      {children && <div className="min-w-0 max-w-full">{children}</div>}
    </header>
  )
}
