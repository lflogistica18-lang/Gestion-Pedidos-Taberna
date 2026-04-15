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
    <div className="p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* Container Principal */}
      <div className="bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 overflow-hidden">
        
        {/* Header Premium */}
        <div className="p-6 md:p-8 bg-gradient-to-r from-gray-50/50 to-white border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight bg-clip-text">
            {titulo}
          </h1>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Buscador Integrado */}
            <div className="relative flex-1 sm:min-w-[260px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border-none ring-1 ring-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
              />
            </div>

            {!hideCrear && (
              <button
                onClick={abrirCrear}
                className="flex items-center justify-center px-5 py-2.5 bg-gradient-to-tr from-blue-600 to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all w-auto whitespace-nowrap"
              >
                + Nuevo
              </button>
            )}
          </div>
        </div>

        {/* Lista vacia */}
      {datosFiltrados.length === 0 && !cargando && (
        <EstadoVacio
          mensaje={busqueda ? 'No se encontraron resultados' : `No hay ${titulo.toLowerCase()} todavia`}
          accion={!busqueda ? { texto: `Crear ${titulo.toLowerCase()}`, onClick: abrirCrear } : undefined}
        />
      )}

        {/* Tabla desktop premium */}
        {datosFiltrados.length > 0 && (
          <div className="hidden md:block overflow-x-auto w-full pb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  {campos.map(campo => (
                    <th key={campo.nombre} className="text-left py-4 px-6 text-[13px] font-bold text-gray-500 uppercase tracking-wider">
                      {campo.etiqueta}
                    </th>
                  ))}
                  <th className="text-right py-4 px-6 text-[13px] font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {datosFiltrados.map(item => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                    {campos.map(campo => {
                      const strVal = String((item as Record<string, unknown>)[campo.nombre] ?? '-');
                      const esPrecio = campo.tipo === 'numero' && (campo.nombre.toLowerCase().includes('precio') || campo.nombre.toLowerCase().includes('price') || campo.nombre.toLowerCase().includes('total'));
                      return (
                        <td key={campo.nombre} className="py-4 px-6 text-sm text-gray-700">
                          {esPrecio ? <span className="font-bold text-gray-900">${Number(strVal).toLocaleString('es-AR')}</span> : strVal}
                        </td>
                      )
                    })}
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => abrirEditar(item)}
                          className="px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-semibold transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => confirmarDesactivar(item.id)}
                          className="px-3 py-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg text-sm font-semibold transition-colors"
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

        {/* Cards mobile */}
        {datosFiltrados.length > 0 && (
          <div className="md:hidden flex flex-col gap-3 p-4 bg-gray-50/50">
            {datosFiltrados.map(item => (
              <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="space-y-3">
                  {campos.map(campo => {
                    const strVal = String((item as Record<string, unknown>)[campo.nombre] ?? '-');
                    const esPrecio = campo.tipo === 'numero' && (campo.nombre.toLowerCase().includes('precio') || campo.nombre.toLowerCase().includes('price') || campo.nombre.toLowerCase().includes('total'));
                    return (
                      <div key={campo.nombre} className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{campo.etiqueta}</span>
                        <span className={`text-sm ${esPrecio ? 'font-bold text-gray-900 bg-gray-50 px-2.5 py-1 rounded-lg' : 'font-medium text-gray-700'}`}>
                          {esPrecio ? `$${Number(strVal).toLocaleString('es-AR')}` : strVal}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-2 mt-5 pt-4 border-t border-gray-50">
                  <button
                    onClick={() => abrirEditar(item)}
                    className="flex-1 px-4 py-2.5 text-blue-700 bg-blue-50 font-bold rounded-xl text-sm transition-active active:scale-95"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => confirmarDesactivar(item.id)}
                    className="flex-1 px-4 py-2.5 text-rose-700 bg-rose-50 font-bold rounded-xl text-sm transition-active active:scale-95"
                  >
                    Apagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
