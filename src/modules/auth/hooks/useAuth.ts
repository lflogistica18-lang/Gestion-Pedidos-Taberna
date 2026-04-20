import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  })

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
      })
    })

    // Escuchar cambios de sesión (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
      })
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      return { error: null }
    } catch (e: any) {
      return { error: e.message || 'Error al iniciar sesión' }
    }
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut()
  }, [])

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    isAuthenticated: !!state.user,
    signIn,
    signOut,
  }
}
