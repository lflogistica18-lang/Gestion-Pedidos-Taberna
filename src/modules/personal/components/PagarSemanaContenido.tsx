import { useEffect, useMemo, useState } from 'react'
import { AvisoEstado, Boton, Entrada, Modal, mostrarToast } from '@/shared/components/panel'
import { pesos } from '@/shared/lib/formato'
import { useConfiguracion } from '@/shared/store/useConfiguracion'
import type { ConceptoPago, Empleado, NovedadPersonal, PagoPersonal, PagoPersonalItem } from '@/types/database.types'
import { usePagos, type MontosPago } from '../hooks/usePagos'
import {
  avisoTotalNegativo, calcularTotales, novedadesDescontadas, proponerItems, repartoPago, type ItemPropuesto, type Semana,
} from '../lib/calculos'
import { ayudaMonto, errorTopeMonto, leerNumero } from '../lib/etiquetas'
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

/** Texto de un campo de monto: vacío, o el número como vino guardado. */
function textoMontoGuardado(n: number | null): string {
  return n === null ? '' : String(n)
}

/** Error de un campo de monto (texto raro, negativo o pasado del tope), o undefined si está bien. */
function errorCampoMonto(texto: string, que: string): string | undefined {
  if (texto.trim() === '') return undefined
  const n = leerNumero(texto)
  if (n === null) return 'No se entiende como número'
  if (n < 0) return `${que} no puede ser negativo`
  return errorTopeMonto(n, que) ?? undefined
}

function textoDiferenciaCobro(diferencia: number): string {
  return `${pesos(Math.abs(diferencia))} ${diferencia > 0 ? 'de más' : 'de menos'} que lo calculado`
}

function deItemGuardado(i: PagoPersonalItem): ItemPropuesto {
  return {
    concepto_id: i.concepto_id, nombre: i.nombre, tipo: i.tipo, modo: i.modo, valor: i.valor,
    cantidad: i.cantidad, monto: i.monto, novedad_id: i.novedad_id,
  }
}

function textoConfirmacion(nombre: string, m: MontosPago): string {
  const ef = Math.round(m.efectivo ?? 0)
  const tr = Math.round(m.transferencia ?? 0)
  if (ef > 0 && tr > 0) return `${nombre} cobra ${pesos(ef + tr)}: ${pesos(tr)} por transferencia y ${pesos(ef)} en efectivo.`
  if (tr > 0) return `${nombre} cobra ${pesos(tr)} por transferencia.`
  return `${nombre} cobra ${pesos(ef)} en efectivo.`
}

