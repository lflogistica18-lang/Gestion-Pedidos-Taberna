import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

// Rol que exige la base (ver supabase/migrations/010). Va en app_metadata,
// que solo edita el admin — user_metadata lo puede cambiar el propio usuario.
export const ROL_APP = 'taberna'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

interface UseAuthResult {
  user: User | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  tieneRol: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthResult {
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
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Error al iniciar sesión' }
    }
  }, [])

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut()
  }, [])

  const tieneRol = state.user?.app_metadata?.rol === ROL_APP

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    isAuthenticated: !!state.user,
    tieneRol,
    signIn,
    signOut,
  }
}
