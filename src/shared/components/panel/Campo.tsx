// =============================================================================
// Campo.tsx — Etiqueta arriba, el control en el medio y ayuda o error abajo
//
// `Campo` es el envoltorio. `Entrada`, `Selector` y `AreaTexto` (campos 16 px,
// 44 px de alto, borde de campo, foco naranja) lo usan solos cuando se les pasa
// `etiqueta`, `ayuda` o `error`. El error (rojo) reemplaza a la ayuda.
// =============================================================================

import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'
import { claseCampo, useCampo } from './campos.helpers'

interface CampoProps {
  /** Texto de la etiqueta; sin él no se dibuja la línea de arriba. */
  etiqueta?: string
  /** id del control, para enlazar la etiqueta. */
  htmlFor?: string
  /** Asterisco rojo: el dato es obligatorio. */
  obligatorio?: boolean
  /** Agrega "(opcional)" en gris al lado de la etiqueta. */
  opcional?: boolean
  /** Texto chico gris debajo del control. */
  ayuda?: ReactNode
  /** Mensaje de validación en rojo debajo del control. */
  error?: string
  /** id del párrafo de ayuda/error (para aria-describedby del control). */
  idMensaje?: string
  className?: string
  children: ReactNode
}

export function Campo({ etiqueta, htmlFor, obligatorio, opcional, ayuda, error, idMensaje, className, children }: CampoProps) {
  const Etiqueta = htmlFor ? 'label' : 'span'
  return (
    <div className={cn('min-w-0', className)}>
      {etiqueta && (
        <Etiqueta {...(htmlFor ? { htmlFor } : {})} className="mb-1.5 block text-sm font-medium text-texto-primario">
          {etiqueta}
          {obligatorio && <span className="ml-0.5 text-error" aria-hidden="true">*</span>}
          {opcional && <span className="ml-1 font-normal text-texto-secundario">(opcional)</span>}
        </Etiqueta>
      )}
      {children}
      {error ? (
        <p id={idMensaje} role="alert" className="mt-1 text-xs text-error">{error}</p>
      ) : ayuda ? (
        <div id={idMensaje} className="mt-1 text-xs text-texto-secundario">{ayuda}</div>
      ) : null}
    </div>
  )
}

/** Props de etiqueta, ayuda y error que comparten los tres controles. */
interface ExtrasCampo {
  /** Pinta el borde de rojo. */
  invalido?: boolean
  /** Etiqueta arriba del campo. Con etiqueta, ayuda o error el control viene envuelto en un `Campo`. */
  etiqueta?: string
  obligatorio?: boolean
  opcional?: boolean
  /** Texto chico debajo del campo. */
  ayuda?: ReactNode
  /** Mensaje de validación en rojo debajo del campo (también pinta el borde). */
  error?: string
}

export interface EntradaProps extends InputHTMLAttributes<HTMLInputElement>, ExtrasCampo {}

export const Entrada = forwardRef<HTMLInputElement, EntradaProps>(function Entrada(
  { invalido, etiqueta, obligatorio, opcional, ayuda, error, className, ...rest },
  ref,
) {
  const c = useCampo({ id: rest.id, invalido, etiqueta, ayuda, error })
  const input = (
    <input
      ref={ref}
      aria-invalid={c.invalido || undefined}
      className={claseCampo(c.invalido, c.conCampo ? cn('w-full', className) : className)}
      {...rest}
      id={c.conCampo ? c.idCampo : rest.id}
      aria-describedby={c.idMensaje ?? rest['aria-describedby']}
    />
  )
  if (!c.conCampo) return input
  return (
    <Campo etiqueta={etiqueta} htmlFor={c.idCampo} obligatorio={obligatorio} opcional={opcional} ayuda={ayuda} error={error} idMensaje={c.idMensaje}>
      {input}
    </Campo>
  )
})

export interface SelectorProps extends SelectHTMLAttributes<HTMLSelectElement>, ExtrasCampo {}

export const Selector = forwardRef<HTMLSelectElement, SelectorProps>(function Selector(
  { invalido, etiqueta, obligatorio, opcional, ayuda, error, className, children, ...rest },
  ref,
) {
  const c = useCampo({ id: rest.id, invalido, etiqueta, ayuda, error })
  const select = (
    <select
      ref={ref}
      aria-invalid={c.invalido || undefined}
      className={claseCampo(c.invalido, c.conCampo ? cn('w-full', className) : className)}
      {...rest}
      id={c.conCampo ? c.idCampo : rest.id}
      aria-describedby={c.idMensaje ?? rest['aria-describedby']}
    >
      {children}
    </select>
  )
  if (!c.conCampo) return select
  return (
    <Campo etiqueta={etiqueta} htmlFor={c.idCampo} obligatorio={obligatorio} opcional={opcional} ayuda={ayuda} error={error} idMensaje={c.idMensaje}>
      {select}
    </Campo>
  )
})

export interface AreaTextoProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, ExtrasCampo {}

export const AreaTexto = forwardRef<HTMLTextAreaElement, AreaTextoProps>(function AreaTexto(
  { invalido, etiqueta, obligatorio, opcional, ayuda, error, className, ...rest },
  ref,
) {
  const c = useCampo({ id: rest.id, invalido, etiqueta, ayuda, error })
  const textarea = (
    <textarea
      ref={ref}
      aria-invalid={c.invalido || undefined}
      className={claseCampo(c.invalido, c.conCampo ? cn('w-full', className) : className)}
      {...rest}
      id={c.conCampo ? c.idCampo : rest.id}
      aria-describedby={c.idMensaje ?? rest['aria-describedby']}
    />
  )
  if (!c.conCampo) return textarea
  return (
    <Campo etiqueta={etiqueta} htmlFor={c.idCampo} obligatorio={obligatorio} opcional={opcional} ayuda={ayuda} error={error} idMensaje={c.idMensaje}>
      {textarea}
    </Campo>
  )
})
