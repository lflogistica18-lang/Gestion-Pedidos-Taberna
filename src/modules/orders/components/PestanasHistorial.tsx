import { cn } from '@/shared/lib/cn'

export type PestanaHistorial = 'historial' | 'papelera'

interface Props {
  value: PestanaHistorial
  onChange: (value: PestanaHistorial) => void
  cantidadHistorial: number
  cantidadPapelera: number
}

export function PestanasHistorial({ value, onChange, cantidadHistorial, cantidadPapelera }: Props) {
  const items: { value: PestanaHistorial; label: string; cantidad: number }[] = [
    { value: 'historial', label: 'Historial', cantidad: cantidadHistorial },
    { value: 'papelera', label: 'Papelera', cantidad: cantidadPapelera },
  ]
  return (
    <div role="tablist" aria-label="Sección" className="flex gap-1 border-b border-borde-sutil">
      {items.map((it) => {
        const activa = it.value === value
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onChange(it.value)}
            className={cn(
              '-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-acento-primario',
              activa
                ? 'border-acento-primario text-acento-primario'
                : 'border-transparent text-texto-secundario hover:text-texto-primario',
            )}
          >
            {it.label}
            <span className={cn('text-xs font-semibold tabular-nums', activa ? 'text-acento-primario' : 'text-texto-secundario')}>
              {it.cantidad}
            </span>
          </button>
        )
      })}
    </div>
  )
}
