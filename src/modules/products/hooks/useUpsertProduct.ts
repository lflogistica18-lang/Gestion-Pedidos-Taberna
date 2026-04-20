import { useState } from 'react'
import { z } from 'zod'
import { supabase } from '@/shared/lib/supabase'
import type { Product, ProductCategory } from '@/types/database.types'

export const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(80, 'Máximo 80 caracteres'),
  category: z.string().min(1, 'La categoría es requerida'),
  price: z
    .number()
    .min(0, 'El precio no puede ser negativo')
    .max(999999, 'Precio demasiado alto'),
  cost: z
    .number()
    .min(0, 'El costo no puede ser negativo')
    .max(999999, 'Costo demasiado alto'),
})

export type ProductFormData = z.infer<typeof productSchema>

interface UseUpsertProductResult {
  saving: boolean
  error: string | null
  upsert: (data: ProductFormData, id?: string) => Promise<Product | null>
}

export function useUpsertProduct(): UseUpsertProductResult {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upsert = async (data: ProductFormData, id?: string): Promise<Product | null> => {
    setSaving(true)
    setError(null)

    const payload = {
      name: data.name.trim(),
      category: data.category as ProductCategory,
      price: data.price,
      cost: data.cost ?? 0,
    }

    try {
      const { data: result, error: err } = id
        ? await supabase.from('products').update(payload).eq('id', id).select().single()
        : await supabase.from('products').insert({ ...payload, active: true }).select().single()

      if (err) {
        setError(err.message)
        return null
      }

      return result
    } catch (e: any) {
      setError(e.message || 'Error de conexión')
      return null
    } finally {
      setSaving(false)
    }
  }

  return { saving, error, upsert }
}

interface UseToggleProductResult {
  toggling: boolean
  toggle: (id: string, active: boolean) => Promise<boolean>
}

export function useToggleProduct(): UseToggleProductResult {
  const [toggling, setToggling] = useState(false)

  const toggle = async (id: string, active: boolean): Promise<boolean> => {
    setToggling(true)
    try {
      const { error } = await supabase.from('products').update({ active }).eq('id', id)
      return !error
    } catch (e: any) {
      console.error(e)
      return false
    } finally {
      setToggling(false)
    }
  }

  return { toggling, toggle }
}
