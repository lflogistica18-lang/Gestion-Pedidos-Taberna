// Más vendidos del período: lista numerada con monto y unidades.

import { Crown } from 'lucide-react'
import { EncabezadoSeccion, SeccionPanel, fmtMonto } from '@/shared/components/panel'
import type { TopProducto } from '../hooks/useDashboardStats'

interface TopProductosProps {
  productos: TopProducto[]
}

export function TopProductos({ productos }: TopProductosProps) {
  return (
    <SeccionPanel>
      <EncabezadoSeccion icono={<Crown size={16} />} titulo="Más vendidos" subtitulo="Por unidades en el período" />
      {productos.length === 0 ? (
        <p className="mt-4 text-sm text-texto-secundario">No hay ventas registradas.</p>
      ) : (
        <ol className="mt-3 divide-y divide-borde-sutil">
          {productos.map((p, i) => (
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
      )}
    </SeccionPanel>
  )
}
