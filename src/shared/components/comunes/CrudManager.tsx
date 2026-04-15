import { useState } from 'react'
import type { CampoSchema, EntidadBase } from '../../types/base'
import { EstadoCargando } from './EstadoCargando'
import { EstadoVacio } from './EstadoVacio'
import { EstadoError } from './EstadoError'

// Patron G — componente generico CRUD
// Cada entidad solo define su schema de campos y su hook de datos
// Este componente maneja: tabla, cards mobile, modal, formulario, busqueda

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

  // Filtrar por busqueda
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
    // Validar obligatorios
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
    if (!window.confirm('Estas seguro de que queres desactivar este registro?')) return
    const resultado = await onDesactivar(id)
    if (resultado.error) {
      alert(`Error: ${resultado.error}`)
    }
  }

  // Estados de UI
  if (cargando) return <EstadoCargando />
  if (error) return <EstadoError mensaje={error} onReintentar={onRecargar} />

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h1 className="text-xl font-bold">{titulo}</h1>
        {!hideCrear && (
          <button
            onClick={abrirCrear}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px]"
          >
            + Nuevo
          </button>
        )}
      </div>

      {/* Buscador */}
      <input
        type="text"
        placeholder="Buscar..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg mb-4 text-[16px]"
      />

      {/* Lista vacia */}
      {datosFiltrados.length === 0 && !cargando && (
        <EstadoVacio
          mensaje={busqueda ? 'No se encontraron resultados' : `No hay ${titulo.toLowerCase()} todavia`}
          accion={!busqueda ? { texto: `Crear ${titulo.toLowerCase()}`, onClick: abrirCrear } : undefined}
        />
      )}

      {/* Tabla desktop */}
      {datosFiltrados.length > 0 && (
        <table className="hidden md:table w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              {campos.map(campo => (
                <th key={campo.nombre} className="text-left p-3 text-sm font-medium text-gray-600">
                  {campo.etiqueta}
                </th>
              ))}
              <th className="text-right p-3 text-sm font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {datosFiltrados.map(item => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                {campos.map(campo => (
                  <td key={campo.nombre} className="p-3 text-sm">
                    {String((item as Record<string, unknown>)[campo.nombre] ?? '-')}
                  </td>
                ))}
                <td className="p-3 text-right space-x-2">
                  <button
                    onClick={() => abrirEditar(item)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => confirmarDesactivar(item.id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Desactivar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Cards mobile */}
      {datosFiltrados.length > 0 && (
        <div className="md:hidden space-y-3">
          {datosFiltrados.map(item => (
            <div key={item.id} className="border rounded-lg p-4 bg-white shadow-sm">
              {campos.map(campo => (
                <div key={campo.nombre} className="flex justify-between py-1">
                  <span className="text-sm text-gray-500">{campo.etiqueta}</span>
                  <span className="text-sm font-medium">
                    {String((item as Record<string, unknown>)[campo.nombre] ?? '-')}
                  </span>
                </div>
              ))}
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <button
                  onClick={() => abrirEditar(item)}
                  className="flex-1 px-3 py-2 text-blue-600 border border-blue-600 rounded-lg text-sm min-h-[44px]"
                >
                  Editar
                </button>
                <button
                  onClick={() => confirmarDesactivar(item.id)}
                  className="flex-1 px-3 py-2 text-red-600 border border-red-600 rounded-lg text-sm min-h-[44px]"
                >
                  Desactivar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal formulario */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white w-full md:max-w-md md:rounded-lg rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">
              {editando ? `Editar ${titulo}` : `Nuevo ${titulo}`}
            </h2>

            {errorForm && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
                {errorForm}
              </div>
            )}

            <div className="space-y-4">
              {campos.map(campo => (
                <div key={campo.nombre}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {campo.etiqueta}
                    {campo.obligatorio && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {campo.tipo === 'select' ? (
                    <select
                      value={String(formulario[campo.nombre] ?? '')}
                      onChange={e => setFormulario({ ...formulario, [campo.nombre]: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-[16px]"
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
                      className="w-full px-3 py-2 border rounded-lg text-[16px]"
                    />
                  ) : campo.tipo === 'boolean' ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!formulario[campo.nombre]}
                        onChange={e => setFormulario({ ...formulario, [campo.nombre]: e.target.checked })}
                        className="w-5 h-5"
                      />
                      <span className="text-sm">{campo.etiqueta}</span>
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
                      className="w-full px-3 py-2 border rounded-lg text-[16px]"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalAbierto(false)}
                className="flex-1 px-4 py-2 border rounded-lg min-h-[44px]"
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px] disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
