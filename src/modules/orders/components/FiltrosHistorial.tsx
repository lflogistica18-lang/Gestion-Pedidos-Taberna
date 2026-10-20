import { Search } from 'lucide-react'
import { Boton, Entrada, FiltrosPastilla } from '@/shared/components/panel'

export type FiltroEstado = 'todos' | 'entregado' | 'en_curso' | 'cancelado'

interface Props {
  busqueda: string
  onBusqueda: (v: string) => void
  desde: string
  onDesde: (v: string) => void
  hasta: string
  onHasta: (v: string) => void
  hoy: string
  estado: FiltroEstado
  onEstado: (v: FiltroEstado) => void
  cantidades: Record<FiltroEstado, number>
  hayFiltros: boolean
  onLimpiar: () => void
}

export function FiltrosHistorial(p: Props) {
  return (
    <section aria-label="Filtros" className="mb-4 space-y-3 rounded-xl border border-borde-sutil bg-bg-tarjeta p-3 shadow-tarjeta sm:p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1fr)_11rem_11rem_auto] md:items-end">
        <div className="relative col-span-2 md:col-span-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-secundario" aria-hidden="true" />
          <Entrada
            type="search"
            aria-label="Buscar cliente o número de pedido"
            placeholder="Buscar cliente o Nº…"
            value={p.busqueda}
            onChange={(e) => p.onBusqueda(e.target.value)}
            className="w-full pl-9"
          />
        </div>
        <Entrada
          type="date"
          etiqueta="Desde"
          value={p.desde}
          max={p.hasta || p.hoy}
          onChange={(e) => p.onDesde(e.target.value)}
        />
        <Entrada
          type="date"
          etiqueta="Hasta"
          value={p.hasta}
          min={p.desde}
          max={p.hoy}
          onChange={(e) => p.onHasta(e.target.value)}
        />
        {p.hayFiltros && (
          <Boton compacto onClick={p.onLimpiar} className="col-span-2 md:col-span-1">Limpiar</Boton>
        )}
      </div>
      <FiltrosPastilla<FiltroEstado>
        etiqueta="Estado del pedido"
        value={p.estado}
        onChange={p.onEstado}
        opciones={[
          { value: 'todos', label: 'Todos', cantidad: p.cantidades.todos },
          { value: 'entregado', label: 'Entregados', cantidad: p.cantidades.entregado },
          { value: 'en_curso', label: 'En curso', cantidad: p.cantidades.en_curso },
          { value: 'cancelado', label: 'Cancelados', cantidad: p.cantidades.cancelado, tono: 'rojo' },
        ]}
      />
    </section>
  )
}
