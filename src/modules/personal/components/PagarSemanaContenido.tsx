import { useEffect, useMemo, useState } from 'react'
import { AvisoEstado, Boton, ControlSegmentado, Modal, mostrarToast } from '@/shared/components/panel'
import { pesos } from '@/shared/lib/formato'
import { useConfiguracion } from '@/shared/store/useConfiguracion'
import type { ConceptoPago, Empleado, MedioPagoPersonal, NovedadPersonal, PagoPersonal, PagoPersonalItem } from '@/types/database.types'
import { usePagos } from '../hooks/usePagos'
import {
  avisoTotalNegativo, calcularTotales, novedadesDescontadas, proponerItems, type ItemPropuesto, type Semana,
} from '../lib/calculos'
import { AgregarConcepto } from './AgregarConcepto'
import { ItemsPago } from './ItemsPago'
import { ResultadoRecibo } from './ResultadoRecibo'

interface Props {
  empleado: Empleado
  semana: Semana
  pagoInicial: PagoPersonal | null
  conceptos: ConceptoPago[]
  novedades: NovedadPersonal[]
  onCerrar: () => void
  onCambio: () => void
}

const MEDIOS: { value: MedioPagoPersonal; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
]

function deItemGuardado(i: PagoPersonalItem): ItemPropuesto {
  return {
    concepto_id: i.concepto_id, nombre: i.nombre, tipo: i.tipo, modo: i.modo, valor: i.valor,
    cantidad: i.cantidad, monto: i.monto, novedad_id: i.novedad_id,
  }
}

export function PagarSemanaContenido({ empleado, semana, pagoInicial, conceptos, novedades, onCerrar, onCambio }: Props) {
  const { cargarItems, guardarBorrador, marcarPagado, emitirRecibo } = usePagos()
  const local = useConfiguracion((s) => s.config.nombre_local)
  const propuesta = useMemo(() => proponerItems(empleado, conceptos, novedades, semana), [empleado, conceptos, novedades, semana])

  // Con un borrador ya guardado se parte de sus ítems; si no, de lo que propone el sistema.
  const [items, setItems] = useState<ItemPropuesto[]>(pagoInicial ? [] : propuesta.items)
  const [cargandoItems, setCargandoItems] = useState(pagoInicial !== null)
  const [pago, setPago] = useState<PagoPersonal | null>(pagoInicial)
  const [medio, setMedio] = useState<MedioPagoPersonal | ''>('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagado, setPagado] = useState<PagoPersonal | null>(null)
  const [recibo, setRecibo] = useState<Blob | null>(null)
  const [errorRecibo, setErrorRecibo] = useState<string | null>(null)
  const [avisoPago, setAvisoPago] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  useEffect(() => {
    if (!pagoInicial) return
    const cargar = async () => {
      const r = await cargarItems(pagoInicial.id)
      if (r.error) setError(r.error)
      else setItems(r.items.map(deItemGuardado))
      setCargandoItems(false)
    }
    cargar()
    // Solo al abrir: los ítems pasan a ser del formulario
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totales = calcularTotales(empleado.sueldo_semanal, items)
  const aviso = avisoTotalNegativo(empleado.sueldo_semanal, items)
  const bloqueado = ocupado || cargandoItems

  const generarRecibo = async (p: PagoPersonal) => {
    setOcupado(true)
    const r = await emitirRecibo(p, empleado, local)
    setRecibo(r.blob)
    setErrorRecibo(r.error)
    setOcupado(false)
    if (!r.error) onCambio()
  }

  const guardar = async () => {
    setOcupado(true)
    setError(null)
    const r = await guardarBorrador(empleado, semana, items, pago?.id ?? null)
    if (r.pago) setPago(r.pago)
    setOcupado(false)
    onCambio()
    if (r.error) {
      setError(r.error)
      return
    }
    mostrarToast('Borrador guardado', 'exito')
    onCerrar()
  }

  const pagar = async () => {
    if (medio === '') return
    setConfirmando(false)
    setOcupado(true)
    setError(null)
    const g = await guardarBorrador(empleado, semana, items, pago?.id ?? null)
    if (g.pago) setPago(g.pago)
    if (g.error || !g.pago) {
      setError(g.error ?? 'No se pudo guardar el pago')
      setOcupado(false)
      onCambio()
      return
    }
    const m = await marcarPagado(g.pago.id, medio, novedadesDescontadas(items, propuesta))
    onCambio()
    if (m.error || !m.pago) {
      setError(m.error ?? 'No se pudo marcar como pagado')
      setOcupado(false)
      return
    }
    setAvisoPago(m.aviso)
    setPagado(m.pago)
    await generarRecibo(m.pago)
  }

  if (pagado) {
    return (
      <ResultadoRecibo
        pago={pagado}
        empleada={empleado.nombre}
        recibo={recibo}
        errorRecibo={errorRecibo}
        generando={ocupado}
        aviso={avisoPago}
        onGenerar={() => void generarRecibo(pagado)}
        onCerrar={onCerrar}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-texto-secundario">Sueldo semanal</span>
        <span className="font-semibold text-texto-primario">{pesos(empleado.sueldo_semanal)}</span>
      </div>
      {cargandoItems ? (
        <p className="text-sm text-texto-secundario">Cargando ítems…</p>
      ) : (
        <ItemsPago items={items} onQuitar={(n) => setItems((l) => l.filter((_, i) => i !== n))} />
      )}
      <AgregarConcepto
        conceptos={conceptos}
        empleado={empleado}
        disabled={bloqueado}
        onAgregar={(item) => setItems((l) => [...l, item])}
      />
      {aviso && <AvisoEstado tono="ambar" titulo="Total en negativo">{aviso}</AvisoEstado>}
      <div className="rounded-xl bg-superficie-2 p-4 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-texto-secundario">A cobrar</p>
        <p className="text-3xl font-bold text-texto-primario">{pesos(totales.total)}</p>
        <p className="mt-1 text-xs text-texto-secundario">
          Extras {pesos(totales.extras)} · Descuentos {pesos(totales.descuentos)}
        </p>
      </div>
      <ControlSegmentado<MedioPagoPersonal> etiqueta="Medio de pago" tono="acento" opciones={MEDIOS} value={medio} onChange={setMedio} />
      {error && <AvisoEstado tono="rojo" titulo="No se pudo completar">{error}</AvisoEstado>}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Boton onClick={() => void guardar()} disabled={bloqueado || totales.negativo}>Guardar borrador</Boton>
        <Boton variante="primario" onClick={() => setConfirmando(true)} disabled={bloqueado || totales.negativo || medio === ''}>
          {ocupado ? 'Guardando…' : 'Marcar pagado'}
        </Boton>
      </div>
      {medio === '' && <p className="text-center text-xs text-texto-secundario">Elegí cómo se paga para poder marcar el pago.</p>}
      <Modal open={confirmando} onClose={() => setConfirmando(false)} title="Marcar como pagado">
        <div className="space-y-4">
          <p className="text-sm text-texto-primario">¿Marcar como pagado? Después no se puede modificar.</p>
          <p className="text-sm text-texto-secundario">{empleado.nombre} cobra {pesos(totales.total)}.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Boton onClick={() => setConfirmando(false)}>Cancelar</Boton>
            <Boton variante="primario" onClick={() => void pagar()}>Marcar pagado</Boton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
