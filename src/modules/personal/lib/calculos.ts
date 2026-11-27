// Lógica pura del módulo Personal: semanas de pago, monto de cada ítem, estado por
// empleada y propuesta de ítems. Sin pantalla ni base de datos, para poder probarla.
// Las fechas son texto AAAA-MM-DD y se calculan en UTC (sin corrimiento por zona).

import type {
  ConceptoPago, Empleado, ModoConcepto, NovedadPersonal, PagoPersonal, TipoConcepto,
} from '@/types/database.types'

export interface Semana {
  /** Primer día (el día siguiente al día de pago anterior). */
  desde: string
  /** Último día: el día de pago. */
  hasta: string
}

export type EstadoEmpleada = 'por_pagar' | 'con_adelanto' | 'al_dia'

/** Ítem de un pago, antes de guardarlo. `monto` ya viene calculado. */
export interface ItemPropuesto {
  concepto_id: string | null
  nombre: string
  tipo: TipoConcepto
  modo: ModoConcepto
  valor: number
  cantidad: number
  monto: number
  novedad_id: string | null
}

export interface Propuesta {
  items: ItemPropuesto[]
  /** Novedades que quedan descontadas en este pago (se les pone pago_id al marcar pagado). */
  novedadIds: string[]
  /** De esas, las inasistencias (el ítem de faltas no apunta a una sola novedad). */
  faltaIds: string[]
}

export interface Totales {
  extras: number
  descuentos: number
  total: number
  /** true si los descuentos superan lo que cobra: la base lo rechaza. */
  negativo: boolean
}

// ─── Fechas ──────────────────────────────────────────────────────────

const MS_DIA = 86_400_000

function aUtc(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}

function deUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function sumarDias(fecha: string, dias: number): string {
  return deUtc(aUtc(fecha) + dias * MS_DIA)
}

/** 0 = domingo … 6 = sábado. */
export function diaDeSemana(fecha: string): number {
  return new Date(aUtc(fecha)).getUTCDay()
}

/** Hoy en la hora de Argentina, como AAAA-MM-DD. */
export function hoyArgentina(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(ahora)
}

function semanaQueTermina(hasta: string): Semana {
  return { desde: sumarDias(hasta, -6), hasta }
}

/** Semana de pago que contiene la fecha: termina en el primer día de pago desde esa fecha. */
export function semanaDePago(fecha: string, diaPago: number): Semana {
  const falta = (diaPago - diaDeSemana(fecha) + 7) % 7
  return semanaQueTermina(sumarDias(fecha, falta))
}

/**
 * Semana vencida: la última que terminó en un día de pago ya llegado. Si hoy es día de
 * pago, esa semana cuenta como vencida desde las 00:00.
 */
export function semanaVencida(hoy: string, diaPago: number): Semana {
  const pasaron = (diaDeSemana(hoy) - diaPago + 7) % 7
  return semanaQueTermina(sumarDias(hoy, -pasaron))
}

/** Corre una semana n semanas (negativo = hacia atrás). */
export function moverSemana(semana: Semana, n: number): Semana {
  return { desde: sumarDias(semana.desde, 7 * n), hasta: sumarDias(semana.hasta, 7 * n) }
}

// ─── Montos ──────────────────────────────────────────────────────────

/** Monto en pesos enteros de un ítem según el modo del concepto. */
export function montoItem(
  modo: ModoConcepto,
  valor: number,
  cantidad: number,
  sueldoSemanal: number,
  diasPorSemana: number,
): number {
  switch (modo) {
    case 'fijo': return Math.round(valor)
    case 'porcentaje': return Math.round((sueldoSemanal * valor) / 100)
    case 'por_unidad': return Math.round(valor * cantidad)
    case 'dias_de_sueldo': return Math.round((sueldoSemanal / diasPorSemana) * cantidad)
  }
}

export function calcularTotales(sueldoSemanal: number, items: Pick<ItemPropuesto, 'tipo' | 'monto'>[]): Totales {
  const extras = items.filter((i) => i.tipo === 'extra').reduce((s, i) => s + i.monto, 0)
  const descuentos = items.filter((i) => i.tipo === 'descuento').reduce((s, i) => s + i.monto, 0)
  const total = sueldoSemanal + extras - descuentos
  return { extras, descuentos, total, negativo: total < 0 }
}

/** Arma un ítem a partir de un concepto, con su monto ya calculado. */
export function itemDeConcepto(
  concepto: ConceptoPago,
  cantidad: number,
  empleado: Pick<Empleado, 'sueldo_semanal' | 'dias_por_semana'>,
  valorManual?: number,
): ItemPropuesto {
  // En "Monto fijo" sin valor cargado (ej. Adelanto) el monto se escribe en cada pago.
  const valor = concepto.modo === 'dias_de_sueldo' ? 0 : (valorManual ?? concepto.valor)
  return {
    concepto_id: concepto.id,
    nombre: concepto.nombre,
    tipo: concepto.tipo,
    modo: concepto.modo,
    valor,
    cantidad,
    monto: montoItem(concepto.modo, valor, cantidad, empleado.sueldo_semanal, empleado.dias_por_semana),
    novedad_id: null,
  }
}

// ─── Estado y propuesta ──────────────────────────────────────────────

/** Pagos que cuentan: los anulados no cuentan para el estado, el conteo ni el total. */
export function pagosVigentes<T extends Pick<PagoPersonal, 'estado'>>(pagos: T[]): T[] {
  return pagos.filter((p) => p.estado !== 'anulado')
}

