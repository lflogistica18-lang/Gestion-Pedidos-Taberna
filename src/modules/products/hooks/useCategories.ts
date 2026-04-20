import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'

export interface CategoryItem {
  id?: string
  name: string
  sort_order: number
}

export function useCategories() {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = async () => {
    setLoading(true)
    try {
      // Traer sin id primero (funciona siempre)
      const { data, error } = await supabase
        .from('product_categories')
        .select('name, sort_order')
        .order('sort_order', { ascending: true })

      if (!error && data) {
        setCategories(data)
      }
    } catch (e: any) {
      console.error('Error fetching categories:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCategories() }, [])

  const createCategory = async (name: string): Promise<boolean> => {
    const trimmed = name.trim()
    if (!trimmed) return false
    // Evitar duplicados
    if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) return false
    try {
      const maxOrder = categories.length > 0
        ? Math.max(...categories.map((c) => c.sort_order))
        : 0
      const { error } = await supabase
        .from('product_categories')
        .insert({ name: trimmed, sort_order: maxOrder + 1 })
      if (!error) await fetchCategories()
      return !error
    } catch (e: any) {
      console.error('Error creating category:', e)
      return false
    }
  }

  // Renombrar: delete vieja + insert nueva con mismo sort_order + actualizar productos
  // Estrategia de reemplazo — no depende de tener columna id
  const renameCategory = async (oldName: string, newName: string): Promise<{ error: string | null }> => {
    const trimmed = newName.trim()
    if (!trimmed) return { error: 'El nombre no puede estar vacío' }
    if (trimmed === oldName) return { error: null }

    const cat = categories.find(c => c.name === oldName)
    const sortOrder = cat?.sort_order ?? 0

    try {
      // 1. Insertar nueva categoría con mismo orden
      const { error: insertErr } = await supabase
        .from('product_categories')
        .insert({ name: trimmed, sort_order: sortOrder })

      if (insertErr) return { error: `No se pudo crear el nombre nuevo: ${insertErr.message}` }

      // 2. Reasignar productos al nuevo nombre
      const { error: prodErr } = await supabase
        .from('products')
        .update({ category: trimmed })
        .eq('category', oldName)

      if (prodErr) return { error: `No se pudieron actualizar productos: ${prodErr.message}` }

      // 3. Borrar categoría vieja
      const { error: delErr } = await supabase
        .from('product_categories')
        .delete()
        .eq('name', oldName)

      if (delErr) return { error: `No se pudo eliminar nombre anterior: ${delErr.message}` }

      await fetchCategories()
      return { error: null }
    } catch (e: any) {
      return { error: e.message }
    }
  }

  // Eliminar — solo si no tiene productos activos
  const deleteCategory = async (name: string): Promise<{ error: string | null }> => {
    try {
      // Verificar que no tenga productos activos
      const { data: activos } = await supabase
        .from('products')
        .select('id')
        .eq('category', name)
        .eq('active', true)
        .limit(1)

      if (activos && activos.length > 0) {
        return { error: `La categoría "${name}" tiene productos activos. Movelos antes de eliminarla.` }
      }

      const { error: delErr } = await supabase
        .from('product_categories')
        .delete()
        .eq('name', name)

      if (delErr) return { error: delErr.message }
      await fetchCategories()
      return { error: null }
    } catch (e: any) {
      return { error: e.message }
    }
  }

  return { categories, loading, createCategory, renameCategory, deleteCategory, refetch: fetchCategories }
}
