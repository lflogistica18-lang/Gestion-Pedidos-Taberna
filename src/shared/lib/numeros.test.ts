import { describe, expect, it } from 'vitest'
import { leerNumeroAR } from './numeros'

describe('leerNumeroAR', () => {
  it('el punto es de miles', () => {
    expect(leerNumeroAR('200.000')).toBe(200000)
    expect(leerNumeroAR('1.234.567')).toBe(1234567)
  })
  it('la coma es decimal', () => {
    expect(leerNumeroAR('1.234.567,5')).toBe(1234567.5)
    expect(leerNumeroAR('12,5')).toBe(12.5)
    expect(leerNumeroAR('0,25')).toBe(0.25)
  })
  it('enteros simples', () => {
    expect(leerNumeroAR('1500')).toBe(1500)
    expect(leerNumeroAR(' 7 ')).toBe(7)
  })
  it('caso ambiguo: un punto con 1 o 2 dígitos es decimal', () => {
    expect(leerNumeroAR('12.5')).toBe(12.5)
    expect(leerNumeroAR('12.50')).toBe(12.5)
    expect(leerNumeroAR('1500.5')).toBe(1500.5)
  })
  it('vacío y basura dan null', () => {
    expect(leerNumeroAR('')).toBeNull()
    expect(leerNumeroAR('   ')).toBeNull()
    expect(leerNumeroAR('abc')).toBeNull()
    expect(leerNumeroAR('12,5,3')).toBeNull()
    expect(leerNumeroAR('1.2.3')).toBeNull()
    expect(leerNumeroAR('12.5555')).toBeNull()
    expect(leerNumeroAR('-5')).toBeNull()
    expect(leerNumeroAR(',')).toBeNull()
  })
})
