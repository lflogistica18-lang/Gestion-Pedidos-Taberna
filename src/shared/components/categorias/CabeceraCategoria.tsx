import { useEffect, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Boton } from '@/shared/components/panel'
import { capitalizar } from '@/shared/lib/iconoCategoria'
import { IconoCategoria } from './IconoCategoria'

interface CabeceraCategoriaProps {
  nombre: string
  cantidad: number
  onVolver: () => void
  /** Una sola fila de ≤ 64 px, para el celular (reemplaza a las pastillas). */
  compacta?: boolean
}

/** Categoría elegida arriba de su lista: grande en tablet/compu, compacta en celular. */
export function CabeceraCategoria({ nombre, cantidad, onVolver, compacta }: CabeceraCategoriaProps) {
  const raiz = useRef<HTMLDivElement>(null)

  // Celular: al aparecer, la cabecera queda arriba y con el foco (las pastillas ya no están).
  // Si se está escribiendo en un campo (borró la búsqueda a mano), no se le saca el foco.
  useEffect(() => {
    const el = raiz.current
    if (!compacta || !el) return
    const activo = document.activeElement
    if (activo instanceof HTMLInputElement || activo instanceof HTMLTextAreaElement) return
    el.focus({ preventScroll: true })
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'start', behavior: sinMovimiento ? 'auto' : 'smooth' })
  }, [compacta, nombre])

  const cantidadTexto = `${cantidad} ${cantidad === 1 ? 'producto' : 'productos'}`

  if (compacta) {
    return (
      <div
        ref={raiz}
        tabIndex={-1}
        className="mb-2 flex min-h-14 items-center gap-2 rounded-xl border border-borde-sutil bg-tono-naranja-fondo px-3 py-1 shadow-tarjeta outline-none"
      >
        <IconoCategoria nombre={nombre} tamano={32} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold leading-tight text-texto-primario">{capitalizar(nombre)}</h3>
          <p className="text-xs text-texto-secundario">{cantidadTexto}</p>
        </div>
        <Boton onClick={onVolver} aria-label="Volver a todas las categorías" className="min-w-11 shrink-0 sm:min-h-11">
          <ArrowLeft size={18} />
          Todas
        </Boton>
      </div>
    )
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-borde-sutil bg-tono-naranja-fondo p-4 shadow-tarjeta">
      <IconoCategoria nombre={nombre} tamano={72} />
      <div className="min-w-0 flex-1">
        <h3 className="break-words text-2xl font-bold leading-tight text-texto-primario">{capitalizar(nombre)}</h3>
        <p className="text-base text-texto-secundario">{cantidadTexto}</p>
      </div>
      <Boton onClick={onVolver} className="min-h-12 text-base sm:min-h-12">
        <ArrowLeft size={20} />
        Todas las categorías
      </Boton>
    </div>
  )
}
