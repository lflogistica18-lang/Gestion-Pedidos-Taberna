import { useState } from 'react'
import { useProducts } from './hooks/useProducts'
import { useUpsertProduct, useToggleProduct } from './hooks/useUpsertProduct'
import { useCategories } from './hooks/useCategories'
import { CrudManager } from '@/shared/components/comunes/CrudManager'
import type { CampoSchema } from '@/shared/types/base'
import type { Product } from '@/types/database.types'

type Tab = 'activos' | 'inactivos'

export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>('activos')
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [savingCat, setSavingCat] = useState(false)

  const { products, loading, error, refetch } = useProducts({
    activeOnly: tab === 'activos',
  })
  const { upsert } = useUpsertProduct()
  const { toggle } = useToggleProduct()
  const { categories, createCategory } = useCategories()

  const campos: CampoSchema[] = [
    { nombre: 'name', etiqueta: 'Nombre', tipo: 'texto', obligatorio: true },
    { 
      nombre: 'category', 
      etiqueta: 'Categoría', 
      tipo: 'select', 
      obligatorio: true, 
      opciones: categories.map(c => c.name) 
    },
    { nombre: 'price', etiqueta: 'Precio', tipo: 'numero', obligatorio: true }
  ]

  const handleCrear = async (datos: Partial<Product>) => {
    try {
      const result = await upsert({
        name: datos.name || '',
        category: datos.category || '',
        price: Number(datos.price) || 0
      })
      if (!result) return { error: 'Error al crear producto' }
      refetch()
      return { error: null }
    } catch(e: any) {
      return { error: e.message }
    }
  }

  const handleEditar = async (id: string, datos: Partial<Product>) => {
    try {
      const result = await upsert({
        name: datos.name || '',
        category: datos.category || '',
        price: Number(datos.price) || 0
      }, id)
      if (!result) return { error: 'Error al actualizar producto' }
      refetch()
      return { error: null }
    } catch(e: any) {
      return { error: e.message }
    }
  }

  const handleDesactivar = async (id: string) => {
    try {
      const isActivating = tab === 'inactivos'
      const ok = await toggle(id, isActivating)
      if (!ok) return { error: 'Error al modificar estado' }
      refetch()
      return { error: null }
    } catch(e: any) {
      return { error: e.message }
    }
  }

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return
    setSavingCat(true)
    const ok = await createCategory(newCatName)
    setSavingCat(false)
    if (ok) {
      setNewCatName('')
      setNewCatOpen(false)
    }
  }

  return (
    <div>
      {/* Barra de tabs integrada en el pos-header */}
      <div className="pos-header" style={{ position: 'sticky', top: 0, zIndex: 10, gap: '12px', flexWrap: 'wrap' }}>
        {/* Tabs Activos / Inactivos */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '4px' }}>
          <button
            onClick={() => setTab('activos')}
            style={{
              padding: '6px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.875rem',
              transition: 'all 200ms',
              background: tab === 'activos' ? 'white' : 'transparent',
              color: tab === 'activos' ? '#f9a825' : 'rgba(255,255,255,0.85)',
              boxShadow: tab === 'activos' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            ✅ Activos
          </button>
          <button
            onClick={() => setTab('inactivos')}
            style={{
              padding: '6px 18px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.875rem',
              transition: 'all 200ms',
              background: tab === 'inactivos' ? 'white' : 'transparent',
              color: tab === 'inactivos' ? '#f9a825' : 'rgba(255,255,255,0.85)',
              boxShadow: tab === 'inactivos' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            💤 Inactivos
          </button>
        </div>

        {/* Accion Nueva Categoria */}
        <button
          onClick={() => setNewCatOpen(v => !v)}
          style={{
            padding: '7px 16px',
            background: 'rgba(255,255,255,0.2)',
            border: '1.5px solid rgba(255,255,255,0.4)',
            borderRadius: '10px',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: 'pointer',
            transition: 'background 150ms',
          }}
        >
          + Nueva Categoría
        </button>
      </div>

      {/* Panel nueva categoría */}
      {newCatOpen && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 16px', background: '#fffbf0', borderBottom: '1px solid #f0e0a0' }}>
          <input
            type="text"
            placeholder="Nombre de categoría (ej: Bebidas)"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateCategory() }}
            autoFocus
            className="product-form__input"
            style={{ flex: 1, maxWidth: '320px' }}
          />
          <button
            onClick={handleCreateCategory}
            disabled={savingCat || !newCatName.trim()}
            className="btn btn--primary btn--sm"
          >
            {savingCat ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            onClick={() => { setNewCatOpen(false); setNewCatName('') }}
            className="btn btn--secondary btn--sm"
          >
            Cancelar
          </button>
        </div>
      )}

      <CrudManager<Product>
        titulo={tab === 'activos' ? 'Productos Activos' : 'Productos Inactivos'}
        datos={products}
        campos={campos}
        cargando={loading}
        error={error}
        onCrear={handleCrear}
        onEditar={handleEditar}
        onDesactivar={handleDesactivar}
        onRecargar={refetch}
      />
    </div>
  )
}
