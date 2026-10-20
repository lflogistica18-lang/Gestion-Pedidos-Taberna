import { cn } from '@/shared/lib/cn'

interface OpcionModoImpresionProps {
  titulo: string
  detalle: string
  elegida: boolean
  onElegir: () => void
}

// Tarjeta-opción de un grupo radio (el contenedor pone role="radiogroup").
export function OpcionModoImpresion({ titulo, detalle, elegida, onElegir }: OpcionModoImpresionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={elegida}
      onClick={onElegir}
      className={cn(
        'min-h-11 rounded-xl border p-3 text-left transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento-primario',
        elegida ? 'border-2 border-acento-primario bg-acento-primario/5' : 'border-borde-sutil hover:bg-bg-principal',
      )}
    >
      <span className="block text-sm font-semibold text-texto-primario">{titulo}</span>
      <span className="mt-1 block text-xs text-texto-secundario">{detalle}</span>
    </button>
  )
}
