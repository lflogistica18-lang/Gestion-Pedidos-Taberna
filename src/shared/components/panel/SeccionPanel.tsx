// =============================================================================
// SeccionPanel.tsx — Tarjeta que envuelve una sección (gráficos, listas).
// El título es opcional: si la sección ya trae el suyo, se envuelve sin título.
// =============================================================================

import type { ReactNode } from 'react'

interface SeccionPanelProps {
  titulo?: string
  children: ReactNode
}

export function SeccionPanel({ titulo, children }: SeccionPanelProps) {
  return (
    <section className="min-w-0 rounded-xl border border-borde-sutil bg-bg-tarjeta p-4 shadow-tarjeta sm:p-5">
      {titulo && <h2 className="mb-3 text-base font-semibold text-texto-primario">{titulo}</h2>}
      {children}
    </section>
  )
}
