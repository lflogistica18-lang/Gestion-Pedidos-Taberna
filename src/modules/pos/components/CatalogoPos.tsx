import { LayoutGrid } from 'lucide-react'
import type { Product } from '@/types/database.types'
import type { CategoryItem } from '@/modules/products/hooks/useCategories'
import { EstadoVacio } from '@/shared/components/comunes/EstadoVacio'
import { useCartStore } from '../store/useCartStore'
import { ProductGrid } from './ProductGrid'
import { TarjetasCategorias } from '@/shared/components/categorias/TarjetasCategorias'
import { CabeceraCategoria } from '@/shared/components/categorias/CabeceraCategoria'

/** Minúsculas y sin acentos, para buscar sin distinguir. */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

interface CatalogoPosProps {
  products: Product[]
  categories: CategoryItem[]
  loading: boolean
  /** Categoría elegida ('' = ninguna). */
  activeCategory: string
  onElegirCategoria: (nombre: string) => void
  busqueda: string
}

/**
 * Lo que se ve debajo del encabezado de Pedido +.
 * Celular (< md): lista compacta de siempre. Tablet (≥ md): tarjetas de categoría;
 * al elegir una queda su cabecera grande arriba y su lista abajo.
 */
export function CatalogoPos({ products, categories, loading, activeCategory, onElegirCategoria, busqueda }: CatalogoPosProps) {
  const items = useCartStore((s) => s.items)

  const textoBusqueda = normalizar(busqueda.trim())
  const buscando = textoBusqueda !== ''
  const filtrados = products.filter((p) =>
    buscando ? normalizar(p.name).includes(textoBusqueda) : !activeCategory || p.category === activeCategory,
  )

  // Tablet: las tarjetas se ven sin categoría elegida y sin texto en el buscador
  const verTarjetas = !buscando && !activeCategory
  const verCabecera = !buscando && activeCategory !== ''

  const datos = categories
    .map(({ name }) => ({
      nombre: name,
      cantidad: products.filter((p) => p.category === name).length,
      enPedido: items.filter((i) => products.find((p) => p.id === i.productId)?.category === name).reduce((n, i) => n + i.quantity, 0),
    }))
    .filter((c) => c.cantidad > 0)

  return (
    <>
      {verTarjetas && (
        <div className="@container hidden md:block">
          {!loading && datos.length === 0 ? (
            <div className="rounded-xl border border-borde-sutil bg-bg-tarjeta shadow-tarjeta">
              <EstadoVacio mensaje="Todavía no hay productos cargados" icono={<LayoutGrid size={26} />} />
            </div>
          ) : (
            <TarjetasCategorias categorias={datos} loading={loading} onElegir={onElegirCategoria} />
          )}
        </div>
      )}
      {verCabecera && (
        <>
          <div className="hidden md:block">
            <CabeceraCategoria nombre={activeCategory} cantidad={filtrados.length} onVolver={() => onElegirCategoria('')} />
          </div>
          {/* Celular: cabecera de una fila en lugar de las pastillas */}
          <div className="md:hidden">
            <CabeceraCategoria compacta nombre={activeCategory} cantidad={filtrados.length} onVolver={() => onElegirCategoria('')} />
          </div>
        </>
      )}
      {/* En tablet la lista se oculta mientras se ven las tarjetas */}
      <div className={verTarjetas ? 'md:hidden' : undefined}>
        <ProductGrid
          products={filtrados}
          loading={loading}
          agrupar={buscando || !activeCategory}
          mensajeVacio={buscando ? 'No hay productos que coincidan con la búsqueda' : 'No hay productos en esta categoría'}
        />
      </div>
    </>
  )
}
