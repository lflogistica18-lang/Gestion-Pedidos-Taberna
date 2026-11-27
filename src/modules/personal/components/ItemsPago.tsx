import { X } from 'lucide-react'
import { IconButton } from '@/shared/components/panel'
import { pesos } from '@/shared/lib/formato'
import type { ItemPropuesto } from '../lib/calculos'
import { textoCantidad } from '../lib/etiquetas'

function detalle(i: ItemPropuesto): string | null {
  if (i.modo === 'por_unidad') return `${textoCantidad(i.cantidad)} × ${pesos(i.valor)}`
  if (i.modo === 'dias_de_sueldo') return `${textoCantidad(i.cantidad)} ${i.cantidad === 1 ? 'día' : 'días'} de sueldo`
  if (i.modo === 'porcentaje') return `${textoCantidad(i.valor)} % del sueldo`
  return null
}

interface Props {
  items: ItemPropuesto[]
  /** Sin onQuitar la lista es de solo lectura. */
  onQuitar?: (indice: number) => void
}

export function ItemsPago({ items, onQuitar }: Props) {
  if (items.length === 0) return <p className="py-2 text-sm text-texto-secundario">Sin extras ni descuentos esta semana.</p>
  return (
    <ul className="divide-y divide-borde-sutil">
      {items.map((i, n) => {
        const extra = i.tipo === 'extra'
        const sub = detalle(i)
        return (
          <li key={`${i.nombre}-${n}`} className="flex items-center justify-between gap-2 py-1">
            <div className="min-w-0">
              <p className="break-words text-sm font-medium text-texto-primario">{i.nombre}</p>
              {sub && <p className="text-xs text-texto-secundario">{sub}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className={extra ? 'text-sm font-semibold text-tono-verde-texto' : 'text-sm font-semibold text-tono-rojo-texto'}>
                {extra ? '+' : '−'}{pesos(i.monto)}
              </span>
              {onQuitar && (
                <IconButton etiqueta={`Quitar ${i.nombre}`} variante="peligro" onClick={() => onQuitar(n)}>
                  <X size={16} />
                </IconButton>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
