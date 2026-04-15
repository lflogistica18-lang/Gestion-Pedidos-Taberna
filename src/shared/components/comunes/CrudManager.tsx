import { useState } from 'react'
import type { CampoSchema, EntidadBase } from '../../types/base'
import { EstadoCargando } from './EstadoCargando'
import { EstadoVacio } from './EstadoVacio'
import { EstadoError } from './EstadoError'

// Patron G — componente generico CRUD
// Usa el sistema de diseño del proyecto (CSS classes de index.css)

interface CrudManagerProps<T extends EntidadBase> {
  titulo: string
  datos: T[]
  campos: CampoSchema[]
  cargando: boolean
  error: string | null
  hideCrear?: boolean
  onCrear: (datos: Partial<T>) => Promise<{ error: string | null }>
  onEditar: (id: string, datos: Partial<T>) => Promise<{ error: string | null }>
  onDesactivar: (id: string) => Promise<{ error: string | null }>
  onRecargar: () => void
}

export function CrudManager<T extends EntidadBase>({
  titulo,
  datos,
  campos,
  cargando,
  error,
  hideCrear,
  onCrear,
  onEditar,
  onDesactivar,
  onRecargar
}: CrudManagerProps<T>) {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<T | null>(null)
  const [formulario, setFormulario] = useState<Record<string, unknown>>({})
  const [busqueda, setBusqueda] = useState('')
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const datosFiltrados = datos.filter(item =>
    campos.some(campo => {
      const valor = (item as Record<string, unknown>)[campo.nombre]
      return String(valor ?? '').toLowerCase().includes(busqueda.toLowerCase())
    })
  )

  function abrirCrear() {
    setEditando(null)
    setFormulario({})
    setErrorForm(null)
    setModalAbierto(true)
  }

  function abrirEditar(item: T) {
    setEditando(item)
    const datosForm: Record<string, unknown> = {}
    campos.forEach(campo => {
      datosForm[campo.nombre] = (item as Record<string, unknown>)[campo.nombre] ?? ''
    })
    setFormulario(datosForm)
    setErrorForm(null)
    setModalAbierto(true)
  }

  async function guardar() {
    for (const campo of campos) {
      if (campo.obligatorio && !formulario[campo.nombre]) {
        setErrorForm(`El campo "${campo.etiqueta}" es obligatorio`)
        return
      }
    }

    setGuardando(true)
    setErrorForm(null)

    const resultado = editando
      ? await onEditar(editando.id, formulario as Partial<T>)
      : await onCrear(formulario as Partial<T>)

    setGuardando(false)

    if (resultado.error) {
      setErrorForm(resultado.error)
      return
    }

    setModalAbierto(false)
  }

  async function confirmarDesactivar(id: string) {
    if (!window.confirm('¿Confirmás que querés desactivar este registro?')) return
    const resultado = await onDesactivar(id)
    if (resultado.error) {
      alert(`Error: ${resultado.error}`)
    }
  }

  if (cargando) return <EstadoCargando />
  if (error) return <EstadoError mensaje={error} onReintentar={onRecargar} />

  return (
    <div style={{ padding: '0 0 80px' }}>
      {/* Header — usa el mismo estilo que pos-header */}
      <div className="pos-header" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
        <h1 className="pos-header__title">{titulo}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Buscador */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Buscar..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{
                padding: '8px 14px 8px 36px',
                border: '1.5px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '0.875rem',
                outline: 'none',
                background: 'white',
                minWidth: '200px',
                minHeight: '40px',
              }}
            />
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.9rem' }}>🔍</span>
          </div>
          {!hideCrear && (
            <button onClick={abrirCrear} className="btn btn--primary btn--sm">
              + Nuevo
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Estado vacío */}
        {datosFiltrados.length === 0 && !cargando && (
          <EstadoVacio
            mensaje={busqueda ? 'No se encontraron resultados' : `No hay ${titulo.toLowerCase()} todavía`}
            accion={!busqueda && !hideCrear ? { texto: `Crear ${titulo.toLowerCase()}`, onClick: abrirCrear } : undefined}
          />
        )}

        {/* Tabla desktop */}
        {datosFiltrados.length > 0 && (
          <div style={{ overflowX: 'auto', display: 'none' }} className="crud-table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f0f0f0', background: 'rgba(249,168,37,0.06)' }}>
                  {campos.map(campo => (
                    <th key={campo.nombre} style={{
                      textAlign: 'left', padding: '12px 16px',
                      fontSize: '0.7rem', fontWeight: 800,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: '#9ca3af'
                    }}>
                      {campo.etiqueta}
                    </th>
                  ))}
                  <th style={{
                    textAlign: 'right', padding: '12px 16px',
                    fontSize: '0.7rem', fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: '#9ca3af'
                  }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f9fafb', transition: 'background 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fffbf0')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {campos.map(campo => {
                      const strVal = String((item as Record<string, unknown>)[campo.nombre] ?? '-')
                      const esPrecio = campo.tipo === 'numero' && (
                        campo.nombre.toLowerCase().includes('precio') ||
                        campo.nombre.toLowerCase().includes('price') ||
                        campo.nombre.toLowerCase().includes('total')
                      )
                      return (
                        <td key={campo.nombre} style={{ padding: '14px 16px', color: '#374151' }}>
                          {esPrecio
                            ? <strong style={{ color: '#ef821c' }}>${Number(strVal).toLocaleString('es-AR')}</strong>
                            : strVal
                          }
                        </td>
                      )
                    })}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => abrirEditar(item)}
                          className="btn btn--secondary btn--sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => confirmarDesactivar(item.id)}
                          className="btn btn--danger-soft btn--sm"
                        >
                          Apagar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Cards (mobile y desktop — siempre visible) */}
        {datosFiltrados.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '12px' }}>
            {datosFiltrados.map(item => (
              <div key={item.id} style={{
                background: 'white',
                border: '1.5px solid #e5e7eb',
                borderRadius: '14px',
                padding: '16px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}>
                {/* Campos del registro */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginBottom: '12px' }}>
                  {campos.map(campo => {
                    const strVal = String((item as Record<string, unknown>)[campo.nombre] ?? '-')
                    const esPrecio = campo.tipo === 'numero' && (
                      campo.nombre.toLowerCase().includes('precio') ||
                      campo.nombre.toLowerCase().includes('price') ||
                      campo.nombre.toLowerCase().includes('total')
                    )
                    return (
                      <div key={campo.nombre} style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '80px' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af' }}>
                          {campo.etiqueta}
                        </span>
                        <span style={{ fontSize: '0.875rem', fontWeight: esPrecio ? 700 : 500, color: esPrecio ? '#ef821c' : '#111827' }}>
                          {esPrecio ? `$${Number(strVal).toLocaleString('es-AR')}` : strVal}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
                  <button
                    onClick={() => abrirEditar(item)}
                    className="btn btn--secondary btn--sm"
                    style={{ flex: 1, minHeight: '40px' }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => confirmarDesactivar(item.id)}
                    className="btn btn--danger-soft btn--sm"
                    style={{ flex: 1, minHeight: '40px' }}
                  >
                    🚫 Apagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="modal-backdrop" onClick={() => setModalAbierto(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">
                {editando ? `✏️ Editar ${titulo}` : `✨ Nuevo ${titulo}`}
              </h2>
              <button className="modal__close" onClick={() => setModalAbierto(false)}>✕</button>
            </div>

            <div className="modal__body">
              {errorForm && (
                <div style={{
                  background: '#fee2e2', color: '#dc2626',
                  padding: '12px 16px', borderRadius: '10px',
                  marginBottom: '16px', fontSize: '0.875rem', fontWeight: 500
                }}>
                  ⚠️ {errorForm}
                </div>
              )}

              <div className="product-form">
                {campos.map(campo => (
                  <div key={campo.nombre} className="product-form__field">
                    <label className="product-form__label">
                      {campo.etiqueta}
                      {campo.obligatorio && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                    </label>

                    {campo.tipo === 'select' ? (
                      <select
                        value={String(formulario[campo.nombre] ?? '')}
                        onChange={e => setFormulario({ ...formulario, [campo.nombre]: e.target.value })}
                        className="product-form__input"
                      >
                        <option value="">Seleccionar...</option>
                        {campo.opciones?.map(op => (
                          <option key={op} value={op}>{op}</option>
                        ))}
                      </select>
                    ) : campo.tipo === 'textarea' ? (
                      <textarea
                        value={String(formulario[campo.nombre] ?? '')}
                        onChange={e => setFormulario({ ...formulario, [campo.nombre]: e.target.value })}
                        placeholder={campo.placeholder}
                        rows={3}
                        className="product-form__input"
                        style={{ resize: 'vertical' }}
                      />
                    ) : campo.tipo === 'boolean' ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!!formulario[campo.nombre]}
                          onChange={e => setFormulario({ ...formulario, [campo.nombre]: e.target.checked })}
                          style={{ width: '20px', height: '20px' }}
                        />
                        <span style={{ fontSize: '0.875rem' }}>{campo.etiqueta}</span>
                      </label>
                    ) : (
                      <input
                        type={campo.tipo === 'numero' ? 'number' : campo.tipo === 'fecha' ? 'date' : 'text'}
                        value={String(formulario[campo.nombre] ?? '')}
                        onChange={e => setFormulario({
                          ...formulario,
                          [campo.nombre]: campo.tipo === 'numero' ? Number(e.target.value) : e.target.value
                        })}
                        placeholder={campo.placeholder}
                        className="product-form__input"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="product-form__actions" style={{ marginTop: '24px' }}>
                <button
                  onClick={() => setModalAbierto(false)}
                  className="btn btn--secondary"
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={guardando}
                  className="btn btn--primary"
                >
                  {guardando ? 'Guardando...' : '✅ Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
