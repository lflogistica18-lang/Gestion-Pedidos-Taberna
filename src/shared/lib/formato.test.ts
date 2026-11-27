import { describe, it, expect } from 'vitest'
import {
  pesos,
  pesosDesdeCentavos,
  dolares,
  porcentaje,
  fechaCorta,
  fechaHora,
  diaCorto,
  tiempoRelativo,
} from './formato'

// Estos formatos aparecen en pantallas, PDF y mensajes de WhatsApp de varios proyectos. Si cambia
// uno, cambia lo que ve el cliente. Los tests de fecha NO dependen de la zona de la máquina: la
// función fija America/Argentina/Buenos_Aires (UTC-3, sin horario de verano).

describe('pesos', () => {
  it('formatea un entero sin decimales y con punto de miles', () => {
    expect(pesos(118500)).toBe('$118.500')
    expect(pesos(1250000)).toBe('$1.250.000')
  })

  it('en cuatro cifras también lleva el punto de miles', () => {
    expect(pesos(1234)).toBe('$1.234')
  })

  it('con decimales usa coma y dos dígitos', () => {
    expect(pesos(1250.5)).toBe('$1.250,50')
    expect(pesos(0.99)).toBe('$0,99')
  })

  it("'auto' (el default) muestra decimales solo si los hay, ya redondeado a dos", () => {
    expect(pesos(100)).toBe('$100')
    expect(pesos(100, { decimales: 'auto' })).toBe('$100')
    expect(pesos(100.25)).toBe('$100,25')
    expect(pesos(10.001)).toBe('$10')
  })

  it('decimales: 0 redondea y decimales: 2 fuerza dos dígitos', () => {
    expect(pesos(1250.5, { decimales: 0 })).toBe('$1.251')
    expect(pesos(1250.4, { decimales: 0 })).toBe('$1.250')
    expect(pesos(1250, { decimales: 2 })).toBe('$1.250,00')
  })

  it('un negativo lleva el signo menos tipográfico (U+2212) delante del $', () => {
    const r = pesos(-118500)
    expect(r).toBe('−$118.500')
    expect(r.startsWith('−')).toBe(true)
    expect(r).not.toContain('-')
  })

  it('un negativo que se redondea a cero no muestra signo', () => {
    expect(pesos(-0.4, { decimales: 0 })).toBe('$0')
    expect(pesos(-0)).toBe('$0')
  })

  it('signo: true antepone + a los positivos, no al cero ni a los negativos', () => {
    expect(pesos(1200, { signo: true })).toBe('+$1.200')
    expect(pesos(0, { signo: true })).toBe('$0')
    expect(pesos(-1200, { signo: true })).toBe('−$1.200')
  })

  it('NaN, Infinity, null y undefined dan "—" y no lanzan', () => {
    expect(pesos(NaN)).toBe('—')
    expect(pesos(Infinity)).toBe('—')
    expect(pesos(-Infinity)).toBe('—')
    expect(pesos(null)).toBe('—')
    expect(pesos(undefined)).toBe('—')
  })
})

describe('pesosDesdeCentavos', () => {
  it('divide por 100: los saldos se guardan en centavos enteros', () => {
    expect(pesosDesdeCentavos(11850000)).toBe('$118.500')
    expect(pesosDesdeCentavos(12345)).toBe('$123,45')
  })

  it('respeta las opciones de pesos y el negativo', () => {
    expect(pesosDesdeCentavos(12345, { decimales: 0 })).toBe('$123')
    expect(pesosDesdeCentavos(-5000)).toBe('−$50')
    expect(pesosDesdeCentavos(5000, { signo: true })).toBe('+$50')
  })

  it('un dato que no es número da "—"', () => {
    expect(pesosDesdeCentavos(NaN)).toBe('—')
    expect(pesosDesdeCentavos(null)).toBe('—')
    expect(pesosDesdeCentavos(undefined)).toBe('—')
  })
})

describe('dolares', () => {
  it('siempre con dos decimales y prefijo USD', () => {
    expect(dolares(12.5)).toBe('USD 12,50')
    expect(dolares(12)).toBe('USD 12,00')
    expect(dolares(1234.567)).toBe('USD 1.234,57')
  })

  it('un negativo lleva el signo menos tipográfico', () => {
    expect(dolares(-3)).toBe('−USD 3,00')
  })

  it('NaN y null dan "—"', () => {
    expect(dolares(NaN)).toBe('—')
    expect(dolares(null)).toBe('—')
  })
})

describe('porcentaje', () => {
  it('por defecto sin decimales', () => {
    expect(porcentaje(12)).toBe('12%')
    expect(porcentaje(12.5)).toBe('13%')
  })

  it('con decimales usa coma', () => {
    expect(porcentaje(12.5, 1)).toBe('12,5%')
    expect(porcentaje(12, 1)).toBe('12,0%')
  })

  it('un negativo lleva el signo menos tipográfico; NaN da "—"', () => {
    expect(porcentaje(-5)).toBe('−5%')
    expect(porcentaje(NaN)).toBe('—')
    expect(porcentaje(undefined)).toBe('—')
  })
})

