import { Plus } from 'lucide-react'
import { IconButton } from '@/shared/components/panel'

/** Botón "+" solo, para un producto que todavía no está en el pedido. */
export function BotonSumar({ nombre, onClick }: { nombre: string; onClick: () => void }) {
  return (
    <IconButton
      etiqueta={`Agregar ${nombre}`}
      variante="primario"
      onClick={onClick}
      className="border border-acento-primario/40 text-acento-primario"
    >
      <Plus size={18} />
    </IconButton>
  )
}
