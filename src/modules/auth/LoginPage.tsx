import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { AvisoEstado, Boton, Entrada } from '@/shared/components/panel'

export default function LoginPage() {
  const { signIn, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    setError(null)

    const result = await signIn(email.trim(), password)

    setLoading(false)
    if (result.error) {
      // Mensaje amigable para errores comunes
      if (result.error.toLowerCase().includes('invalid') || result.error.toLowerCase().includes('credentials')) {
        setError('Email o contraseña incorrectos')
      } else {
        setError(result.error)
      }
    } else {
      // Login exitoso → redirigir
      navigate('/reports', { replace: true })
    }
  }

  // Si ya está autenticado, redirigir directo
  if (authLoading) return null
  if (isAuthenticated) return <Navigate to="/reports" replace />

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-principal p-4">
      <div className="w-full max-w-100 rounded-2xl border border-borde-sutil bg-bg-tarjeta p-6 shadow-tarjeta sm:p-8">
        {/* Logo / Marca */}
        <div className="mb-6 text-center">
          <img src="/logo-taberna.png" alt="" className="mx-auto size-16 rounded-2xl object-cover" />
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-texto-primario">La Taberna</h1>
          <p className="text-sm text-texto-secundario">Sistema de gestión</p>
        </div>

        {/* Formulario */}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <Entrada
            id="login-email"
            type="email"
            etiqueta="Email"
            placeholder="usuario@sgc-taberna.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null) }}
            autoComplete="email"
            autoFocus
            disabled={loading}
            required
          />

          <Entrada
            id="login-password"
            type="password"
            etiqueta="Contraseña"
            placeholder="••••••••"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null) }}
            autoComplete="current-password"
            disabled={loading}
            required
          />

          {/* Error */}
          {error && <AvisoEstado tono="rojo" titulo={error} />}

          <Boton
            type="submit"
            variante="primario"
            className="mt-2 w-full"
            disabled={loading || !email.trim() || !password}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Ingresando...
              </>
            ) : (
              'Ingresar'
            )}
          </Boton>
        </form>

        <p className="mt-6 text-center text-xs text-texto-secundario">
          sgc-taberna.com · Sistema interno
        </p>
      </div>
    </div>
  )
}
