import { useState } from 'react'
import { useAdminOrders } from './hooks/useAdminOrders'
import { CrudManager } from '@/shared/components/comunes/CrudManager'
import type { CampoSchema } from '@/shared/types/base'
import type { Order } from '@/types/database.types'

type Tab = 'historial' | 'eliminados'

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>('historial')
  const { orders, loading, error, refetch, editOrder, deactivateOrder } = useAdminOrders()

  // Separar pedidos funcionales de los eliminados logicamente
  const filteredOrders = orders.filter(o => tab === 'historial' ? !o.deleted_at : !!o.deleted_at)

  const campos: CampoSchema[] = [
    { nombre: 'order_number', etiqueta: 'Nº Orden', tipo: 'numero', obligatorio: false },
    { nombre: 'customer_name', etiqueta: 'Cliente', tipo: 'texto', obligatorio: false },
    { nombre: 'type', etiqueta: 'Tipo', tipo: 'select', opciones: ['local', 'delivery', 'directo'] },
    { nombre: 'status', etiqueta: 'Estado', tipo: 'select', opciones: ['pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado'] },
    { nombre: 'total', etiqueta: 'Total ($)', tipo: 'numero' }
  ]

  const handleCrear = async () => ({ error: "Creación inhabilitada desde auditoría. Use la Caja." })
  
  const handleEditar = async (id: string, datos: Partial<Order>) => {
    const updates: Partial<Order> = {}
    if (datos.customer_name !== undefined) updates.customer_name = datos.customer_name
    if (datos.type !== undefined) updates.type = datos.type
    if (datos.status !== undefined) updates.status = datos.status
    if (datos.total !== undefined) updates.total = Number(datos.total)

    const result = await editOrder(id, updates)
    if (!result.error) refetch()
    return result
  }

  const handleDesactivar = async (id: string) => {
    const result = await deactivateOrder(id)
    if (!result.error) refetch()
    return result
  }

  return (
    <div className="flex flex-col container mx-auto">
      <div className="bg-white p-4 rounded-lg shadow-sm border m-4 mb-0 flex gap-2">
        <button 
          onClick={() => setTab('historial')} 
          className={`px-4 py-2 rounded-md text-sm border ${tab === 'historial' ? 'bg-blue-600 text-white' : 'text-gray-700 bg-gray-50'}`}
        >
          Historial Vivo
        </button>
        <button 
          onClick={() => setTab('eliminados')} 
          className={`px-4 py-2 rounded-md text-sm border ${tab === 'eliminados' ? 'bg-blue-600 text-white' : 'text-gray-700 bg-gray-50'}`}
        >
          Papelera
        </button>
      </div>

      <CrudManager<Order>
        titulo={tab === 'historial' ? 'Auditoría de Órdenes' : 'Órdenes en Papelera'}
        datos={filteredOrders}
        campos={campos}
        cargando={loading}
        error={error}
        hideCrear={true}
        onCrear={handleCrear}
        onEditar={handleEditar}
        onDesactivar={handleDesactivar}
        onRecargar={refetch}
      />
    </div>
  )
}
