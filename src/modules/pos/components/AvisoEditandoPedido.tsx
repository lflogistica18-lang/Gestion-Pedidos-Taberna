import { Pencil } from 'lucide-react'
import { AvisoEstado, Boton } from '@/shared/components/panel'
import { useCartStore } from '../store/useCartStore'

/**
 * Franja que avisa que el carrito es un pedido ya guardado (mismo número) y no uno nuevo.
 * No se muestra si no hay un pedido en edición.
 */
export function AvisoEditandoPedido({ className }: { className?: string }) {
  const editando = useCartStore((s) => s.editando)
  const salirDeEdicion = useCartStore((s) => s.salirDeEdicion)
  if (!editando) return null

  return (
    <AvisoEstado
      tono="ambar"
      icono={Pencil}
      titulo={`Editando el pedido #${editando.orderNumber}`}
      className={className}
      accion={<Boton onClick={salirDeEdicion}>Cancelar edición</Boton>}
    >
      Se guarda en el mismo pedido. Si cancelás, queda como estaba.
    </AvisoEstado>
  )
}
