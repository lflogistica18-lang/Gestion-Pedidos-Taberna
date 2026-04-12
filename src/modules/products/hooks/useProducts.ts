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

    const { data, error: err } = await query

    if (err) {
      setError(err.message)
    } else {
      setProducts(data ?? [])
    }
    setLoading(false)
  }, [activeOnly])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { products, loading, error, refetch: fetch }
}
