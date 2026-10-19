// Cálculo de fechas del período del dashboard.
// CRÍTICO: NO usar toISOString() — retorna UTC y en AR (UTC-3) a las 21hs ya es el día siguiente.

export type PeriodoPreset = 'hoy' | 'ayer' | '7' | '30' | 'elegir'

export function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function restarDias(date: Date, dias: number): Date {
  const r = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  r.setDate(r.getDate() - dias)
  return r
}

/** Rango [desde, hasta] como 'YYYY-MM-DD' locales para un preset (para 'elegir' devuelve el rango elegido). */
export function rangoDePreset(
  preset: PeriodoPreset,
  hoy: Date,
  elegido: { desde: string; hasta: string },
): { desde: string; hasta: string } {
  switch (preset) {
    case 'hoy':
      return { desde: toDateStr(hoy), hasta: toDateStr(hoy) }
    case 'ayer': {
      const ayer = toDateStr(restarDias(hoy, 1))
      return { desde: ayer, hasta: ayer }
    }
    case '7':
      return { desde: toDateStr(restarDias(hoy, 6)), hasta: toDateStr(hoy) }
    case '30':
      return { desde: toDateStr(restarDias(hoy, 29)), hasta: toDateStr(hoy) }
    case 'elegir':
      return elegido
  }
}

function ddmm(str: string): string {
  const [, m, d] = str.split('-')
  return `${d}/${m}`
}

/** "hoy", "ayer", "los últimos 7 días", "del 01/10 al 15/10"... para "Ventas de ...". */
export function periodoEnPalabras(preset: PeriodoPreset, desde: string, hasta: string): string {
  if (preset === 'hoy') return 'hoy'
  if (preset === 'ayer') return 'ayer'
  if (preset === '7') return 'los últimos 7 días'
  if (preset === '30') return 'los últimos 30 días'
  if (desde === hasta) return `el ${ddmm(desde)}`
  return `del ${ddmm(desde)} al ${ddmm(hasta)}`
}
