import { useSyncExternalStore } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { cerrarToast, leerToasts, suscribirToasts, type TonoToast } from './toast.helpers'

// Clases completas y estáticas: Tailwind no ve las que se arman con template strings.
const CLASES: Record<TonoToast, string> = {
  exito: 'border-tono-verde-borde bg-tono-verde-fondo text-tono-verde-texto',
  error: 'border-tono-rojo-borde bg-tono-rojo-fondo text-tono-rojo-texto',
  info: 'border-tono-azul-borde bg-tono-azul-fondo text-tono-azul-texto',
}

/** Dibuja los avisos activos. Se monta una sola vez, en Layout. */
export function ContenedorToasts() {
  const toasts = useSyncExternalStore(suscribirToasts, leerToasts)
  if (toasts.length === 0) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-[200] flex flex-col items-center gap-2 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn('pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-lg border bg-bg-tarjeta py-1 pl-4 pr-1 text-sm shadow-tarjeta', CLASES[t.tono])}
        >
          <span className="flex-1 py-2">{t.texto}</span>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => cerrarToast(t.id)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
