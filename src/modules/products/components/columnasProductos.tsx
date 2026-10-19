import { Pastilla, fmtMonto } from '@/shared/components/panel'
import type { ColumnaCrud } from '@/shared/components/comunes/crud/tipos'
import type { Product } from '@/types/database.types'

/** Margen sobre el precio, en %; sin costo cargado no se calcula. */
export function margenPorcentaje(p: Pick<Product, 'price' | 'cost'>): number | null {
  if (!(p.cost > 0) || !(p.price > 0)) return null
  return Math.round(((p.price - p.cost) / p.price) * 100)
}

export const COLUMNAS_PRODUCTOS: ColumnaCrud<Product>[] = [
  { clave: 'name', titulo: 'Nombre', render: p => p.name },
  { clave: 'category', titulo: 'Categoría', render: p => <Pastilla tono="neutro">{p.category}</Pastilla> },
  { clave: 'price', titulo: 'Precio', alinear: 'der', render: p => <span className="font-semibold">{fmtMonto(p.price)}</span> },
  {
    clave: 'cost', titulo: 'Costo', alinear: 'der',
    render: p => <span className="text-texto-secundario">{p.cost > 0 ? fmtMonto(p.cost) : '—'}</span>,
  },
  {
    clave: 'margen', titulo: 'Margen', alinear: 'der',
    render: p => {
      const m = margenPorcentaje(p)
      return <span className="text-texto-secundario">{m === null ? '—' : `${m}%`}</span>
    },
  },
]
