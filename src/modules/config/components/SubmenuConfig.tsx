import { FiltrosPastilla } from '@/shared/components/panel'
import { cn } from '@/shared/lib/cn'
import { SECCIONES, type SeccionId } from '../secciones'

interface SubmenuConfigProps {
  activa: SeccionId
  onElegir: (id: SeccionId) => void
}

// Desde lg: submenú en tarjeta a la izquierda. Debajo de lg: pastillas arriba.
export function SubmenuConfig({ activa, onElegir }: SubmenuConfigProps) {
  return (
    <>
      <FiltrosPastilla
        className="lg:hidden"
        etiqueta="Secciones de configuración"
        opciones={SECCIONES.map((s) => ({ value: s.id, label: s.etiqueta }))}
        value={activa}
        onChange={onElegir}
      />
      <nav aria-label="Secciones de configuración" className="hidden rounded-xl border border-borde-sutil bg-bg-tarjeta p-2 shadow-tarjeta lg:block">
        <ul className="space-y-1">
          {SECCIONES.map((s) => {
            const Icono = s.icono
            const esActiva = s.id === activa
            return (
              <li key={s.id}>
                <button
                  type="button"
                  aria-current={esActiva ? 'page' : undefined}
                  onClick={() => onElegir(s.id)}
                  className={cn(
                    'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acento-primario',
                    esActiva ? 'bg-acento-primario/10 text-acento-primario' : 'text-texto-primario hover:bg-bg-principal',
                  )}
                >
                  <Icono size={18} aria-hidden="true" />
                  {s.etiqueta}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
