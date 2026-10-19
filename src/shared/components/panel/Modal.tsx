// =============================================================================
// Modal.tsx — Ventana de detalle o formulario. En celu es una hoja que sube desde
// abajo (bottom sheet); desde sm es un modal centrado.
//
// Los modales se pueden anidar. Con cada uno escuchando Escape por su cuenta, una
// sola tecla cerraba todos. Por eso hay una pila: solo el último abierto responde.
// =============================================================================

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { IconButton } from './IconButton'

const abiertos: symbol[] = []

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  /** Línea chica gris bajo el título (ej. "Pedido #123 · Delivery"). */
  subtitulo?: string
  children: ReactNode
  /** Ancho mayor desde sm (para tablas o formularios largos). */
  wide?: boolean
}

export function Modal({ open, onClose, title, subtitulo, children, wide }: ModalProps) {
  const [id] = useState(() => Symbol('modal'))

  // onClose suele venir como arrow inline, o sea nueva en cada render. Si entrara como
  // dependencia del efecto, el modal se daría de baja y de alta en cada render y treparía
  // al tope de la pila por encima de sus hijos.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    if (!open) return
    abiertos.push(id)

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (abiertos[abiertos.length - 1] !== id) return
      onCloseRef.current()
    }

    document.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('keydown', alTeclear)
      const i = abiertos.lastIndexOf(id)
      if (i !== -1) abiertos.splice(i, 1)
    }
  }, [open, id])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-borde-sutil bg-bg-tarjeta shadow-tarjeta sm:mx-4 sm:max-h-[90dvh] sm:rounded-2xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-borde-sutil px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h3 className="break-words text-lg font-semibold text-texto-primario">{title}</h3>
            {subtitulo && <p className="mt-0.5 break-words text-sm text-texto-secundario">{subtitulo}</p>}
          </div>
          <IconButton etiqueta="Cerrar" onClick={onClose} className="rounded-lg border border-borde-sutil hover:bg-superficie-2">
            <X size={18} />
          </IconButton>
        </div>
        {/* overflow-x-hidden evita scroll lateral por contenido desbordado */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">{children}</div>
      </div>
    </div>
  )
}
