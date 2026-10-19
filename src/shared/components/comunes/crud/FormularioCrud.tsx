import { useState, type FormEvent } from 'react'
import { AreaTexto, AvisoEstado, Boton, Entrada, Selector } from '@/shared/components/panel'
import type { CampoSchema } from '@/shared/types/base'

interface Props {
  campos: CampoSchema[]
  /** Valores con los que arranca el formulario (vacío si es un alta). */
  inicial: Record<string, unknown>
  validar?: (datos: Record<string, unknown>) => string | null
  /** Guarda; si devuelve error, queda en el formulario. */
  onEnviar: (datos: Record<string, unknown>) => Promise<{ error: string | null }>
  /** Se llamó a guardar y salió bien. */
  onListo: () => void
  onCancelar: () => void
}

/** Deja pasar solo dígitos y un punto decimal (acepta la coma del teclado argentino). */
function limpiarNumero(texto: string): string {
  const conPunto = texto.replace(',', '.').replace(/[^\d.]/g, '')
  const [entero, ...decimales] = conPunto.split('.')
  return decimales.length > 0 ? `${entero}.${decimales.join('')}` : entero
}

/** Cuerpo del Modal de alta/edición: un control por campo del schema. */
export function FormularioCrud({ campos, inicial, validar, onEnviar, onListo, onCancelar }: Props) {
  const [valores, setValores] = useState<Record<string, unknown>>(inicial)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const onCambiar = (nombre: string, valor: unknown) => setValores(v => ({ ...v, [nombre]: valor }))

  async function guardar() {
    for (const campo of campos) {
      if (campo.obligatorio && !valores[campo.nombre]) {
        setErrorForm(`El campo "${campo.etiqueta}" es obligatorio`)
        return
      }
    }
    const errorValidacion = validar?.(valores)
    if (errorValidacion) {
      setErrorForm(errorValidacion)
      return
    }
    setGuardando(true)
    setErrorForm(null)
    const resultado = await onEnviar(valores)
    setGuardando(false)
    if (resultado.error) {
      setErrorForm(resultado.error)
      return
    }
    onListo()
  }

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    void guardar()
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      {errorForm && <AvisoEstado tono="rojo" titulo={errorForm} />}

      {campos.map(campo => {
        const valor = String(valores[campo.nombre] ?? '')
        const comunes = { etiqueta: campo.etiqueta, obligatorio: campo.obligatorio, opcional: !campo.obligatorio }
        if (campo.tipo === 'select') {
          return (
            <Selector key={campo.nombre} {...comunes} value={valor} onChange={e => onCambiar(campo.nombre, e.target.value)}>
              <option value="">Seleccionar…</option>
              {campo.opciones?.map(op => <option key={op} value={op}>{op}</option>)}
            </Selector>
          )
        }
        if (campo.tipo === 'textarea') {
          return <AreaTexto key={campo.nombre} {...comunes} rows={3} value={valor} placeholder={campo.placeholder} onChange={e => onCambiar(campo.nombre, e.target.value)} />
        }
        if (campo.tipo === 'boolean') {
          return (
            <label key={campo.nombre} className="flex min-h-11 items-center gap-3 text-sm text-texto-primario">
              <input type="checkbox" className="size-5 accent-acento-primario" checked={!!valores[campo.nombre]} onChange={e => onCambiar(campo.nombre, e.target.checked)} />
              {campo.etiqueta}
            </label>
          )
        }
        if (campo.tipo === 'numero') {
          return <Entrada key={campo.nombre} {...comunes} type="text" inputMode="decimal" value={valor} placeholder={campo.placeholder} onChange={e => onCambiar(campo.nombre, limpiarNumero(e.target.value))} />
        }
        return <Entrada key={campo.nombre} {...comunes} type={campo.tipo === 'fecha' ? 'date' : 'text'} value={valor} placeholder={campo.placeholder} onChange={e => onCambiar(campo.nombre, e.target.value)} />
      })}

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Boton onClick={onCancelar} disabled={guardando}>Cancelar</Boton>
        <Boton type="submit" variante="primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Boton>
      </div>
    </form>
  )
}
