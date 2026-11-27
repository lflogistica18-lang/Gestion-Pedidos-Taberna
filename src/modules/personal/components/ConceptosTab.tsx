import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Boton } from '@/shared/components/panel'
import { CrudManager } from '@/shared/components/comunes/CrudManager'
import type { ColumnaCrud } from '@/shared/components/comunes/crud/tipos'
import type { CampoSchema } from '@/shared/types/base'
import type { ConceptoPago, ModoConcepto, TipoConcepto } from '@/types/database.types'
import type { DatosConcepto } from '../hooks/useConceptos'
import { ETIQUETA_MODO, ETIQUETA_TIPO, errorTopeMonto, leerNumero, textoValor } from '../lib/etiquetas'
import { DiaDePago } from './DiaDePago'

// CrudManager muestra los valores de un select tal cual: se le pasan ya en castellano
// ("Extra", "Monto fijo") y acá se traducen de ida y vuelta a los códigos de la base.
type ConceptoVista = Omit<ConceptoPago, 'tipo' | 'modo'> & { tipo: string; modo: string }

const TIPOS = Object.keys(ETIQUETA_TIPO) as TipoConcepto[]
const MODOS = Object.keys(ETIQUETA_MODO) as ModoConcepto[]
const codigoTipo = (etiqueta: string) => TIPOS.find((t) => ETIQUETA_TIPO[t] === etiqueta)
const codigoModo = (etiqueta: string) => MODOS.find((m) => ETIQUETA_MODO[m] === etiqueta)

const CAMPOS: CampoSchema[] = [
  { nombre: 'nombre', etiqueta: 'Nombre', tipo: 'texto', obligatorio: true, placeholder: 'Ej: Hora extra' },
  { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'select', obligatorio: true, opciones: TIPOS.map((t) => ETIQUETA_TIPO[t]) },
  { nombre: 'modo', etiqueta: 'Cómo se calcula', tipo: 'select', obligatorio: true, opciones: MODOS.map((m) => ETIQUETA_MODO[m]) },
  { nombre: 'valor', etiqueta: 'Valor ($, % o precio por unidad)', tipo: 'numero', sinMonto: true, placeholder: 'En "Días de sueldo" no se usa' },
]

const COLUMNAS: ColumnaCrud<ConceptoVista>[] = [
  { clave: 'nombre', titulo: 'Nombre', render: (c) => c.nombre },
  { clave: 'tipo', titulo: 'Tipo', render: (c) => c.tipo },
  { clave: 'modo', titulo: 'Cómo se calcula', render: (c) => c.modo },
  {
    clave: 'valor',
    titulo: 'Valor',
    alinear: 'der',
    render: (c) => textoValor(codigoModo(c.modo) ?? 'fijo', c.valor),
  },
]

function aDatos(d: Partial<ConceptoVista>): DatosConcepto {
  const modo = codigoModo(String(d.modo ?? '')) ?? 'fijo'
  return {
    nombre: String(d.nombre ?? '').trim(),
    tipo: codigoTipo(String(d.tipo ?? '')) ?? 'extra',
    modo,
    // En "Días de sueldo" el valor se fuerza a 0 (la base lo exige)
    valor: modo === 'dias_de_sueldo' ? 0 : (leerNumero(String(d.valor ?? '')) ?? 0),
  }
}

function validar(d: Record<string, unknown>): string | null {
  if (String(d.nombre ?? '').trim().length > 40) return 'El nombre puede tener hasta 40 letras'
  const modo = codigoModo(String(d.modo ?? ''))
  if (modo === 'dias_de_sueldo') return null
  const valor = leerNumero(String(d.valor ?? ''))
  if (valor === null || valor < 0) return 'Escribí el valor (un número, cero o mayor)'
  if (modo === 'porcentaje' && valor > 100) return 'Un porcentaje del sueldo no puede pasar de 100'
  if (modo !== 'porcentaje') {
    const tope = errorTopeMonto(valor, 'El valor')
    if (tope) return tope
  }
  return null
}

interface Props {
  conceptos: ConceptoPago[]
  cargando: boolean
  error: string | null
  onRecargar: () => void
  onGuardar: (d: DatosConcepto, id?: string) => Promise<{ error: string | null }>
  onCambiarActivo: (id: string) => Promise<{ error: string | null }>
}

export function ConceptosTab({ conceptos, cargando, error, onRecargar, onGuardar, onCambiarActivo }: Props) {
  const [creando, setCreando] = useState(false)
  const vista: ConceptoVista[] = conceptos.map((c) => ({ ...c, tipo: ETIQUETA_TIPO[c.tipo], modo: ETIQUETA_MODO[c.modo] }))
  return (
    <>
      <DiaDePago />
      <div className="mb-3 flex justify-end">
        <Boton variante="primario" onClick={() => setCreando(true)}><Plus size={16} />Nuevo concepto</Boton>
      </div>
      <CrudManager<ConceptoVista>
        nombreSingular="concepto"
        datos={vista}
        campos={CAMPOS}
        columnas={COLUMNAS}
        cargando={cargando}
        error={error}
        creando={creando}
        onCerrarCrear={() => setCreando(false)}
        onPedirCrear={() => setCreando(true)}
        onCrear={(d) => onGuardar(aDatos(d))}
        onEditar={(id, d) => onGuardar(aDatos(d), id)}
        onDesactivar={onCambiarActivo}
        onRecargar={onRecargar}
        validar={validar}
      />
    </>
  )
}
