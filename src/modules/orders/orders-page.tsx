import { useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { useAdminOrders } from './hooks/useAdminOrders'
import { Boton, EncabezadoPagina, fmtMonto } from '@/shared/components/panel'
import { EstadoCargando } from '@/shared/components/comunes/EstadoCargando'
import { EstadoError } from '@/shared/components/comunes/EstadoError'
import { EstadoVacio } from '@/shared/components/comunes/EstadoVacio'
import { DetallePedido } from './components/DetallePedido'
import { FiltrosHistorial, type FiltroEstado } from './components/FiltrosHistorial'
import { ListaPedidos } from './components/ListaPedidos'
import { PestanasHistorial, type PestanaHistorial } from './components/PestanasHistorial'
import { ESTADOS_EN_CURSO, toDateStr } from './components/formato'

export default function OrdersPage() {
  const [tab, setTab] = useState<PestanaHistorial>('historial')
  const { orders, loading, error, refetch, enviarAPapelera, restaurarDePapelera, hayMas, cargandoMas, cargarMas } = useAdminOrders()

  const hoy = toDateStr(new Date())
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [estado, setEstado] = useState<FiltroEstado>('todos')
  const [abiertoId, setAbiertoId] = useState<string | null>(null)

  // Pedidos de la pestaña, con fecha y búsqueda aplicadas (todavía sin el filtro de estado)
  const baseFiltrada = useMemo(() => {
    let filtered = orders.filter(o => tab === 'historial' ? !o.deleted_at : !!o.deleted_at)

    if (dateFrom) {
      const from = new Date(dateFrom)
      from.setHours(0, 0, 0, 0)
      filtered = filtered.filter(o => new Date(o.created_at) >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      filtered = filtered.filter(o => new Date(o.created_at) <= to)
    }
    if (busquedaCliente.trim()) {
      const q = busquedaCliente.toLowerCase()
      filtered = filtered.filter(o =>
        (o.customer_name || '').toLowerCase().includes(q) ||
        String(o.order_number).includes(q)
      )
    }
    return filtered
  }, [orders, tab, dateFrom, dateTo, busquedaCliente])

  const cantidades = useMemo<Record<FiltroEstado, number>>(() => ({
    todos: baseFiltrada.length,
    entregado: baseFiltrada.filter(o => o.status === 'entregado').length,
    en_curso: baseFiltrada.filter(o => ESTADOS_EN_CURSO.includes(o.status)).length,
    cancelado: baseFiltrada.filter(o => o.status === 'cancelado').length,
  }), [baseFiltrada])

  const ordenesFiltradas = useMemo(() => {
    if (estado === 'todos') return baseFiltrada
    if (estado === 'en_curso') return baseFiltrada.filter(o => ESTADOS_EN_CURSO.includes(o.status))
    return baseFiltrada.filter(o => o.status === estado)
  }, [baseFiltrada, estado])

  const totalFiltrado = useMemo(
    () => ordenesFiltradas.filter(o => o.status !== 'cancelado').reduce((s, o) => s + o.total, 0),
    [ordenesFiltradas],
  )

  const cantidadHistorial = useMemo(() => orders.filter(o => !o.deleted_at).length, [orders])
  const cantidadPapelera = orders.length - cantidadHistorial

  const hayFiltros = !!(dateFrom || dateTo || busquedaCliente || estado !== 'todos')
  const limpiar = () => { setDateFrom(''); setDateTo(''); setBusquedaCliente(''); setEstado('todos') }

  const abierto = orders.find(o => o.id === abiertoId) ?? null

  if (loading) return <EstadoCargando />
  if (error) return <EstadoError mensaje={error} onReintentar={refetch} />

  const detalle = tab === 'historial'
    ? `${orders.length} pedidos cargados · ${fmtMonto(totalFiltrado)}`
    : `${orders.length} pedidos cargados`

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <EncabezadoPagina
        icono={<ClipboardList size={22} />}
        titulo="Historial"
        detalle={detalle}
        pestanas={
          <PestanasHistorial
            value={tab}
            onChange={setTab}
            cantidadHistorial={cantidadHistorial}
            cantidadPapelera={cantidadPapelera}
          />
        }
      />

      <FiltrosHistorial
        busqueda={busquedaCliente}
        onBusqueda={setBusquedaCliente}
        desde={dateFrom}
        onDesde={setDateFrom}
        hasta={dateTo}
        onHasta={setDateTo}
        hoy={hoy}
        estado={estado}
        onEstado={setEstado}
        cantidades={cantidades}
        hayFiltros={hayFiltros}
        onLimpiar={limpiar}
      />

      {ordenesFiltradas.length === 0 ? (
        hayFiltros ? (
          <EstadoVacio mensaje="No hay pedidos con esos filtros" accion={{ texto: 'Limpiar filtros', onClick: limpiar }} />
        ) : (
          <EstadoVacio mensaje={tab === 'historial' ? 'No hay pedidos en el historial' : 'La papelera está vacía'} />
        )
      ) : (
        <ListaPedidos pedidos={ordenesFiltradas} onAbrir={setAbiertoId} />
      )}

      {hayMas && (
        <div className="mt-4 flex justify-center">
          <Boton onClick={cargarMas} disabled={cargandoMas}>
            {cargandoMas ? 'Cargando…' : 'Cargar más'}
          </Boton>
        </div>
      )}

      <DetallePedido
        key={abiertoId ?? 'cerrado'}
        pedido={abierto}
        onCerrar={() => setAbiertoId(null)}
        enviarAPapelera={enviarAPapelera}
        restaurarDePapelera={restaurarDePapelera}
      />
    </div>
  )
}
