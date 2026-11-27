import { describe, expect, it } from 'vitest'
import type { ConceptoPago, Empleado, NovedadPersonal } from '@/types/database.types'
import {
  avisoTotalNegativo, calcularTotales, novedadesDescontadas, estadoEmpleada, hoyArgentina, itemDeConcepto, montoItem,
  moverSemana, proponerItems, semanaDePago, semanaVencida, sumarDias,
} from './calculos'

const ANA: Empleado = {
  id: 'ana', nombre: 'Ana', telefono: null, sueldo_semanal: 200000, dias_por_semana: 6, fecha_ingreso: null,
  notas: null, active: true, created_at: '', updated_at: '', deleted_at: null,
}

function concepto(c: Partial<ConceptoPago> & Pick<ConceptoPago, 'id' | 'nombre' | 'tipo' | 'modo'>): ConceptoPago {
  return { valor: 0, active: true, created_at: '', updated_at: '', deleted_at: null, ...c }
}
const INASISTENCIA = concepto({ id: 'c-falta', nombre: 'Inasistencia', tipo: 'descuento', modo: 'dias_de_sueldo' })
const ADELANTO = concepto({ id: 'c-adel', nombre: 'Adelanto', tipo: 'descuento', modo: 'fijo' })
const HORA_EXTRA = concepto({ id: 'c-he', nombre: 'Hora extra', tipo: 'extra', modo: 'por_unidad', valor: 5000 })
const PRESENTISMO = concepto({ id: 'c-pre', nombre: 'Presentismo', tipo: 'extra', modo: 'porcentaje', valor: 10 })

function novedad(n: Partial<NovedadPersonal> & Pick<NovedadPersonal, 'id' | 'tipo' | 'fecha'>): NovedadPersonal {
  return {
    empleado_id: 'ana', detalle: '', monto: null, descontar: false, pago_id: null,
    created_at: '', updated_at: '', deleted_at: null, ...n,
  }
}

describe('semanas de pago', () => {
  it('la semana de pago va de dia_pago - 6 a dia_pago (viernes)', () => {
    // 2026-11-27 es viernes
    expect(semanaDePago('2026-11-27', 5)).toEqual({ desde: '2026-11-21', hasta: '2026-11-27' })
    expect(semanaDePago('2026-11-23', 5)).toEqual({ desde: '2026-11-21', hasta: '2026-11-27' })
    expect(semanaDePago('2026-11-28', 5)).toEqual({ desde: '2026-11-28', hasta: '2026-12-04' })
  })

  it('semana vencida: hoy es día de pago cuenta como vencida', () => {
    expect(semanaVencida('2026-11-27', 5)).toEqual({ desde: '2026-11-21', hasta: '2026-11-27' })
  })

  it('semana vencida: un día antes del día de pago es la anterior', () => {
    expect(semanaVencida('2026-11-26', 5)).toEqual({ desde: '2026-11-14', hasta: '2026-11-20' })
  })

  it('semana vencida: el día siguiente al pago sigue siendo la que terminó ayer', () => {
    expect(semanaVencida('2026-11-28', 5)).toEqual({ desde: '2026-11-21', hasta: '2026-11-27' })
  })

  it('semana que cruza de mes y de año', () => {
    expect(semanaDePago('2026-12-30', 5)).toEqual({ desde: '2026-12-26', hasta: '2027-01-01' })
    expect(semanaVencida('2026-12-31', 5)).toEqual({ desde: '2026-12-19', hasta: '2026-12-25' })
  })

  it('funciona con otro día de pago (domingo = 0)', () => {
    expect(semanaVencida('2026-11-27', 0)).toEqual({ desde: '2026-11-16', hasta: '2026-11-22' })
  })

  it('moverSemana y sumarDias', () => {
    expect(moverSemana({ desde: '2026-11-21', hasta: '2026-11-27' }, -1)).toEqual({ desde: '2026-11-14', hasta: '2026-11-20' })
    expect(moverSemana({ desde: '2026-12-26', hasta: '2027-01-01' }, 1)).toEqual({ desde: '2027-01-02', hasta: '2027-01-08' })
    expect(sumarDias('2026-02-27', 2)).toBe('2026-03-01')
  })

  it('hoyArgentina usa la hora de Argentina (UTC-3)', () => {
    expect(hoyArgentina(new Date('2026-11-27T02:30:00Z'))).toBe('2026-11-26')
    expect(hoyArgentina(new Date('2026-11-27T12:00:00Z'))).toBe('2026-11-27')
  })
})