describe('fechaCorta', () => {
  it('AAAA-MM-DD se muestra como ese día, sin corrimiento por zona horaria', () => {
    expect(fechaCorta('2026-10-07')).toBe('07/10/2026')
    expect(fechaCorta('2026-10-07')).not.toBe('06/10/2026')
    expect(fechaCorta('2026-01-01')).toBe('01/01/2026')
    expect(fechaCorta('2026-12-31')).toBe('31/12/2026')
  })

  it('un ISO en UTC se muestra en hora de Argentina (02:30Z del 7 es el 6 a las 23:30)', () => {
    expect(fechaCorta('2026-10-07T02:30:00Z')).toBe('06/10/2026')
    expect(fechaCorta('2026-10-07T03:00:00Z')).toBe('07/10/2026')
  })

  it('acepta el formato de Postgres (espacio y offset corto) y un Date', () => {
    expect(fechaCorta('2026-10-07 02:30:00+00')).toBe('06/10/2026')
    expect(fechaCorta('2026-10-07 14:00:00+00:00')).toBe('07/10/2026')
    expect(fechaCorta(new Date('2026-10-07T02:30:00Z'))).toBe('06/10/2026')
  })

  it('inválido, vacío, null o inexistente devuelve "—"', () => {
    expect(fechaCorta('no es una fecha')).toBe('—')
    expect(fechaCorta('')).toBe('—')
    expect(fechaCorta(null)).toBe('—')
    expect(fechaCorta(undefined)).toBe('—')
    expect(fechaCorta('2026-02-31')).toBe('—')
    expect(fechaCorta(new Date('basura'))).toBe('—')
  })

  it('inválido devuelve el texto de vacío que se pida', () => {
    expect(fechaCorta(null, 'Sin vencimiento')).toBe('Sin vencimiento')
    expect(fechaCorta('xx', '')).toBe('')
  })
})

describe('fechaHora', () => {
  it('muestra fecha y hora en Argentina', () => {
    expect(fechaHora('2026-10-07T17:35:00Z')).toBe('07/10/2026 14:35')
    expect(fechaHora('2026-10-07T02:30:00Z')).toBe('06/10/2026 23:30')
  })

  it('la medianoche es 00:00, nunca 24:00', () => {
    expect(fechaHora('2026-10-07T03:05:00Z')).toBe('07/10/2026 00:05')
  })

  it('una fecha sin hora devuelve solo la fecha; inválido devuelve el vacío', () => {
    expect(fechaHora('2026-10-07')).toBe('07/10/2026')
    expect(fechaHora(null)).toBe('—')
    expect(fechaHora('xx', 'sin dato')).toBe('sin dato')
  })
})

describe('diaCorto', () => {
  it('día de la semana abreviado en castellano, sin punto, y DD/MM', () => {
    expect(diaCorto('2026-10-07')).toBe('mié 07/10')
    expect(diaCorto('2026-10-04')).toBe('dom 04/10')
    expect(diaCorto('2026-10-10')).toBe('sáb 10/10')
  })

  it('con hora usa el día de Argentina', () => {
    expect(diaCorto('2026-10-07T02:30:00Z')).toBe('mar 06/10')
  })

  it('inválido devuelve el vacío', () => {
    expect(diaCorto('xx')).toBe('—')
    expect(diaCorto(undefined, '-')).toBe('-')
  })
})

describe('tiempoRelativo', () => {
  const ahora = new Date('2026-10-07T15:00:00Z')

  it('menos de un minuto es "recién"', () => {
    expect(tiempoRelativo('2026-10-07T14:59:30Z', ahora)).toBe('recién')
  })

  it('una hora del futuro (reloj desfasado) también es "recién"', () => {
    expect(tiempoRelativo('2026-10-07T15:05:00Z', ahora)).toBe('recién')
  })

  it('minutos, horas y días', () => {
    expect(tiempoRelativo('2026-10-07T14:57:00Z', ahora)).toBe('hace 3 min')
    expect(tiempoRelativo('2026-10-07T14:00:00Z', ahora)).toBe('hace 1 h')
    expect(tiempoRelativo('2026-10-07T13:00:00Z', ahora)).toBe('hace 2 h')
    expect(tiempoRelativo('2026-10-02T15:00:00Z', ahora)).toBe('hace 5 d')
  })

  it('inválido da "—" y no lanza', () => {
    expect(tiempoRelativo('xx', ahora)).toBe('—')
    expect(tiempoRelativo(null, ahora)).toBe('—')
    expect(tiempoRelativo('2026-10-07T14:00:00Z', new Date('basura'))).toBe('—')
  })
})
