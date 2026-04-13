import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'

export interface CategoryItem {
  name: string
  sort_order: number
}

export function useCategories() {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('product_categories')
      .select('name, sort_order')
      .order('sort_order', { ascending: true })
    if (data) setCategories(data)
    setLoading(false)
  }

  useEffect(() => { fetchCategories() }, [])

  const createCategory = async (name: string): Promise<boolean> => {
    const trimmed = name.trim()
    if (!trimmed) return false
    const maxOrder = categories.length > 0
      ? Math.max(...categories.map((c) => c.sort_order))
      : 0
    const { error } = await supabase
      .from('product_categories')
      .insert({ name: trimmed, sort_order: maxOrder + 1 })
    if (!error) await fetchCategories()
    return !error
  }

  return { categories, loading, createCategory }
}
