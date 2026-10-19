import { PackageSearch } from 'lucide-react'
import type { Product } from '@/types/database.types'
import { EstadoVacio } from '@/shared/components/comunes/EstadoVacio'
import { useCartStore } from '../store/useCartStore'
import { TarjetaProducto } from './TarjetaProducto'

interface ProductGridProps {
  products: Product[]
  loading: boolean
}

// El carrito vive al costado desde lg: con menos ancho útil la grilla pasa a 2 y 3 columnas.
const CLASES_GRILLA = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 min-[1200px]:grid-cols-3 2xl:grid-cols-4'

export function ProductGrid({ products, loading }: ProductGridProps) {
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const items = useCartStore((s) => s.items)

  const getQuantity = (productId: string) =>
    items.find((i) => i.productId === productId)?.quantity ?? 0

  if (loading) {
    return (
      <div className={CLASES_GRILLA} role="status" aria-label="Cargando productos">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-borde-sutil bg-superficie-2" />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-borde-sutil bg-bg-tarjeta shadow-tarjeta">
        <EstadoVacio mensaje="No hay productos en esta categoría" icono={<PackageSearch size={26} />} />
      </div>
    )
  }

  return (
    <div className={CLASES_GRILLA}>
      {products.map((product) => (
        <TarjetaProducto
          key={product.id}
          product={product}
          cantidad={getQuantity(product.id)}
          onAgregar={() => addItem(product)}
          onRestar={() => updateQuantity(product.id, -1)}
        />
      ))}
    </div>
  )
}
