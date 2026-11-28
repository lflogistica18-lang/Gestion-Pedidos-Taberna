import { useState } from 'react'
import { AreaTexto, AvisoEstado, Boton, ControlSegmentado, Entrada, Modal, Selector } from '@/shared/components/panel'
import type { MedioAdelanto, TipoNovedad } from '@/types/database.types'
import type { DatosNovedad } from '../hooks/useFichaEmpleada'
import { hoyArgentina } from '../lib/calculos'
import { ETIQUETA_NOVEDAD, OPCIONES_MEDIO, ayudaMonto, errorTopeMonto, leerNumero } from '../lib/etiquetas'

interface Props {
  open: boolean
  onClose: () => void
  onGuardar: (d: DatosNovedad) => Promise<{ error: string | null }>
}

const TIPOS = Object.keys(ETIQUETA_NOVEDAD) as TipoNovedad[]

export function ModalNovedad({ open, onClose, onGuardar }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Nueva novedad">
      <FormularioNovedad onCancelar={onClose} onGuardar={onGuardar} />
    </Modal>
  )
}

function FormularioNovedad({ onCancelar, onGuardar }: { onCancelar: () => void; onGuardar: Props['onGuardar'] }) {
  const [fecha, setFecha] = useState(() => hoyArgentina())
  const [tipo, setTipo] = useState<TipoNovedad>('inasistencia')
  const [detalle, setDetalle] = useState('')
  const [monto, setMonto] = useState('')
  const [medio, setMedio] = useState<MedioAdelanto | ''>('')
  const [descontar, setDescontar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const enviar = async () => {
    const montoNum = leerNumero(monto)
    if (!fecha) return setError('Elegí la fecha')
    if (detalle.length > 500) return setError('El detalle puede tener hasta 500 letras')
    if (tipo === 'adelanto' && (montoNum === null || montoNum <= 0)) return setError('Un adelanto necesita un monto mayor a cero')
    if (tipo === 'adelanto' && montoNum !== null) {
      const tope = errorTopeMonto(montoNum, 'El adelanto')
      if (tope) return setError(tope)
    }
    if (tipo === 'adelanto' && medio === '') return setError('Elegí cómo se dio el adelanto')
    setGuardando(true)
    setError(null)
    const r = await onGuardar({
      fecha,
      tipo,
      detalle: detalle.trim(),
      monto: tipo === 'adelanto' ? montoNum : null,
      medio_pago: tipo === 'adelanto' && medio !== '' ? medio : null,
      descontar: tipo === 'inasistencia' && descontar,
    })
    setGuardando(false)
    if (r.error) setError(r.error)
    else onCancelar()
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void enviar()
      }}
    >
      {error && <AvisoEstado tono="rojo" titulo={error} />}
      <Selector etiqueta="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoNovedad)}>
        {TIPOS.map((t) => <option key={t} value={t}>{ETIQUETA_NOVEDAD[t]}</option>)}
      </Selector>
      <Entrada etiqueta="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      {tipo === 'adelanto' && (
        <>
          <Entrada etiqueta="Monto ($)" type="text" inputMode="decimal" ayuda={ayudaMonto(monto)} value={monto} onChange={(e) => setMonto(e.target.value)} />
          <ControlSegmentado<MedioAdelanto> etiqueta="Cómo se dio" tono="acento" opciones={OPCIONES_MEDIO} value={medio} onChange={setMedio} />
        </>
      )}
      {tipo === 'inasistencia' && (
        <label className="flex min-h-11 items-center gap-3 text-sm text-texto-primario">
          <input type="checkbox" className="size-5 accent-acento-primario" checked={descontar} onChange={(e) => setDescontar(e.target.checked)} />
          Descontar este día del sueldo de la semana
        </label>
      )}
      <AreaTexto etiqueta="Detalle" opcional rows={3} value={detalle} onChange={(e) => setDetalle(e.target.value)} />
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Boton onClick={onCancelar} disabled={guardando}>Cancelar</Boton>
        <Boton type="submit" variante="primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Boton>
      </div>
    </form>
  )
}
