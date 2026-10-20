// =============================================================================
// BannerSaludo.tsx — Banner degradé de bienvenida. Solo se usa en Reportes.
// El texto va en `sobre-acento` y en negrita (el degradé claro da 3:1: solo
// alcanza para texto grande).
// =============================================================================

import type { ReactNode } from 'react'

interface BannerSaludoProps {
  titulo: string
  subtitulo?: string
  /** Botones o selectores debajo del texto. */
  acciones?: ReactNode
  /** Contenido libre debajo (por ejemplo, el total del día). */
  children?: ReactNode
}

export function BannerSaludo({ titulo, subtitulo, acciones, children }: BannerSaludoProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-banner-desde to-banner-hasta p-5 text-sobre-acento sm:p-7">
      {/* Brillo diagonal decorativo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-10 h-[160%] w-1/3 rotate-12 bg-gradient-to-r from-sobre-acento/0 via-sobre-acento/10 to-sobre-acento/0"
      />
      <div className="relative">
        <h1 className="break-words text-2xl font-extrabold tracking-tight sm:text-3xl">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm font-semibold text-sobre-acento/90 sm:text-base">{subtitulo}</p>}
        {children && <div className="mt-4">{children}</div>}
        {acciones && <div className="mt-5 flex flex-wrap gap-3">{acciones}</div>}
      </div>
    </section>
  )
}
