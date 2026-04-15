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
    <div className="flex flex-col container mx-auto">
      {/* Herramientas extra (Categorías y Tabs) */}
      <div className="bg-white p-4 rounded-lg shadow-sm border m-4 mb-0">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            <button 
              onClick={() => setTab('activos')} 
              className={`px-4 py-2 rounded-md text-sm border ${tab === 'activos' ? 'bg-blue-600 text-white' : 'text-gray-700 bg-gray-50'}`}
            >
              Activos
            </button>
            <button 
              onClick={() => setTab('inactivos')} 
              className={`px-4 py-2 rounded-md text-sm border ${tab === 'inactivos' ? 'bg-blue-600 text-white' : 'text-gray-700 bg-gray-50'}`}
            >
              Inactivos
            </button>
          </div>
          
          <button
            className="ml-auto text-blue-600 hover:text-blue-800 text-sm font-medium"
            onClick={() => setNewCatOpen((v) => !v)}
          >
            + Nueva Categoría
          </button>
        </div>

        {newCatOpen && (
          <div className="flex gap-2 items-center bg-gray-50 p-3 rounded-md border border-gray-200 mt-4">
            <input
              type="text"
              className="px-3 py-2 border rounded-md flex-1 text-sm bg-white"
              placeholder="Nombre de categoría (ej: Bebidas)"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCategory() }}
              autoFocus
            />
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              onClick={handleCreateCategory}
              disabled={savingCat || !newCatName.trim()}
            >
              {savingCat ? '...' : 'Guardar'}
            </button>
            <button
              className="text-gray-600 px-3 py-2 text-sm hover:underline"
              onClick={() => { setNewCatOpen(false); setNewCatName('') }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

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

