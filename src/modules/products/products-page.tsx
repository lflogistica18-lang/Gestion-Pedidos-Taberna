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
      {/* Cabecera y herramientas (Premium) */}
      <div className="bg-white/80 backdrop-blur-xl p-5 md:p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50 m-4 mb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          
          <div className="flex bg-gray-100/80 p-1.5 rounded-xl gap-1">
            <button 
              onClick={() => setTab('activos')} 
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${tab === 'activos' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
            >
              🚀 Activos
            </button>
            <button 
              onClick={() => setTab('inactivos')} 
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${tab === 'inactivos' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
            >
              💤 Inactivos
            </button>
          </div>
          
          <button
            className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl text-sm font-bold transition-all"
            onClick={() => setNewCatOpen((v) => !v)}
          >
            <span>+</span> Nueva Categoría
          </button>
        </div>

        {newCatOpen && (
          <div className="flex gap-3 items-center bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mt-5 animate-[fadeIn_0.3s_ease-out]">
            <input
              type="text"
              className="px-4 py-2.5 border-none ring-1 ring-indigo-200 focus:ring-2 focus:ring-indigo-500 rounded-xl flex-1 text-sm bg-white shadow-sm outline-none transition-all"
              placeholder="Nombre de categoría (ej: Bebidas)"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCategory() }}
              autoFocus
            />
            <button
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 disabled:opacity-50"
              onClick={handleCreateCategory}
              disabled={savingCat || !newCatName.trim()}
            >
              {savingCat ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              className="text-gray-500 px-3 py-2.5 text-sm font-medium hover:text-gray-800 transition-colors"
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

