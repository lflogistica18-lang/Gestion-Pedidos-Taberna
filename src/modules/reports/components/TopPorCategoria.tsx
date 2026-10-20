// Top 3 de cada categoría, una tarjeta por categoría.

import { Beef, CupSoda, IceCreamCone, Package, Pizza, type LucideIcon } from 'lucide-react'
import { EncabezadoSeccion, SeccionPanel, fmtMonto } from '@/shared/components/panel'
import type { TopProducto } from '../hooks/useDashboardStats'

function iconoDeCategoria(categoria: string): LucideIcon {
  const c = categoria.trim().toLowerCase()
  if (c === 'comida' || c.startsWith('hamburguesa')) return Beef
  if (c.startsWith('pizza')) return Pizza
  if (c.startsWith('bebida')) return CupSoda
  if (c.startsWith('postre')) return IceCreamCone
  return Package
}

interface TopPorCategoriaProps {
  porCategoria: Record<string, TopProducto[]>
}

export function TopPorCategoria({ porCategoria }: TopPorCategoriaProps) {
  const categorias = Object.entries(porCategoria)
  if (categorias.length === 0) return null
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {categorias.map(([categoria, items]) => {
        const Icono = iconoDeCategoria(categoria)
        return (
          <SeccionPanel key={categoria}>
            <EncabezadoSeccion icono={<Icono size={16} />} titulo={categoria} subtitulo="Más vendidos" />
            <ol className="mt-3 divide-y divide-borde-sutil">
              {items.slice(0, 3).map((p, i) => (
                <li key={p.name} className="flex min-w-0 items-center gap-3 py-2.5">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="w-5 shrink-0 text-sm font-semibold text-texto-secundario">{i + 1}</span>
                    <span className="truncate text-sm font-medium text-texto-primario">{p.name}</span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-right text-sm">
                    <strong className="font-bold text-texto-primario">{fmtMonto(p.revenue)}</strong>
                    <span className="ml-2 text-texto-secundario">{p.qty} u.</span>
                  </span>
                </li>
              ))}
            </ol>
          </SeccionPanel>
        )
      })}
    </div>
  )
}
