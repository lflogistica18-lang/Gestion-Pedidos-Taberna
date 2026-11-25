import { Search } from 'lucide-react'
import { Entrada, FiltrosPastilla } from '@/shared/components/panel'

interface Props {
  busqueda: string
  onBusqueda: (v: string) => void
  /** Categoría activa o 'todas'. */
  categoria: string
  onCategoria: (v: string) => void
  /** Categorías con la cantidad de productos de la pestaña. */
  opciones: { nombre: string; cantidad: number }[]
  total: number
  /** Desde md las categorías se eligen con tarjetas: las pastillas quedan solo en el celu. */
  pastillasSoloCelu?: boolean
}

export function FiltrosProductos({ busqueda, onBusqueda, categoria, onCategoria, opciones, total, pastillasSoloCelu }: Props) {
  return (
    <div className="mb-4 space-y-3">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-secundario" aria-hidden="true" />
        <Entrada
          type="search"
          aria-label="Buscar producto"
          placeholder="Buscar producto por nombre…"
          className="w-full pl-10"
          value={busqueda}
          onChange={e => onBusqueda(e.target.value)}
        />
      </div>
      {opciones.length > 0 && (
        // Con una categoría elegida (sin búsqueda) se quitan: queda la cabecera compacta con "Todas"
        <div className={categoria !== 'todas' && busqueda.trim() === '' ? 'hidden' : pastillasSoloCelu ? 'md:hidden' : undefined}>
        <FiltrosPastilla
          etiqueta="Categoría"
          value={categoria}
          onChange={onCategoria}
          opciones={[
            { value: 'todas', label: 'Todas', cantidad: total },
            ...opciones.map(o => ({ value: o.nombre, label: o.nombre, cantidad: o.cantidad })),
          ]}
        />
        </div>
      )}
    </div>
  )
}
