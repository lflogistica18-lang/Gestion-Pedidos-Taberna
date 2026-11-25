import { Pastilla } from '@/shared/components/panel'
import { cn } from '@/shared/lib/cn'
import { capitalizar } from '../lib/iconoCategoria'
import { IconoCategoria } from './IconoCategoria'

export interface DatoCategoria {
  nombre: string
  /** Productos activos de la categoría. */
  cantidad: number
  /** Unidades de esta categoría que ya están en el pedido en curso. */
  enPedido: number
}

interface TarjetasCategoriasProps {
  categorias: DatoCategoria[]
  loading: boolean
  onElegir: (nombre: string) => void
}

/** Grilla de tarjetas grandes, una por categoría (vista de tablet). */
export function TarjetasCategorias({ categorias, loading, onElegir }: TarjetasCategoriasProps) {
  // Columnas según el ancho de la zona del catálogo (container query), no del viewport
  const clasesGrilla = 'grid grid-cols-2 gap-3 @[420px]:grid-cols-3 @[720px]:grid-cols-4 @[1000px]:grid-cols-5'

  if (loading) {
    return (
      <div className={clasesGrilla} role="status" aria-label="Cargando categorías">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="min-h-36 animate-pulse rounded-xl border border-borde-sutil bg-superficie-2" />
        ))}
      </div>
    )
  }

  return (
    <ul className={clasesGrilla} aria-label="Categorías">
      {categorias.map((c) => (
        <li key={c.nombre} className="flex">
          <button
            type="button"
            onClick={() => onElegir(c.nombre)}
            aria-label={`${capitalizar(c.nombre)}, ${c.cantidad} ${c.cantidad === 1 ? 'producto' : 'productos'}${c.enPedido > 0 ? `, ${c.enPedido} en el pedido` : ''}`}
            className={cn(
              'flex min-h-36 w-full flex-col items-center gap-2 rounded-xl border p-3 text-center shadow-tarjeta transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento-primario',
              c.enPedido > 0
                ? 'border-tono-naranja-borde bg-tono-naranja-fondo'
                : 'border-borde-sutil bg-bg-tarjeta hover:bg-tono-naranja-fondo active:bg-tono-naranja-fondo',
            )}
          >
            <IconoCategoria nombre={c.nombre} tamano={60} />
            <span lang="es" className="line-clamp-3 block w-full text-balance break-words text-lg font-bold leading-tight text-texto-primario hyphens-auto">
              {capitalizar(c.nombre)}
            </span>
            <span className="mt-auto block whitespace-nowrap text-sm text-texto-secundario">
              {c.cantidad} {c.cantidad === 1 ? 'producto' : 'productos'}
            </span>
            {c.enPedido > 0 && (
              <Pastilla tono="naranja" className="text-sm font-semibold">
                {c.enPedido} en el pedido
              </Pastilla>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}
