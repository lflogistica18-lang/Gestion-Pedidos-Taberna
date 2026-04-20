import { useState } from 'react'
import { useAuth } from './hooks/useAuth'

export default function LoginPage() {
  const { signIn } = useAuth()
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
    }
    // Si no hay error, AuthGuard detecta el cambio de sesión y redirige automáticamente
  }

  return (
    <div className="login-page">
      {/* Fondo con gradiente */}
      <div className="login-bg" />

      <div className="login-card">
        {/* Logo / Marca */}
        <div className="login-brand">
          <div className="login-brand__logo">🍺</div>
          <h1 className="login-brand__name">La Taberna</h1>
          <p className="login-brand__sub">Sistema de Gestión</p>
        </div>

        {/* Formulario */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-form__field">
            <label htmlFor="login-email" className="login-form__label">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              className="login-form__input"
              placeholder="usuario@sgc-taberna.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(null) }}
              autoComplete="email"
              autoFocus
              disabled={loading}
              required
            />
          </div>

          <div className="login-form__field">
            <label htmlFor="login-password" className="login-form__label">
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              className="login-form__input"
              placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              autoComplete="current-password"
              disabled={loading}
              required
            />
          </div>

          {/* Error */}
          {error && (
            <div className="login-form__error" role="alert">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="login-form__btn"
            disabled={loading || !email.trim() || !password}
          >
            {loading ? (
              <span className="login-form__btn-loading">
                <span className="login-spinner" />
                Ingresando...
              </span>
            ) : (
              'Ingresar →'
            )}
          </button>
        </form>

        <p className="login-footer">
          sgc-taberna.com · Sistema interno
        </p>
      </div>
    </div>
  )
}
