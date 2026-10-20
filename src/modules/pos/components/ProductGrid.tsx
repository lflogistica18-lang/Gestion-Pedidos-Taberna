import { PackageSearch } from 'lucide-react'
import type { Product } from '@/types/database.types'
import { EstadoVacio } from '@/shared/components/comunes/EstadoVacio'
import { useCartStore } from '../store/useCartStore'
import { FilaProducto } from './FilaProducto'

interface ProductGridProps {
  products: Product[]
  loading: boolean
  /** true: se ven varias categorías y cada grupo lleva su encabezado. */
  agrupar: boolean
  /** Mensaje cuando no hay nada que mostrar. */
  mensajeVacio: string
}

// El carrito vive al costado desde lg: la lista pasa a 2 columnas recién desde 1200 px.
const CLASES_LISTA = '-mb-px [&>li]:border-b [&>li]:border-borde-sutil min-[1200px]:grid min-[1200px]:grid-cols-2 min-[1200px]:[&>li:nth-child(odd)]:border-r'

interface Grupo {
  categoria: string
  productos: Product[]
}

function agruparPorCategoria(products: Product[]): Grupo[] {
  const grupos: Grupo[] = []
  for (const p of products) {
    const g = grupos.find((x) => x.categoria === p.category)
    if (g) g.productos.push(p)
    else grupos.push({ categoria: p.category, productos: [p] })
  }
  return grupos
}

/** Lista compacta de productos (una sola tarjeta, filas separadas por línea fina). */
export function ProductGrid({ products, loading, agrupar, mensajeVacio }: ProductGridProps) {
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const items = useCartStore((s) => s.items)

  const getQuantity = (productId: string) =>
    items.find((i) => i.productId === productId)?.quantity ?? 0

  if (loading) {
    return (
      <div
        className="divide-y divide-borde-sutil overflow-hidden rounded-xl border border-borde-sutil bg-bg-tarjeta shadow-tarjeta"
        role="status"
        aria-label="Cargando productos"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex h-12 items-center justify-between px-3">
            <div className="space-y-1.5">
              <div className="h-3 w-32 animate-pulse rounded bg-superficie-2" />
              <div className="h-2.5 w-14 animate-pulse rounded bg-superficie-2" />
            </div>
            <div className="size-11 animate-pulse rounded-md bg-superficie-2" />
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-borde-sutil bg-bg-tarjeta shadow-tarjeta">
        <EstadoVacio mensaje={mensajeVacio} icono={<PackageSearch size={26} />} />
      </div>
    )
  }

  const grupos = agrupar ? agruparPorCategoria(products) : [{ categoria: '', productos: products }]

  return (
    <div className="overflow-hidden rounded-xl border border-borde-sutil bg-bg-tarjeta shadow-tarjeta">
      {grupos.map((g) => (
        <section key={g.categoria || 'todos'} aria-label={g.categoria || undefined} className="overflow-hidden [&:not(:first-child)]:border-t [&:not(:first-child)]:border-borde-sutil">
          {agrupar && (
            <h3 className="border-b border-borde-sutil bg-superficie-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-texto-secundario">
              {g.categoria}
            </h3>
          )}
          <ul className={CLASES_LISTA}>
            {g.productos.map((product) => (
              <FilaProducto
                key={product.id}
                product={product}
                cantidad={getQuantity(product.id)}
                onAgregar={() => addItem(product)}
                onRestar={() => updateQuantity(product.id, -1)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
