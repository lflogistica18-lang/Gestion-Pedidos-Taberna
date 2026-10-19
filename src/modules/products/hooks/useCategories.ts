import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { ProductCategoryRow } from '@/types/database.types'

export type CategoryItem = Pick<ProductCategoryRow, 'id' | 'name' | 'sort_order'>

export interface UseCategoriesResult {
  categories: CategoryItem[]
  loading: boolean
  error: string | null
  createCategory: (name: string) => Promise<{ error: string | null }>
  renameCategory: (oldName: string, newName: string) => Promise<{ error: string | null }>
  deleteCategory: (name: string) => Promise<{ error: string | null }>
  refetch: () => Promise<void>
}

export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('product_categories')
        .select('id, name, sort_order')
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })

      if (err) {
        setError(err.message)
      } else {
        setError(null)
        setCategories((data ?? []) as CategoryItem[])
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCategories() }, [])

  const createCategory = async (name: string): Promise<{ error: string | null }> => {
    const trimmed = name.trim()
    if (!trimmed) return { error: 'El nombre no puede estar vacío' }
    // Evitar duplicados
    if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      return { error: `La categoría "${trimmed}" ya existe` }
    }
    try {
      const maxOrder = categories.length > 0
        ? Math.max(...categories.map((c) => c.sort_order))
        : 0
      const { error: insErr } = await supabase
        .from('product_categories')
        .insert({ name: trimmed, sort_order: maxOrder + 1 })
      if (insErr) {
        // 23505 = nombre duplicado: puede ser una categoría borrada (soft delete) -> revivirla
        if (insErr.code === '23505') {
          const { data: revividas, error: revErr } = await supabase
            .from('product_categories')
            .update({ deleted_at: null, sort_order: maxOrder + 1 })
            .eq('name', trimmed)
            .not('deleted_at', 'is', null)
            .select('id')
          if (revErr) return { error: revErr.message }
          if (!revividas || revividas.length === 0) {
            return { error: `La categoría "${trimmed}" ya existe` }
          }
        } else {
          return { error: insErr.message }
        }
      }
      await fetchCategories()
      return { error: null }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  // Renombrar: una sola llamada atómica a la función SQL (renombra categoría y productos)
  const renameCategory = async (oldName: string, newName: string): Promise<{ error: string | null }> => {
    const trimmed = newName.trim()
    if (!trimmed) return { error: 'El nombre no puede estar vacío' }
    if (trimmed === oldName) return { error: null }

    try {
      const { error: rpcErr } = await supabase.rpc('renombrar_categoria', {
        p_viejo: oldName,
        p_nuevo: trimmed,
      })
      if (rpcErr) return { error: rpcErr.message }

      await fetchCategories()
      return { error: null }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  // Eliminar — solo si no tiene productos activos
  const deleteCategory = async (name: string): Promise<{ error: string | null }> => {
    try {
      // Verificar que no tenga productos activos
      const { data: activos, error: checkErr } = await supabase
        .from('products')
        .select('id')
        .eq('category', name)
        .eq('active', true)
        .limit(1)

      if (checkErr) return { error: checkErr.message }

      if (activos && activos.length > 0) {
        return { error: `La categoría "${name}" tiene productos activos. Movelos antes de eliminarla.` }
      }

      const { error: delErr } = await supabase
        .from('product_categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('name', name)
        .is('deleted_at', null)

      if (delErr) return { error: delErr.message }
      await fetchCategories()
      return { error: null }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  return { categories, loading, error, createCategory, renameCategory, deleteCategory, refetch: fetchCategories }
}
