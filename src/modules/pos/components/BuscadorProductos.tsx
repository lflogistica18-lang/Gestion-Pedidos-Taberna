import { Search, X } from 'lucide-react'
import { Entrada, IconButton } from '@/shared/components/panel'

interface BuscadorProductosProps {
  value: string
  onChange: (texto: string) => void
}

/** Buscador de productos de Pedido +. Desde md (tablet) es más alto y de letra más grande. */
export function BuscadorProductos({ value, onChange }: BuscadorProductosProps) {
  return (
    <div className="relative">
      <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-secundario md:left-4 md:size-6" aria-hidden="true" />
      <Entrada
        type="search"
        aria-label="Buscar producto"
        placeholder="Buscar producto…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        className="w-full pl-10 pr-12 md:min-h-14 md:pl-14 md:pr-16 md:text-lg [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <IconButton
          etiqueta="Borrar búsqueda"
          onClick={() => onChange('')}
          className="absolute right-0 top-1/2 -translate-y-1/2 md:min-h-14 md:min-w-14"
        >
          <X size={18} />
        </IconButton>
      )}
    </div>
  )
}