describe('monto por modo', () => {
  it('fijo, porcentaje, por unidad y días de sueldo (Math.round)', () => {
    expect(montoItem('fijo', 15000, 1, 200000, 6)).toBe(15000)
    expect(montoItem('porcentaje', 10, 1, 200000, 6)).toBe(20000)
    expect(montoItem('por_unidad', 5000, 3, 200000, 6)).toBe(15000)
    expect(montoItem('dias_de_sueldo', 0, 1, 200000, 6)).toBe(33333)
    expect(montoItem('dias_de_sueldo', 0, 2, 200000, 6)).toBe(66667)
  })

  it('itemDeConcepto fuerza valor 0 en días de sueldo y toma el valor manual del monto fijo', () => {
    expect(itemDeConcepto(INASISTENCIA, 1, ANA, 999).valor).toBe(0)
    const adelanto = itemDeConcepto(ADELANTO, 1, ANA, 30000)
    expect(adelanto.valor).toBe(30000)
    expect(adelanto.monto).toBe(30000)
    expect(itemDeConcepto(PRESENTISMO, 1, ANA).monto).toBe(20000)
  })
})

describe('total del pago', () => {
  it('caso del diseño: $200.000, 1 falta descontada y 3 h extra a $5.000 = $181.667', () => {
    const items = [itemDeConcepto(INASISTENCIA, 1, ANA), itemDeConcepto(HORA_EXTRA, 3, ANA)]
    const t = calcularTotales(ANA.sueldo_semanal, items)
    expect(t.extras).toBe(15000)
    expect(t.descuentos).toBe(33333)
    expect(t.total).toBe(181667)
    expect(t.negativo).toBe(false)
  })

  it('avisa si el total queda negativo', () => {
    const items = [itemDeConcepto(ADELANTO, 1, ANA, 250000)]
    expect(calcularTotales(ANA.sueldo_semanal, items).negativo).toBe(true)
    expect(avisoTotalNegativo(ANA.sueldo_semanal, items)).toMatch(/superan/)
    expect(avisoTotalNegativo(ANA.sueldo_semanal, [])).toBeNull()
  })
})

describe('estado por empleada', () => {
  const vencida = { desde: '2026-11-21', hasta: '2026-11-27' }
  const pagoVencida = { empleado_id: 'ana', semana_desde: '2026-11-21', estado: 'pagado' as const }

  it('Semana por pagar si la vencida no tiene pago pagado', () => {
    expect(estadoEmpleada(ANA, vencida, [], [])).toBe('por_pagar')
    expect(estadoEmpleada(ANA, vencida, [{ ...pagoVencida, estado: 'borrador' }], [])).toBe('por_pagar')
    expect(estadoEmpleada(ANA, vencida, [{ ...pagoVencida, semana_desde: '2026-11-14' }], [])).toBe('por_pagar')
  })

  it('Con adelanto si está pagada pero hay un adelanto sin descontar', () => {
    const adel = [{ empleado_id: 'ana', tipo: 'adelanto' as const, pago_id: null }]
    expect(estadoEmpleada(ANA, vencida, [pagoVencida], adel)).toBe('con_adelanto')
    expect(estadoEmpleada(ANA, vencida, [pagoVencida], [{ ...adel[0], pago_id: 'p1' }])).toBe('al_dia')
  })

  it('Al día si está pagada y no hay adelantos', () => {
    expect(estadoEmpleada(ANA, vencida, [pagoVencida], [])).toBe('al_dia')
  })

  it('una empleada que entró después de la semana vencida no debe esa semana', () => {
    expect(estadoEmpleada({ ...ANA, fecha_ingreso: '2026-11-30' }, vencida, [], [])).toBe('al_dia')
  })
})

