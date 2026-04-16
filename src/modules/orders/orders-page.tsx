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
    <div>
      {/* Barra de tabs integrada en el pos-header */}
      <div className="pos-header" style={{ position: 'sticky', top: 0, zIndex: 10, gap: '12px', flexWrap: 'wrap' }}>
        {/* Tabs Historial / Eliminados */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '4px' }}>
          <button
            onClick={() => setTab('historial')}
            style={{
              padding: '6px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.875rem',
              transition: 'all 200ms',
              background: tab === 'historial' ? 'white' : 'transparent',
              color: tab === 'historial' ? '#f9a825' : 'rgba(255,255,255,0.85)',
              boxShadow: tab === 'historial' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            ✅ Historial Vivo
          </button>
          <button
            onClick={() => setTab('eliminados')}
            style={{
              padding: '6px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.875rem',
              transition: 'all 200ms',
              background: tab === 'eliminados' ? 'white' : 'transparent',
              color: tab === 'eliminados' ? '#f9a825' : 'rgba(255,255,255,0.85)',
              boxShadow: tab === 'eliminados' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            🗑️ Papelera
          </button>
        </div>
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
