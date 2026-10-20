import { useState, type ReactNode } from 'react'
import { Modal, mostrarToast } from '@/shared/components/panel'
import type { CampoSchema, EntidadBase } from '@/shared/types/base'
import { EstadoCargando } from './EstadoCargando'
import { EstadoVacio } from './EstadoVacio'
import { EstadoError } from './EstadoError'
import { TablaCrud } from './crud/TablaCrud'
import { FormularioCrud } from './crud/FormularioCrud'
import type { ColumnaCrud } from './crud/tipos'

// Patron G — componente generico CRUD (estilo Panel)
// La pantalla que lo usa pone el encabezado, el buscador y los filtros; acá viven
// la lista (tabla / tarjetas), el formulario en Modal y los estados.

interface CrudManagerProps<T extends EntidadBase & { active?: boolean }> {
  /** Nombre en singular y minúscula, para los títulos: "producto" → "Nuevo producto". */
  nombreSingular: string
  /** Registros ya filtrados por la pantalla. */
  datos: T[]
  campos: CampoSchema[]
  /** Columnas de la lista; si no vienen, salen de `campos`. */
  columnas?: ColumnaCrud<T>[]
  cargando: boolean
  error: string | null
  /** Hay búsqueda o filtro activo: el vacío dice "no hay con ese filtro". */
  hayFiltro?: boolean
  /** Mensaje del vacío cuando no hay filtro. */
  mensajeVacio?: string
  /** Ofrecer "Nuevo" en el vacío. */
  permitirCrear?: boolean
  /** Controlado por la pantalla: true abre el formulario de alta. */
  creando: boolean
  onCerrarCrear: () => void
  onPedirCrear: () => void
  /** Línea chica del Modal al editar (ej. la categoría). */
  subtituloEditar?: (item: T) => string | undefined
  onCrear: (datos: Partial<T>) => Promise<{ error: string | null }>
  onEditar: (id: string, datos: Partial<T>) => Promise<{ error: string | null }>
  onDesactivar: (id: string) => Promise<{ error: string | null }>
  onRecargar: () => void
  /** Validación opcional (ej: zod) — devuelve mensaje de error o null */
  validar?: (datos: Record<string, unknown>) => string | null
}

export function CrudManager<T extends EntidadBase & { active?: boolean }>({
  nombreSingular, datos, campos, columnas, cargando, error, hayFiltro, mensajeVacio, permitirCrear = true,
  creando, onCerrarCrear, onPedirCrear, subtituloEditar, onCrear, onEditar, onDesactivar, onRecargar, validar,
}: CrudManagerProps<T>) {
  const [editando, setEditando] = useState<T | null>(null)

  const modalAbierto = creando || editando !== null

  const columnasLista: ColumnaCrud<T>[] = columnas ?? campos.map(c => ({
    clave: c.nombre,
    titulo: c.etiqueta,
    alinear: c.tipo === 'numero' ? 'der' : undefined,
    render: (item: T): ReactNode => String((item as Record<string, unknown>)[c.nombre] ?? '-'),
  }))

  function cerrar() {
    setEditando(null)
    onCerrarCrear()
  }

  const valoresIniciales = (item: T | null): Record<string, unknown> => {
    const datosForm: Record<string, unknown> = {}
    if (!item) return datosForm
    campos.forEach(campo => {
      datosForm[campo.nombre] = (item as Record<string, unknown>)[campo.nombre] ?? ''
    })
    return datosForm
  }

  async function cambiarEstado(item: T) {
    const activando = item.active === false
    if (!window.confirm(`¿Confirmás que querés ${activando ? 'activar' : 'desactivar'} este ${nombreSingular}?`)) return
    const resultado = await onDesactivar(item.id)
    if (resultado.error) mostrarToast(`Error: ${resultado.error}`, 'error')
  }

  let contenido: ReactNode
  if (cargando) {
    contenido = <div className="rounded-xl border border-borde-sutil bg-bg-tarjeta shadow-tarjeta"><EstadoCargando /></div>
  } else if (error) {
    contenido = <EstadoError mensaje={error} onReintentar={onRecargar} />
  } else if (datos.length === 0) {
    contenido = (
      <div className="rounded-xl border border-borde-sutil bg-bg-tarjeta shadow-tarjeta">
        <EstadoVacio
          mensaje={hayFiltro ? `No hay ${nombreSingular}s con ese filtro` : (mensajeVacio ?? `Todavía no hay ${nombreSingular}s`)}
          accion={!hayFiltro && permitirCrear ? { texto: `Nuevo ${nombreSingular}`, onClick: onPedirCrear } : undefined}
        />
      </div>
    )
  } else {
    contenido = <TablaCrud datos={datos} columnas={columnasLista} onEditar={setEditando} onCambiarEstado={cambiarEstado} />
  }

  return (
    <>
      {contenido}
      <Modal
        open={modalAbierto}
        onClose={cerrar}
        title={editando ? `Editar ${nombreSingular}` : `Nuevo ${nombreSingular}`}
        subtitulo={editando ? subtituloEditar?.(editando) : undefined}
      >
        <FormularioCrud
          campos={campos}
          inicial={valoresIniciales(editando)}
          validar={validar}
          onEnviar={datosForm => (editando
            ? onEditar(editando.id, datosForm as Partial<T>)
            : onCrear(datosForm as Partial<T>))}
          onListo={cerrar}
          onCancelar={cerrar}
        />
      </Modal>
    </>
  )
}
