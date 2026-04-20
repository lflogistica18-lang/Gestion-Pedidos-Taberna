import { useState, useMemo } from 'react'
import { useProducts } from './hooks/useProducts'
import { useUpsertProduct, useToggleProduct } from './hooks/useUpsertProduct'
import { useCategories } from './hooks/useCategories'
import { CrudManager } from '@/shared/components/comunes/CrudManager'
import type { CampoSchema } from '@/shared/types/base'
import type { Product } from '@/types/database.types'

type Tab = 'activos' | 'inactivos' | 'categorias'

// ─── Panel de gestión de categorías ─────────────────────────────
function CategoriasPanel() {
  const { categories, loading, createCategory, renameCategory, deleteCategory } = useCategories()

  const [newName, setNewName] = useState('')
  const [savingNew, setSavingNew] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')

  const handleCrear = async () => {
    if (!newName.trim()) return
    setSavingNew(true)
    await createCategory(newName.trim())
    setSavingNew(false)
    setNewName('')
  }

  const handleIniciarEdicion = (nombre: string) => {
    setEditando(nombre)
    setEditNombre(nombre)
  }

  const handleGuardarEdicion = async (viejo: string) => {
    if (!editNombre.trim() || editNombre === viejo) {
      setEditando(null)
      return
    }
    const { error } = await renameCategory(viejo, editNombre.trim())
    if (error) alert(error)
    setEditando(null)
    setEditNombre('')
  }

  const handleEliminar = async (nombre: string) => {
    if (!window.confirm(`¿Eliminar la categoría "${nombre}"?\n\nSolo se puede eliminar si no tiene productos activos.`)) return
    const { error } = await deleteCategory(nombre)
    if (error) alert(error)
  }

  if (loading) return <p style={{ padding: '24px', color: '#9ca3af' }}>Cargando categorías...</p>

  return (
    <div className="cat-panel">
      <h2 className="cat-panel__title">Categorías</h2>
      <p className="cat-panel__subtitle">
        Al renombrar, se actualiza automáticamente en todos los productos.
      </p>

      <div className="cat-panel__list">
        {categories.length === 0 && (
          <p style={{ color: '#9ca3af', padding: '16px 0' }}>No hay categorías aún.</p>
        )}
        {categories.map(cat => (
          <div key={cat.name} className="cat-panel__item">
            {editando === cat.name ? (
              <div className="cat-panel__edit-row">
                <input
                  autoFocus
                  className="orders-filters__input"
                  style={{ flex: 1 }}
                  value={editNombre}
                  onChange={e => setEditNombre(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleGuardarEdicion(cat.name)
                    if (e.key === 'Escape') setEditando(null)
                  }}
                />
                <button onClick={() => handleGuardarEdicion(cat.name)} className="btn btn--primary btn--sm">Guardar</button>
                <button onClick={() => setEditando(null)} className="btn btn--secondary btn--sm">Cancelar</button>
              </div>
            ) : (
              <div className="cat-panel__view-row">
                <span className="cat-panel__name">
                  <span className="cat-panel__dot" />
                  {cat.name}
                </span>
                <div className="cat-panel__actions">
                  <button onClick={() => handleIniciarEdicion(cat.name)} className="btn btn--secondary btn--sm">✏️ Renombrar</button>
                  <button onClick={() => handleEliminar(cat.name)} className="btn btn--danger-soft btn--sm">🗑️ Eliminar</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="cat-panel__new">
        <input
          type="text"
          placeholder="Nueva categoría (ej: Pizzas)…"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCrear() }}
          className="orders-filters__input"
          style={{ flex: 1 }}
        />
        <button onClick={handleCrear} disabled={savingNew || !newName.trim()} className="btn btn--primary btn--sm">
          {savingNew ? 'Guardando…' : '+ Agregar'}
        </button>
      </div>
    </div>
  )
}

// ─── Página principal de Productos ──────────────────────────────
export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>('activos')
  const [catFiltro, setCatFiltro] = useState<string>('todas')

  const { products, loading, error, refetch } = useProducts({
    activeOnly: tab === 'activos',
  })
  const { upsert } = useUpsertProduct()
  const { toggle } = useToggleProduct()
  const { categories } = useCategories()

  // Filtrar productos por categoría seleccionada
  const productosFiltrados = useMemo(() => {
    if (catFiltro === 'todas') return products
    return products.filter(p => p.category === catFiltro)
  }, [products, catFiltro])

  const campos: CampoSchema[] = [
    { nombre: 'name', etiqueta: 'Nombre', tipo: 'texto', obligatorio: true },
    {
      nombre: 'category',
      etiqueta: 'Categoría',
      tipo: 'select',
      obligatorio: true,
      opciones: categories.map(c => c.name)
    },
    { nombre: 'price', etiqueta: 'Precio', tipo: 'numero', obligatorio: true },
    { nombre: 'cost', etiqueta: 'Costo', tipo: 'numero', obligatorio: false, placeholder: 'Valor de costo (referencia)' }
  ]

  const handleCrear = async (datos: Partial<Product>) => {
    try {
      const result = await upsert({
        name: datos.name || '',
        category: datos.category || '',
        price: Number(datos.price) || 0,
        cost: Number(datos.cost) || 0
      })
      if (!result) return { error: 'Error al crear producto' }
      refetch()
      return { error: null }
    } catch (e: any) {
      return { error: e.message }
    }
  }

  const handleEditar = async (id: string, datos: Partial<Product>) => {
    try {
      const result = await upsert({
        name: datos.name || '',
        category: datos.category || '',
        price: Number(datos.price) || 0,
        cost: Number(datos.cost) || 0
      }, id)
      if (!result) return { error: 'Error al actualizar producto' }
      refetch()
      return { error: null }
    } catch (e: any) {
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
    } catch (e: any) {
      return { error: e.message }
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'activos', label: '✅ Activos' },
    { key: 'inactivos', label: '💤 Inactivos' },
    { key: 'categorias', label: '🏷️ Categorías' },
  ]

  return (
    <div>
      {/* Barra de tabs principal */}
      <div
        className="pos-header"
        style={{ position: 'sticky', top: 0, zIndex: 10, gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}
      >
        <div
          style={{
            display: 'flex', gap: '4px',
            background: '#f3f4f6', borderRadius: '10px',
            padding: '4px', border: '1px solid #e5e7eb',
          }}
        >
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setCatFiltro('todas') }}
              style={{
                padding: '6px 16px', borderRadius: '8px', border: 'none',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                transition: 'all 200ms',
                background: tab === t.key ? 'white' : 'transparent',
                color: tab === t.key ? '#ea580c' : '#6b7280',
                boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'categorias' ? (
        <CategoriasPanel />
      ) : (
        <>
          {/* Filtro por categoría — solo visible en activos/inactivos */}
          {categories.length > 0 && (
            <div style={{ padding: '0 16px 12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setCatFiltro('todas')}
                className={`pos-tab ${catFiltro === 'todas' ? 'pos-tab--active' : ''}`}
                style={{ fontSize: '0.8rem', padding: '5px 14px' }}
              >
                Todas
              </button>
              {categories.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => setCatFiltro(cat.name)}
                  className={`pos-tab ${catFiltro === cat.name ? 'pos-tab--active' : ''}`}
                  style={{ fontSize: '0.8rem', padding: '5px 14px' }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          <CrudManager<Product>
            titulo={
              tab === 'activos'
                ? `Productos Activos${catFiltro !== 'todas' ? ` · ${catFiltro}` : ''}`
                : `Productos Inactivos${catFiltro !== 'todas' ? ` · ${catFiltro}` : ''}`
            }
            datos={productosFiltrados}
            campos={campos}
            cargando={loading}
            error={error}
            onCrear={handleCrear}
            onEditar={handleEditar}
            onDesactivar={handleDesactivar}
            onRecargar={refetch}
          />
        </>
      )}
    </div>
  )
}
