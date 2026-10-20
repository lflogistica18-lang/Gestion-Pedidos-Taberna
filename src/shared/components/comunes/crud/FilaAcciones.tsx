import { Pencil, Power } from 'lucide-react'
import { IconButton } from '@/shared/components/panel'

interface Props {
  inactivo: boolean
  onEditar: () => void
  onCambiarEstado: () => void
}

/** Editar + Desactivar/Activar, compartidas por la fila de la tabla y la tarjeta de celu. */
export function FilaAcciones({ inactivo, onEditar, onCambiarEstado }: Props) {
  return (
    <div className="flex items-center justify-end gap-1">
      <IconButton etiqueta="Editar" compacto onClick={onEditar}>
        <Pencil size={18} />
      </IconButton>
      <IconButton
        etiqueta={inactivo ? 'Activar' : 'Desactivar'}
        variante={inactivo ? 'primario' : 'peligro'}
        compacto
        onClick={onCambiarEstado}
      >
        <Power size={18} />
      </IconButton>
    </div>
  )
}
