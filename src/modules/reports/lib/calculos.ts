// Cálculos puros de la pantalla Caja (sin red ni React), para poder probarlos solos.
// CRÍTICO: todo en hora local; nunca toISOString() para claves de día u hora.

export interface PedidoMinimo {
  created_at: string
  total: number | string | null
}

export interface PuntoAcumulado {
  etiqueta: string
  valor: number
}

/**
 * Ventas acumuladas por hora local de UN día. Arranca en 0 una hora antes del primer
 * pedido y sube con cada pedido hasta `hastaHora` (por defecto, la hora del último pedido).
 * Sin pedidos devuelve [].
 */
export function acumuladoPorHora(pedidos: PedidoMinimo[], hastaHora?: number): PuntoAcumulado[] {
  if (pedidos.length === 0) return []
  const porHora = new Array<number>(24).fill(0)
  let primera = 23
  let ultima = 0
  for (const p of pedidos) {
    const h = new Date(p.created_at).getHours()
    porHora[h] += Number(p.total) || 0
    if (h < primera) primera = h
    if (h > ultima) ultima = h
  }
  const fin = Math.min(23, Math.max(hastaHora ?? ultima, ultima))
  const inicio = Math.max(0, primera - 1)
  const puntos: PuntoAcumulado[] = []
  let acumulado = 0
  for (let h = inicio; h <= fin; h++) {
    acumulado += porHora[h]
    puntos.push({ etiqueta: `${h} h`, valor: acumulado })
  }
  return puntos
}

export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const

export interface PromedioDia {
  etiqueta: string
  valor: number
  esMax: boolean
}

/**
 * Promedio de ventas por día de la semana, ordenado Lun → Dom.
 * Promedio = total de ese día de la semana ÷ cuántas veces ese día cae entre
 * `desde` y `hasta` (inclusive, fechas locales). Así un día sin ventas cuenta como 0.
 */
export function promedioPorDiaSemana(pedidos: PedidoMinimo[], desde: Date, hasta: Date): PromedioDia[] {
  const totales = new Array<number>(7).fill(0) // índice 0 = Lunes
  const cantidad = new Array<number>(7).fill(0)
  const indiceLun = (d: Date) => (d.getDay() + 6) % 7

  const cursor = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate())
  const fin = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate())
  while (cursor <= fin) {
    cantidad[indiceLun(cursor)] += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  for (const p of pedidos) {
    totales[indiceLun(new Date(p.created_at))] += Number(p.total) || 0
  }
  const promedios = totales.map((t, i) => (cantidad[i] > 0 ? t / cantidad[i] : 0))
  const max = Math.max(...promedios)
  return promedios.map((valor, i) => ({
    etiqueta: DIAS_CORTOS[i],
    valor,
    esMax: max > 0 && valor === max,
  }))
}
