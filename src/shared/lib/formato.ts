/**
 * formato.ts — cómo se muestran los montos, porcentajes y fechas en pantalla.
 *
 * QUÉ HACE: ocho funciones puras, sin dependencias (solo `Intl`, que ya trae el navegador y Node):
 * `pesos`, `pesosDesdeCentavos`, `dolares`, `porcentaje`, `fechaCorta`, `fechaHora`, `diaCorto` y
 * `tiempoRelativo`. Todo en castellano de Argentina: punto de miles, coma decimal, DD/MM/AAAA y hora
 * de `America/Argentina/Buenos_Aires` (fija, para que el resultado no dependa de la zona de la máquina
 * ni del servidor).
 *
 * POR QUÉ EXISTE: regla de tres (CONVENCIONES.md, Patrón G). El relevamiento del 2026-10-09 encontró
 * 10 copias del formato de moneda en 6 proyectos, con 4 variantes de la misma idea (con o sin
 * decimales, "$-500" o "−$500", "$ 500" con espacio, `style: 'currency'`), y 3 de fecha corta (una con
 * `date-fns`). Cada variante muestra el mismo número un poco distinto según la pantalla.
 *
 * REGLA: los montos se formatean SOLO AL MOSTRAR. Nunca se guardan ni se calculan ya formateados:
 * se calcula con números (en centavos enteros, CONVENCIONES sección 13) y recién en la última línea,
 * la que arma el texto para la pantalla, el PDF o el mensaje, se llama a estas funciones.
 *
 * Nunca lanzan: es formato de pantalla. Un dato que no se puede mostrar (NaN, Infinity, null,
 * undefined, fecha inválida) devuelve "—" (o el `vacio` que se pase en las fechas).
 */

const SIN_DATO = '—'
/** Signo menos tipográfico (U+2212): se ve igual de ancho que el +, a diferencia del guion. */
const MENOS = '−'
const ZONA = 'America/Argentina/Buenos_Aires'

type Fecha = string | Date | null | undefined

const esNumero = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

// ---------------------------------------------------------------------------
// Números
// ---------------------------------------------------------------------------

const formateadoresNumero = new Map<number, Intl.NumberFormat>()

