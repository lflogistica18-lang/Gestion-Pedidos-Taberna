import { cn } from '@/shared/lib/cn'

export type PestanaProductos = 'activos' | 'inactivos' | 'categorias'

const PESTANAS: { clave: PestanaProductos; etiqueta: string }[] = [
  { clave: 'activos', etiqueta: 'Activos' },
  { clave: 'inactivos', etiqueta: 'Inactivos' },
  { clave: 'categorias', etiqueta: 'Categorías' },
]

interface Props {
  valor: PestanaProductos
  onCambiar: (p: PestanaProductos) => void
}

/** Pestañas subrayadas de 44 px de alto. */
export function PestanasProductos({ valor, onCambiar }: Props) {
  return (
    <div role="tablist" aria-label="Secciones de productos" className="flex gap-1 border-b border-borde-sutil">
      {PESTANAS.map(p => {
        const activa = p.clave === valor
        return (
          <button
            key={p.clave}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onCambiar(p.clave)}
            className={cn(
              '-mb-px inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-acento-primario',
              activa
                ? 'border-acento-primario text-acento-primario'
                : 'border-transparent text-texto-secundario hover:text-texto-primario',
            )}
          >
            {p.etiqueta}
          </button>
        )
      })}
    </div>
  )
}
