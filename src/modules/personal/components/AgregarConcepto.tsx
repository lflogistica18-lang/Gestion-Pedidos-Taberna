import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Boton, Entrada, Selector } from '@/shared/components/panel'
import type { ConceptoPago, Empleado } from '@/types/database.types'
import { itemDeConcepto, type ItemPropuesto } from '../lib/calculos'
import { ETIQUETA_MODO, ETIQUETA_TIPO, ayudaMonto, errorTopeMonto, leerNumero } from '../lib/etiquetas'

interface Props {
  conceptos: ConceptoPago[]
  empleado: Pick<Empleado, 'sueldo_semanal' | 'dias_por_semana'>
  onAgregar: (item: ItemPropuesto) => void
  disabled?: boolean
}

/** Elegir un concepto y, según su modo, la cantidad o el monto. */
export function AgregarConcepto({ conceptos, empleado, onAgregar, disabled }: Props) {
  const [conceptoId, setConceptoId] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [monto, setMonto] = useState('')
  const [error, setError] = useState<string | undefined>()

  const concepto = conceptos.find((c) => c.id === conceptoId)

  const elegir = (id: string) => {
    setConceptoId(id)
    setError(undefined)
    setCantidad('1')
    const c = conceptos.find((x) => x.id === id)
    setMonto(c && c.modo === 'fijo' && c.valor > 0 ? String(c.valor) : '')
  }

  const agregar = () => {
    if (!concepto) return
    if (concepto.modo === 'fijo') {
      const m = leerNumero(monto)
      if (m === null || m <= 0) return setError('Escribí un monto mayor a cero')
      const tope = errorTopeMonto(m, 'El monto')
      if (tope) return setError(tope)
      onAgregar(itemDeConcepto(concepto, 1, empleado, m))
    } else if (concepto.modo === 'porcentaje') {
      onAgregar(itemDeConcepto(concepto, 1, empleado))
    } else {
      const c = leerNumero(cantidad)
      if (c === null || c <= 0) return setError('La cantidad tiene que ser mayor a cero')
      const tope = errorTopeMonto(itemDeConcepto(concepto, c, empleado).monto, 'El monto del ítem')
      if (tope) return setError(tope)
      onAgregar(itemDeConcepto(concepto, c, empleado))
    }
    setConceptoId('')
    setMonto('')
    setCantidad('1')
    setError(undefined)
  }

  return (
    <div className="space-y-3 rounded-xl border border-borde-sutil bg-bg-principal p-3">
      <Selector etiqueta="Agregar extra o descuento" value={conceptoId} onChange={(e) => elegir(e.target.value)} disabled={disabled}>
        <option value="">Elegir concepto…</option>
        {conceptos.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre} ({ETIQUETA_TIPO[c.tipo].toLowerCase()}, {ETIQUETA_MODO[c.modo].toLowerCase()})</option>
        ))}
      </Selector>
      {concepto?.modo === 'fijo' && (
        <Entrada etiqueta="Monto ($)" type="text" inputMode="decimal" value={monto} error={error} ayuda={ayudaMonto(monto)} onChange={(e) => setMonto(e.target.value)} />
      )}
      {(concepto?.modo === 'por_unidad' || concepto?.modo === 'dias_de_sueldo') && (
        <Entrada
          etiqueta={concepto.modo === 'por_unidad' ? 'Cantidad' : 'Cantidad de días'}
          type="text"
          inputMode="decimal"
          value={cantidad}
          error={error}
          onChange={(e) => setCantidad(e.target.value)}
        />
      )}
      {concepto && (
        <Boton className="w-full" onClick={agregar} disabled={disabled}>
          <Plus size={16} />Agregar
        </Boton>
      )}
    </div>
  )
}