describe('ítems propuestos', () => {
  const semana = { desde: '2026-11-21', hasta: '2026-11-27' }
  const conceptos = [INASISTENCIA, ADELANTO, HORA_EXTRA]

  it('propone las inasistencias descontables de la semana y los adelantos sin pago', () => {
    const novedades = [
      novedad({ id: 'n1', tipo: 'inasistencia', fecha: '2026-11-23', descontar: true }),
      novedad({ id: 'n2', tipo: 'inasistencia', fecha: '2026-11-25', descontar: true }),
      novedad({ id: 'n3', tipo: 'inasistencia', fecha: '2026-11-24', descontar: false }),
      novedad({ id: 'n4', tipo: 'inasistencia', fecha: '2026-11-10', descontar: true }),
      novedad({ id: 'n5', tipo: 'adelanto', fecha: '2026-11-22', monto: 40000 }),
      novedad({ id: 'n6', tipo: 'adelanto', fecha: '2026-11-20', monto: 10000, pago_id: 'otro' }),
      novedad({ id: 'n7', tipo: 'adelanto', fecha: '2026-12-02', monto: 5000 }),
      novedad({ id: 'n8', tipo: 'inasistencia', fecha: '2026-11-26', descontar: true, empleado_id: 'otra' }),
    ]
    const p = proponerItems(ANA, conceptos, novedades, semana)
    expect(p.items).toHaveLength(2)
    expect(p.items[0]).toMatchObject({ nombre: 'Inasistencia', cantidad: 2, monto: 66667, valor: 0, concepto_id: 'c-falta' })
    expect(p.items[1]).toMatchObject({ nombre: 'Adelanto', monto: 40000, novedad_id: 'n5', concepto_id: 'c-adel' })
    expect(p.novedadIds).toEqual(['n1', 'n2', 'n5'])
  })

  it('novedadesDescontadas respeta lo que la persona quitó de la propuesta', () => {
    const novedades = [
      novedad({ id: 'n1', tipo: 'inasistencia', fecha: '2026-11-23', descontar: true }),
      novedad({ id: 'n5', tipo: 'adelanto', fecha: '2026-11-22', monto: 40000 }),
    ]
    const p = proponerItems(ANA, conceptos, novedades, semana)
    expect(novedadesDescontadas(p.items, p)).toEqual(['n1', 'n5'])
    expect(novedadesDescontadas(p.items.filter((i) => i.nombre !== 'Adelanto'), p)).toEqual(['n1'])
    expect(novedadesDescontadas(p.items.filter((i) => i.nombre !== 'Inasistencia'), p)).toEqual(['n5'])
    expect(novedadesDescontadas([], p)).toEqual([])
  })

  it('sin novedades no propone nada', () => {
    expect(proponerItems(ANA, conceptos, [], semana)).toEqual({ items: [], novedadIds: [], faltaIds: [] })
  })

  it('ignora novedades borradas', () => {
    const borrada = novedad({ id: 'n1', tipo: 'adelanto', fecha: '2026-11-22', monto: 1000, deleted_at: 'x' })
    expect(proponerItems(ANA, conceptos, [borrada], semana).items).toEqual([])
  })

  it('si se borraron los conceptos semilla, igual arma los ítems con el nombre por defecto', () => {
    const n = novedad({ id: 'n1', tipo: 'adelanto', fecha: '2026-11-22', monto: 1000 })
    expect(proponerItems(ANA, [], [n], semana).items[0]).toMatchObject({ nombre: 'Adelanto', concepto_id: null })
  })
})
