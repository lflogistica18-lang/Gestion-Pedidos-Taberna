import { Plus } from 'lucide-react'
import { IconButton } from '@/shared/components/panel'

/** Botón "+" solo, para un producto que todavía no está en el pedido. */
export function BotonSumar({ nombre, onClick }: { nombre: string; onClick: () => void }) {
  return (
    <IconButton
      etiqueta={`Agregar ${nombre}`}
      variante="primario"
      onClick={onClick}
      className="border border-acento-primario/40 text-acento-primario md:min-h-13 md:min-w-13"
    >
      <Plus size={18} className="md:size-6" />
    </IconButton>
  )
}