/** Número positivo con punto de miles y coma decimal, con exactamente `decimales` decimales. */
function numeroEsAr(valor: number, decimales: number): string {
  let f = formateadoresNumero.get(decimales)
  if (!f) {
    f = new Intl.NumberFormat('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
    formateadoresNumero.set(decimales, f)
  }
  return f.format(valor)
}

/**
 * Arma "signo + prefijo + número" para un valor ya validado. El signo sale del número REDONDEADO:
 * -0,4 mostrado sin decimales es "$0", no "−$0".
 */
function conSigno(valor: number, decimales: number, antes: string, despues: string, conMas: boolean): string {
  const texto = numeroEsAr(Math.abs(valor), decimales)
  const esCero = !/[1-9]/.test(texto)
  const signo = esCero ? '' : valor < 0 ? MENOS : conMas ? '+' : ''
  return `${signo}${antes}${texto}${despues}`
}

export interface OpcionesPesos {
  /** 0 = siempre sin decimales (redondea); 2 = siempre dos; 'auto' (default) = dos solo si los hay. */
  decimales?: 0 | 2 | 'auto'
  /** true = antepone "+" a los positivos (para variaciones: "+$1.200"). */
  signo?: boolean
}

/**
 * Pesos argentinos: `pesos(118500)` → "$118.500"; `pesos(-118500)` → "−$118.500";
 * `pesos(1250.5)` → "$1.250,50"; `pesos(1250.5, { decimales: 0 })` → "$1.251".
 */
export function pesos(monto: number | null | undefined, opciones: OpcionesPesos = {}): string {
  if (!esNumero(monto)) return SIN_DATO
  const { decimales = 'auto', signo = false } = opciones
  // En 'auto' se mira el monto ya redondeado a dos decimales: 10,001 se muestra "$10".
  const dec = decimales === 'auto' ? (Number.isInteger(Number(Math.abs(monto).toFixed(2))) ? 0 : 2) : decimales
  return conSigno(monto, dec, '$', '', signo)
}

/**
 * Igual que `pesos`, pero el dato viene en centavos enteros (como se guardan los movimientos y
 * saldos, CONVENCIONES sección 13): `pesosDesdeCentavos(11850000)` → "$118.500".
 */
export function pesosDesdeCentavos(centavos: number | null | undefined, opciones: OpcionesPesos = {}): string {
  if (!esNumero(centavos)) return SIN_DATO
  return pesos(centavos / 100, opciones)
}

/** Dólares, siempre con dos decimales: `dolares(12.5)` → "USD 12,50". */
export function dolares(monto: number | null | undefined): string {
  if (!esNumero(monto)) return SIN_DATO
  return conSigno(monto, 2, 'USD ', '', false)
}

/** Porcentaje con cantidad fija de decimales: `porcentaje(12.5, 1)` → "12,5%"; `porcentaje(12.5)` → "13%". */
export function porcentaje(n: number | null | undefined, decimales = 0): string {
  if (!esNumero(n)) return SIN_DATO
  return conSigno(n, decimales, '', '%', false)
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/

interface DiaCalendario {
  anio: number
  mes: number
  dia: number
}

interface Leida {
  instante: Date
  /** Presente solo si el dato era una fecha sin hora (AAAA-MM-DD): ese día se muestra tal cual. */
  soloFecha: DiaCalendario | null
}

/** Interpreta AAAA-MM-DD a mano (sin pasar por `Date` en UTC, que en Argentina cae al día anterior). */
function leerSoloFecha(texto: string): DiaCalendario | null {
  const m = SOLO_FECHA.exec(texto)
  if (!m) return null
  const anio = Number(m[1])
  const mes = Number(m[2])
  const dia = Number(m[3])
  const control = new Date(Date.UTC(anio, mes - 1, dia))
  // Rechaza 2026-02-31, 2026-13-01, etc.: Date los "corrige" corriendo el día.
  if (control.getUTCFullYear() !== anio || control.getUTCMonth() !== mes - 1 || control.getUTCDate() !== dia) return null
  return { anio, mes, dia }
}

/** Acepta Date, AAAA-MM-DD, ISO con hora y el formato de Postgres ("2026-10-07 02:30:00+00"). */
function leer(valor: Fecha): Leida | null {
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : { instante: valor, soloFecha: null }
  }
  if (typeof valor !== 'string') return null
  const texto = valor.trim()
  if (texto === '') return null

  if (SOLO_FECHA.test(texto)) {
    const d = leerSoloFecha(texto)
    // Mediodía UTC: cae en el mismo día calendario en cualquier zona.
    return d ? { instante: new Date(Date.UTC(d.anio, d.mes - 1, d.dia, 12)), soloFecha: d } : null
  }

  const normalizado = texto
    .replace(/^(\d{4}-\d{2}-\d{2}) (\d)/, '$1T$2') // "2026-10-07 02:30" → "2026-10-07T02:30"
    .replace(/(T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)([+-]\d{2})$/, '$1$2:00') // "+00" → "+00:00"
  const instante = new Date(normalizado)
  return Number.isNaN(instante.getTime()) ? null : { instante, soloFecha: null }
}

const formateadoresFecha = new Map<string, Intl.DateTimeFormat>()

function formateadorFecha(zona: string): Intl.DateTimeFormat {
  let f = formateadoresFecha.get(zona)
  if (!f) {
    f = new Intl.DateTimeFormat('es-AR', {
      timeZone: zona,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    formateadoresFecha.set(zona, f)
  }
  return f
}

interface Partes {
  semana: string
  dia: string
  mes: string
  anio: string
  hora: string
  minuto: string
  soloFecha: boolean
}

function partes(valor: Fecha): Partes | null {
  const leida = leer(valor)
  if (!leida) return null
  // Una fecha sin hora se mira en UTC (a mediodía, ver `leer`); un momento, en la hora de Argentina.
  const zona = leida.soloFecha ? 'UTC' : ZONA
  const p: Record<string, string> = {}
  for (const parte of formateadorFecha(zona).formatToParts(leida.instante)) p[parte.type] = parte.value
  return {
    semana: (p.weekday ?? '').replace(/\.$/, '').toLowerCase(),
    dia: p.day ?? '',
    mes: p.month ?? '',
    anio: p.year ?? '',
    hora: p.hour ?? '',
    minuto: p.minute ?? '',
    soloFecha: leida.soloFecha !== null,
  }
}

/**
 * DD/MM/AAAA. `fechaCorta('2026-10-07')` → "07/10/2026" (ese día, sin corrimiento por zona);
 * `fechaCorta('2026-10-07T02:30:00Z')` → "06/10/2026" (en Argentina todavía era el 6, 23:30).
 * Inválido o vacío → `vacio`.
 */
export function fechaCorta(valor: Fecha, vacio = SIN_DATO): string {
  const p = partes(valor)
  return p ? `${p.dia}/${p.mes}/${p.anio}` : vacio
}

/**
 * DD/MM/AAAA HH:MM en hora de Argentina: `fechaHora('2026-10-07T17:35:00Z')` → "07/10/2026 14:35".
 * Si el dato es una fecha sin hora (AAAA-MM-DD) devuelve solo la fecha: inventar "00:00" confunde.
 */
export function fechaHora(valor: Fecha, vacio = SIN_DATO): string {
  const p = partes(valor)
  if (!p) return vacio
  const fecha = `${p.dia}/${p.mes}/${p.anio}`
  return p.soloFecha ? fecha : `${fecha} ${p.hora}:${p.minuto}`
}

/** Día de la semana abreviado y DD/MM: `diaCorto('2026-10-07')` → "mié 07/10". */
export function diaCorto(valor: Fecha, vacio = SIN_DATO): string {
  const p = partes(valor)
  return p ? `${p.semana} ${p.dia}/${p.mes}` : vacio
}

/**
 * "recién" (menos de 1 min, o una hora que viene del futuro por reloj desfasado), "hace 3 min",
 * "hace 2 h", "hace 5 d". `ahora` se pasa en los tests; en la app se deja el default.
 * Una fecha sin hora cuenta desde la medianoche de Argentina.
 */
export function tiempoRelativo(valor: Fecha, ahora: Date = new Date()): string {
  const leida = leer(valor)
  if (!leida || Number.isNaN(ahora.getTime())) return SIN_DATO
  const d = leida.soloFecha
  const instante = d ? Date.UTC(d.anio, d.mes - 1, d.dia, 3) : leida.instante.getTime() // 00:00 en UTC-3
  const minutos = Math.floor((ahora.getTime() - instante) / 60_000)
  if (minutos < 1) return 'recién'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  return `hace ${Math.floor(horas / 24)} d`
}