/** Cuántas empleadas ya cobraron esa semana y cuánto se pagó en total (sin anulados). */
export function resumenSemana(
  empleados: Pick<Empleado, 'id'>[],
  pagos: Pick<PagoPersonal, 'empleado_id' | 'semana_desde' | 'estado' | 'total_a_cobrar'>[],
  semanaDesde: string,
): { pagadas: number; totalPagado: number } {
  let pagadas = 0
  let totalPagado = 0
  const vigentes = pagosVigentes(pagos)
  for (const e of empleados) {
    const pago = vigentes.find((p) => p.empleado_id === e.id && p.semana_desde === semanaDesde)
    if (pago?.estado === 'pagado') {
      pagadas += 1
      totalPagado += pago.total_a_cobrar
    }
  }
  return { pagadas, totalPagado }
}

export function estadoEmpleada(
  empleado: Pick<Empleado, 'id' | 'fecha_ingreso'>,
  vencida: Semana,
  pagos: Pick<PagoPersonal, 'empleado_id' | 'semana_desde' | 'estado'>[],
  novedades: Pick<NovedadPersonal, 'empleado_id' | 'tipo' | 'pago_id'>[],
): EstadoEmpleada {
  const empezoDespues = empleado.fecha_ingreso !== null && empleado.fecha_ingreso > vencida.hasta
  const pagada = pagos.some((p) => p.empleado_id === empleado.id && p.semana_desde === vencida.desde && p.estado === 'pagado')
  if (!empezoDespues && !pagada) return 'por_pagar'
  const conAdelanto = novedades.some((n) => n.empleado_id === empleado.id && n.tipo === 'adelanto' && n.pago_id === null)
  return conAdelanto ? 'con_adelanto' : 'al_dia'
}

/**
 * Ítems que se proponen solos al armar el pago de una semana: las inasistencias de esa
 * semana marcadas para descontar (un solo ítem, con la cantidad de faltas) y los adelantos
 * todavía sin descontar hasta el fin de la semana (un ítem por adelanto).
 */
export function proponerItems(
  empleado: Pick<Empleado, 'id' | 'sueldo_semanal' | 'dias_por_semana'>,
  conceptos: ConceptoPago[],
  novedades: NovedadPersonal[],
  semana: Semana,
): Propuesta {
  const propias = novedades.filter((n) => n.empleado_id === empleado.id && n.pago_id === null && n.deleted_at === null)
  const faltas = propias.filter((n) => n.tipo === 'inasistencia' && n.descontar && n.fecha >= semana.desde && n.fecha <= semana.hasta)
  const adelantos = propias.filter((n) => n.tipo === 'adelanto' && n.fecha <= semana.hasta && (n.monto ?? 0) > 0)

  const activos = conceptos.filter((c) => c.deleted_at === null)
  const conceptoFalta = activos.find((c) => c.tipo === 'descuento' && c.modo === 'dias_de_sueldo' && c.nombre === 'Inasistencia')
    ?? activos.find((c) => c.tipo === 'descuento' && c.modo === 'dias_de_sueldo')
  const conceptoAdelanto = activos.find((c) => c.tipo === 'descuento' && c.nombre === 'Adelanto')

  const items: ItemPropuesto[] = []
  if (faltas.length > 0) {
    items.push({
      concepto_id: conceptoFalta?.id ?? null,
      nombre: conceptoFalta?.nombre ?? 'Inasistencia',
      tipo: 'descuento',
      modo: 'dias_de_sueldo',
      valor: 0,
      cantidad: faltas.length,
      monto: montoItem('dias_de_sueldo', 0, faltas.length, empleado.sueldo_semanal, empleado.dias_por_semana),
      novedad_id: null,
    })
  }
  for (const a of adelantos) {
    const monto = Math.round(a.monto ?? 0)
    items.push({
      concepto_id: conceptoAdelanto?.id ?? null,
      nombre: conceptoAdelanto?.nombre ?? 'Adelanto',
      tipo: 'descuento',
      modo: 'fijo',
      valor: monto,
      cantidad: 1,
      monto,
      novedad_id: a.id,
    })
  }
  return {
    items,
    novedadIds: [...faltas, ...adelantos].map((n) => n.id),
    faltaIds: faltas.map((n) => n.id),
  }
}

/**
 * Novedades que de verdad se descuentan, mirando los ítems que quedaron en el pago
 * (la persona pudo quitar el adelanto o las faltas de la propuesta).
 */
export function novedadesDescontadas(items: ItemPropuesto[], propuesta: Propuesta): string[] {
  const adelantos = propuesta.novedadIds.filter((id) => !propuesta.faltaIds.includes(id) && items.some((i) => i.novedad_id === id))
  const hayFaltas = items.some((i) => i.tipo === 'descuento' && i.modo === 'dias_de_sueldo')
  return hayFaltas ? [...propuesta.faltaIds, ...adelantos] : adelantos
}

/** Texto de aviso si lo propuesto deja el total en negativo; null si está bien. */
export function avisoTotalNegativo(sueldoSemanal: number, items: ItemPropuesto[]): string | null {
  return calcularTotales(sueldoSemanal, items).negativo
    ? 'Los descuentos superan lo que cobra la empleada esa semana: revisá los montos antes de guardar.'
    : null
}
