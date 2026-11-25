import { useMemo } from 'react'
import { TarjetasCategorias } from '@/shared/components/categorias/TarjetasCategorias'
import type { CategoryItem } from '../hooks/useCategories'

interface TarjetasProductosProps {
  categorias: CategoryItem[]
  /** Productos de la pestaña que se está viendo, por nombre de categoría. */
  conteos: Record<string, number>
  loading: boolean
  /** En la pestaña de inactivos se esconden las categorías sin productos. */
  ocultarVacias: boolean
  onElegir: (nombre: string) => void
}

/** Entrada de Productos en tablet y compu: una tarjeta con dibujo por categoría. */
export function TarjetasProductos({ categorias, conteos, loading, ocultarVacias, onElegir }: TarjetasProductosProps) {
  const datos = useMemo(
    () => categorias
      .map(({ name }) => ({ nombre: name, cantidad: conteos[name] ?? 0 }))
      .filter((c) => !ocultarVacias || c.cantidad > 0),
    [categorias, conteos, ocultarVacias],
  )

  return (
    <div className="@container mb-4">
      <TarjetasCategorias categorias={datos} loading={loading} onElegir={onElegir} />
    </div>
  )
}
