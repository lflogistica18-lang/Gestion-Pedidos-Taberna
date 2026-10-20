import { fmtMonto, Boton } from '@/shared/components/panel'

interface BarraCarritoProps {
  cantidad: number
  total: number
  onAbrir: () => void
}

/** Barra pegada al fondo del contenido en celu y tablet parada; desde lg el carrito va al costado. */
export function BarraCarrito({ cantidad, total, onAbrir }: BarraCarritoProps) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-borde-sutil bg-bg-tarjeta px-4 py-3 shadow-tarjeta sm:px-6 lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-texto-secundario">
            {cantidad} {cantidad === 1 ? 'ítem' : 'ítems'}
          </p>
          <p className="text-xl font-bold tabular-nums text-texto-primario">{fmtMonto(total)}</p>
        </div>
        <Boton
          variante="primario"
          onClick={onAbrir}
          aria-label={`Ver pedido: ${cantidad} ${cantidad === 1 ? 'ítem' : 'ítems'}`}
        >
          Ver pedido →
        </Boton>
      </div>
    </div>
  )
}
