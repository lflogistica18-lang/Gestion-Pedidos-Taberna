import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

// Roles que exige la base (ver supabase/migrations/010 y 013). Van en app_metadata,
// que solo edita el admin — user_metadata lo puede cambiar el propio usuario.
export const ROL_ADMIN = 'taberna'
export const ROL_PEDIDOS = 'taberna_pedidos'
// Alias: el rol "completo" de la app, por si algún lado lo sigue usando.
export const ROL_APP = ROL_ADMIN

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
  /** Rol que trae el token (app_metadata.rol), o null si no hay sesión o no es de la app. */
  rol: typeof ROL_ADMIN | typeof ROL_PEDIDOS | null
  /** Tiene alguno de los dos roles de la app. */
  tieneRol: boolean
  /** Es admin: ve todo. false para el rol solo pedidos. */
  esAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

// Última sesión conocida, compartida entre todos los usos del hook: así el menú, la
// barra y las rutas arrancan con el rol ya resuelto y no parpadean sin ítems de admin.
let sesionConocida: Session | null | undefined

export function useAuth(): UseAuthResult {
  const [state, setState] = useState<AuthState>(() =>
    sesionConocida === undefined
      ? { user: null, session: null, loading: true }
      : { user: sesionConocida?.user ?? null, session: sesionConocida, loading: false },
  )

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      sesionConocida = session
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
      })
    })

    // Escuchar cambios de sesión (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      sesionConocida = session
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

  const rolCrudo: unknown = state.user?.app_metadata?.rol
  const rol = rolCrudo === ROL_ADMIN || rolCrudo === ROL_PEDIDOS ? rolCrudo : null

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    isAuthenticated: !!state.user,
    rol,
    tieneRol: rol !== null,
    esAdmin: rol === ROL_ADMIN,
    signIn,
    signOut,
  }
}
