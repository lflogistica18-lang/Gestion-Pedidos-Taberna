import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Boton } from '@/shared/components/panel'
import { CrudManager } from '@/shared/components/comunes/CrudManager'
import type { ColumnaCrud } from '@/shared/components/comunes/crud/tipos'
import { pesos } from '@/shared/lib/formato'
import type { CampoSchema } from '@/shared/types/base'
import type { Empleado } from '@/types/database.types'
import type { DatosEmpleado } from '../hooks/useEmpleados'
import { errorTopeMonto, leerNumero } from '../lib/etiquetas'

const CAMPOS: CampoSchema[] = [
  { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', obligatorio: true },
  { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'texto', placeholder: 'Para mandarle el recibo' },
  { nombre: 'sueldo_semanal', etiqueta: 'Sueldo semanal ($)', tipo: 'numero' },
  { nombre: 'dias_por_semana', etiqueta: 'Días que trabaja por semana', tipo: 'numero', sinMonto: true },
  { nombre: 'fecha_ingreso', etiqueta: 'Fecha de ingreso', tipo: 'fecha' },
  { nombre: 'notas', etiqueta: 'Notas', tipo: 'textarea' },
]

const COLUMNAS: ColumnaCrud<Empleado>[] = [
  {
    clave: 'nombre',
    titulo: 'Nombre',
    render: (e) => (
      <Link to={`/personal/${e.id}`} className="inline-flex min-h-11 items-center hover:text-acento-primario">{e.nombre}</Link>
    ),
  },
  { clave: 'sueldo_semanal', titulo: 'Sueldo semanal', alinear: 'der', render: (e) => pesos(e.sueldo_semanal) },
  { clave: 'dias_por_semana', titulo: 'Días por semana', alinear: 'der', render: (e) => String(e.dias_por_semana) },
]

function texto(v: unknown): string {
  return String(v ?? '').trim()
}

function validar(d: Record<string, unknown>): string | null {
  if (texto(d.nombre).length > 60) return 'El nombre puede tener hasta 60 letras'
  const sueldo = leerNumero(texto(d.sueldo_semanal))
  if (sueldo === null || sueldo < 0) return 'Escribí el sueldo semanal (puede ser 0 si todavía no lo definiste)'
  const tope = errorTopeMonto(sueldo, 'El sueldo semanal')
  if (tope) return tope
  const dias = leerNumero(texto(d.dias_por_semana))
  if (dias === null || !Number.isInteger(dias) || dias < 1 || dias > 7) return 'Los días por semana tienen que ser un número entre 1 y 7'
  if (texto(d.telefono).length > 40) return 'El teléfono es demasiado largo'
  if (texto(d.notas).length > 500) return 'Las notas pueden tener hasta 500 letras'
  return null
}

function aDatos(d: Partial<Empleado>): DatosEmpleado {
  return {
    nombre: texto(d.nombre),
    telefono: texto(d.telefono) || null,
    sueldo_semanal: leerNumero(texto(d.sueldo_semanal)) ?? 0,
    dias_por_semana: leerNumero(texto(d.dias_por_semana)) ?? 6,
    fecha_ingreso: texto(d.fecha_ingreso) || null,
    notas: texto(d.notas) || null,
  }
}

interface Props {
  empleados: Empleado[]
  cargando: boolean
  error: string | null
  onRecargar: () => void
  onCrear: (d: DatosEmpleado) => Promise<{ error: string | null }>
  onEditar: (id: string, d: DatosEmpleado) => Promise<{ error: string | null }>
  onCambiarActiva: (id: string) => Promise<{ error: string | null }>
}

export function EmpleadasTab({ empleados, cargando, error, onRecargar, onCrear, onEditar, onCambiarActiva }: Props) {
  const [creando, setCreando] = useState(false)
  return (
    <>
      <div className="mb-3 flex justify-end">
        <Boton variante="primario" onClick={() => setCreando(true)}><Plus size={16} />Nueva empleada</Boton>
      </div>
      <CrudManager<Empleado>
        nombreSingular="empleada"
        datos={empleados}
        campos={CAMPOS}
        columnas={COLUMNAS}
        cargando={cargando}
        error={error}
        creando={creando}
        onCerrarCrear={() => setCreando(false)}
        onPedirCrear={() => setCreando(true)}
        onCrear={(d) => onCrear(aDatos(d))}
        onEditar={(id, d) => onEditar(id, aDatos(d))}
        onDesactivar={onCambiarActiva}
        onRecargar={onRecargar}
        validar={validar}
      />
    </>
  )
}
