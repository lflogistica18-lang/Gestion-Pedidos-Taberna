import { useState } from 'react'
import { Users } from 'lucide-react'
import { EstadoCargando } from '@/shared/components/comunes/EstadoCargando'
import { EstadoError } from '@/shared/components/comunes/EstadoError'
import { EncabezadoPagina } from '@/shared/components/panel'
import { cn } from '@/shared/lib/cn'
import { ConceptosTab } from './components/ConceptosTab'
import { EmpleadasTab } from './components/EmpleadasTab'
import { SemanaTab } from './components/SemanaTab'
import { useConceptos } from './hooks/useConceptos'
import { useEmpleados } from './hooks/useEmpleados'

type Pestana = 'semana' | 'empleadas' | 'conceptos'

const PESTANAS: { clave: Pestana; etiqueta: string }[] = [
  { clave: 'semana', etiqueta: 'Semana' },
  { clave: 'empleadas', etiqueta: 'Empleadas' },
  { clave: 'conceptos', etiqueta: 'Conceptos' },
]

export default function PersonalPage() {
  const [pestana, setPestana] = useState<Pestana>('semana')
  const emp = useEmpleados()
  const con = useConceptos()

  const pestanas = (
    <div role="tablist" aria-label="Secciones de personal" className="flex flex-wrap gap-1 border-b border-borde-sutil">
      {PESTANAS.map((p) => {
        const activa = p.clave === pestana
        return (
          <button
            key={p.clave}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => setPestana(p.clave)}
            className={cn(
              '-mb-px inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-acento-primario',
              activa ? 'border-acento-primario text-acento-primario' : 'border-transparent text-texto-secundario hover:text-texto-primario',
            )}
          >
            {p.etiqueta}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
      <EncabezadoPagina
        icono={<Users size={22} />}
        titulo="Personal"
        detalle="Pagos semanales, extras, descuentos y recibos"
        pestanas={pestanas}
      />
      {pestana === 'semana' && (
        emp.error
          ? <EstadoError mensaje={emp.error} onReintentar={() => void emp.recargar()} />
          : emp.cargando || con.cargando
            ? <EstadoCargando />
            : con.error
              ? <EstadoError mensaje={con.error} onReintentar={() => void con.recargar()} />
              : <SemanaTab empleados={emp.empleados} conceptos={con.conceptos} />
      )}
      {pestana === 'empleadas' && (
        <EmpleadasTab
          empleados={emp.empleados}
          cargando={emp.cargando}
          error={emp.error}
          onRecargar={() => void emp.recargar()}
          onCrear={emp.crear}
          onEditar={emp.editar}
          onCambiarActiva={emp.cambiarActiva}
        />
      )}
      {pestana === 'conceptos' && (
        <ConceptosTab
          conceptos={con.conceptos}
          cargando={con.cargando}
          error={con.error}
          onRecargar={() => void con.recargar()}
          onGuardar={con.guardar}
          onCambiarActivo={con.cambiarActivo}
        />
      )}
    </div>
  )
}
