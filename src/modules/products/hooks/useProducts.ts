import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Product } from '@/types/database.types'

interface UseProductsOptions {
  activeOnly?: boolean
}

interface UseProductsResult {
  products: Product[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useProducts({ activeOnly }: UseProductsOptions = {}): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('products')
      .select('*')
      .order('category')
      .order('name')

    if (activeOnly !== undefined) {
      query = query.eq('active', activeOnly)
    }

    try {
      const { data, error: err } = await query

      if (err) {
        setError(err.message)
      } else {
        setProducts(data ?? [])
      }
    } catch (e: any) {
      setError(e.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [activeOnly])

  useEffect(() => {
    const loadData = async () => {
      await fetch()
    }
    loadData()
  }, [fetch])

  return { products, loading, error, refetch: fetch }
}