export function PagarSemanaContenido({ empleado, semana, pagoInicial, conceptos, novedades, onCerrar, onCambio }: Props) {
  const { cargarItems, guardarBorrador, marcarPagado, emitirRecibo, descartarBorrador } = usePagos()
  const local = useConfiguracion((s) => s.config.nombre_local)
  const propuesta = useMemo(() => proponerItems(empleado, conceptos, novedades, semana), [empleado, conceptos, novedades, semana])

  // Con un borrador ya guardado se parte de sus ítems; si no, de lo que propone el sistema.
  const [items, setItems] = useState<ItemPropuesto[]>(pagoInicial ? [] : propuesta.items)
  const [cargandoItems, setCargandoItems] = useState(pagoInicial !== null)
  const [pago, setPago] = useState<PagoPersonal | null>(pagoInicial)
  const [efectivo, setEfectivo] = useState(() => textoMontoGuardado(pagoInicial?.monto_efectivo ?? null))
  const [transferencia, setTransferencia] = useState(() => textoMontoGuardado(pagoInicial?.monto_transferencia ?? null))
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagado, setPagado] = useState<PagoPersonal | null>(null)
  const [recibo, setRecibo] = useState<Blob | null>(null)
  const [errorRecibo, setErrorRecibo] = useState<string | null>(null)
  const [avisoPago, setAvisoPago] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [descartando, setDescartando] = useState(false)

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
  const errorEfectivo = errorCampoMonto(efectivo, 'El efectivo')
  const errorTransferencia = errorCampoMonto(transferencia, 'La transferencia')
  // Se guarda en pesos enteros, igual que lo que muestra repartoPago (si no, la base y la pantalla difieren en centavos)
  const redondear = (n: number | null) => (n === null ? null : Math.round(n))
  const montos: MontosPago = { efectivo: redondear(leerNumero(efectivo)), transferencia: redondear(leerNumero(transferencia)) }
  const reparto = repartoPago(totales.total, montos.efectivo, montos.transferencia)
  const montosMal = errorEfectivo !== undefined || errorTransferencia !== undefined
  const todoEn = (medio: 'efectivo' | 'transferencia') => {
    const total = String(Math.max(0, totales.total))
    setEfectivo(medio === 'efectivo' ? total : '')
    setTransferencia(medio === 'transferencia' ? total : '')
  }

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
    const r = await guardarBorrador(empleado, semana, items, pago?.id ?? null, montos)
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

  const descartar = async () => {
    if (!pago) return
    setOcupado(true)
    setError(null)
    const r = await descartarBorrador(pago.id)
    setOcupado(false)
    setDescartando(false)
    if (r.error) {
      setError(r.error)
      return
    }
    mostrarToast('Borrador descartado', 'exito')
    onCambio()
    onCerrar()
  }

  const pagar = async () => {
    if (!reparto.valido || montosMal) return
    setConfirmando(false)
    setOcupado(true)
    setError(null)
    const g = await guardarBorrador(empleado, semana, items, pago?.id ?? null, montos)
    if (g.pago) setPago(g.pago)
    if (g.error || !g.pago) {
      setError(g.error ?? 'No se pudo guardar el pago')
      setOcupado(false)
      onCambio()
      return
    }
    const m = await marcarPagado(g.pago.id, montos, novedadesDescontadas(items, propuesta))
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
      <div className="space-y-3">
        <p className="text-sm font-semibold text-texto-primario">Cómo se paga</p>
        <div className="grid grid-cols-2 gap-3">
          <Entrada etiqueta="Efectivo ($)" type="text" inputMode="decimal" className="min-w-0" value={efectivo}
            error={errorEfectivo} ayuda={errorEfectivo ? undefined : ayudaMonto(efectivo)} disabled={bloqueado}
            onChange={(e) => setEfectivo(e.target.value)} />
          <Entrada etiqueta="Transferencia ($)" type="text" inputMode="decimal" className="min-w-0" value={transferencia}
            error={errorTransferencia} ayuda={errorTransferencia ? undefined : ayudaMonto(transferencia)} disabled={bloqueado}
            onChange={(e) => setTransferencia(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Boton className="min-w-0" onClick={() => todoEn('efectivo')} disabled={bloqueado}>Todo efectivo</Boton>
          <Boton className="min-w-0" onClick={() => todoEn('transferencia')} disabled={bloqueado}>Todo transferencia</Boton>
        </div>
        {reparto.valido && !montosMal && reparto.sentido !== 'justo' && (
          <AvisoEstado tono="ambar" titulo={`Cobra ${textoDiferenciaCobro(reparto.diferencia)}`}>
            Lo pagado suma {pesos(reparto.pagado)} y lo calculado es {pesos(totales.total)}. Se puede marcar pagado igual.
          </AvisoEstado>
        )}
      </div>
      {error && <AvisoEstado tono="rojo" titulo="No se pudo completar">{error}</AvisoEstado>}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {pago && (
          <Boton variante="peligro" className="sm:mr-auto" onClick={() => setDescartando(true)} disabled={bloqueado}>
            Descartar borrador
          </Boton>
        )}
        <Boton onClick={() => void guardar()} disabled={bloqueado || totales.negativo || montosMal}>Guardar borrador</Boton>
        <Boton variante="primario" onClick={() => setConfirmando(true)} disabled={bloqueado || totales.negativo || montosMal || !reparto.valido}>
          {ocupado ? 'Guardando…' : 'Marcar pagado'}
        </Boton>
      </div>
      {!reparto.valido && <p className="text-center text-xs text-texto-secundario">Cargá cuánto se paga en efectivo o por transferencia para poder marcar el pago.</p>}
      <Modal open={descartando} onClose={() => setDescartando(false)} title="Descartar borrador">
        <div className="space-y-4">
          <p className="text-sm text-texto-primario">¿Descartar el borrador de {empleado.nombre}? Se pierde lo cargado en este pago.</p>
          <p className="text-sm text-texto-secundario">La semana vuelve a quedar sin pago. Las faltas y adelantos siguen pendientes.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Boton onClick={() => setDescartando(false)}>Volver</Boton>
            <Boton variante="peligro" onClick={() => void descartar()} disabled={ocupado}>Descartar borrador</Boton>
          </div>
        </div>
      </Modal>
      <Modal open={confirmando} onClose={() => setConfirmando(false)} title="Marcar como pagado">
        <div className="space-y-4">
          <p className="text-sm text-texto-primario">¿Marcar como pagado? Después no se puede modificar.</p>
          <p className="text-sm text-texto-secundario">{textoConfirmacion(empleado.nombre, montos)}</p>
          {reparto.sentido !== 'justo' && (
            <p className="text-sm text-tono-ambar-texto">Cobra {textoDiferenciaCobro(reparto.diferencia)} ({pesos(totales.total)}).</p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Boton onClick={() => setConfirmando(false)}>Cancelar</Boton>
            <Boton variante="primario" onClick={() => void pagar()}>Marcar pagado</Boton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
