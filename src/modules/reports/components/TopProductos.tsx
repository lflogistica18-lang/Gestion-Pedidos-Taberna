// Más vendidos del período: ranking en barras (unidades) y lista con montos.

import { Crown } from 'lucide-react'
import { BarrasRanking, EncabezadoSeccion, SeccionPanel, fmtMonto } from '@/shared/components/panel'
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
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <BarrasRanking
            datos={productos.map((p) => ({ etiqueta: p.name, valor: p.qty }))}
            descripcion="Productos más vendidos, en unidades"
            etiquetaValor="Unidades"
            formatoValor={(n) => `${n} u.`}
            formatoEje={(n) => String(n)}
          />
          <ol className="divide-y divide-borde-sutil self-start">
            {productos.map((p, i) => (
              <li key={p.name} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-5 shrink-0 text-sm font-semibold text-texto-secundario">{i + 1}</span>
                  <span className="truncate text-sm font-medium text-texto-primario">{p.name}</span>
                </span>
                <span className="shrink-0 text-right text-sm">
                  <strong className="font-bold text-texto-primario">{fmtMonto(p.revenue)}</strong>
                  <span className="ml-2 text-texto-secundario">{p.qty} u.</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </SeccionPanel>
  )
}
