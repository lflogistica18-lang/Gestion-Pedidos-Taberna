import { Pencil, Trash2 } from 'lucide-react'
import { Boton, Entrada, IconButton } from '@/shared/components/panel'

interface Props {
  nombre: string
  /** Productos activos de la categoría; sin dato, no se muestra. */
  cantidad?: number
  editando: boolean
  valorEdicion: string
  onCambiarEdicion: (v: string) => void
  onIniciar: () => void
  onGuardar: () => void
  onCancelar: () => void
  onEliminar: () => void
}

export function FilaCategoria({
  nombre, cantidad, editando, valorEdicion, onCambiarEdicion, onIniciar, onGuardar, onCancelar, onEliminar,
}: Props) {
  if (editando) {
    return (
      <li className="flex flex-wrap items-center gap-2 px-4 py-3">
        <Entrada
          autoFocus
          aria-label={`Nuevo nombre para ${nombre}`}
          className="min-w-0 flex-1 basis-48"
          value={valorEdicion}
          onChange={e => onCambiarEdicion(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onGuardar()
            if (e.key === 'Escape') onCancelar()
          }}
        />
        <Boton variante="primario" onClick={onGuardar}>Guardar</Boton>
        <Boton onClick={onCancelar}>Cancelar</Boton>
      </li>
    )
  }
  return (
    <li className="flex items-center justify-between gap-2 py-1 pl-4 pr-2">
      <div className="min-w-0">
        <p className="break-words font-medium text-texto-primario">{nombre}</p>
        {cantidad !== undefined && (
          <p className="text-xs text-texto-secundario">
            {cantidad === 1 ? '1 producto activo' : `${cantidad} productos activos`}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center">
        <IconButton etiqueta="Renombrar" onClick={onIniciar}><Pencil size={18} /></IconButton>
        <IconButton etiqueta="Eliminar" variante="peligro" onClick={onEliminar}><Trash2 size={18} /></IconButton>
      </div>
    </li>
  )
}
