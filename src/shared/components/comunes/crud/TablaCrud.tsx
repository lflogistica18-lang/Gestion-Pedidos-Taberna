import { cn } from '@/shared/lib/cn'
import { Pastilla } from '@/shared/components/panel'
import type { EntidadBase } from '@/shared/types/base'
import { estaInactivo, type ColumnaCrud } from './tipos'
import { FilaAcciones } from './FilaAcciones'

interface Props<T extends EntidadBase> {
  datos: T[]
  columnas: ColumnaCrud<T>[]
  onEditar: (item: T) => void
  onCambiarEstado: (item: T) => void
}

/** Desde md una tabla; debajo de md, una tarjeta por registro. */
export function TablaCrud<T extends EntidadBase>({ datos, columnas, onEditar, onCambiarEstado }: Props<T>) {
  const [principal, ...resto] = columnas
  return (
    <div className="overflow-hidden rounded-xl border border-borde-sutil bg-bg-tarjeta shadow-tarjeta">
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-borde-sutil bg-superficie-2 text-xs uppercase tracking-wide text-texto-secundario">
            {columnas.map(c => (
              <th key={c.clave} scope="col" className={cn('px-4 py-3 font-semibold', c.alinear === 'der' ? 'text-right' : 'text-left')}>
                {c.titulo}
              </th>
            ))}
            <th scope="col" className="px-4 py-3 text-right font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {datos.map(item => {
            const inactivo = estaInactivo(item)
            return (
              <tr key={item.id} className={cn('border-b border-borde-sutil last:border-b-0 hover:bg-bg-principal', inactivo && 'text-texto-secundario')}>
                {columnas.map((c, i) => (
                  <td key={c.clave} className={cn('px-4 py-2', c.alinear === 'der' && 'text-right tabular-nums', i === 0 && !inactivo && 'font-medium text-texto-primario')}>
                    {i === 0 && inactivo ? (
                      <span className="flex flex-wrap items-center gap-2">{c.render(item)}<Pastilla tono="neutro">Inactivo</Pastilla></span>
                    ) : c.render(item)}
                  </td>
                ))}
                <td className="px-2 py-1">
                  <FilaAcciones inactivo={inactivo} onEditar={() => onEditar(item)} onCambiarEstado={() => onCambiarEstado(item)} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <ul className="divide-y divide-borde-sutil md:hidden">
        {datos.map(item => {
          const inactivo = estaInactivo(item)
          return (
            <li key={item.id} className={cn('p-4', inactivo && 'text-texto-secundario')}>
              <div className="flex items-start justify-between gap-2">
                <div className={cn('min-w-0 break-words font-medium', !inactivo && 'text-texto-primario')}>
                  {principal.render(item)}
                  {inactivo && <span className="ml-2 align-middle"><Pastilla tono="neutro">Inactivo</Pastilla></span>}
                </div>
                <FilaAcciones inactivo={inactivo} onEditar={() => onEditar(item)} onCambiarEstado={() => onCambiarEstado(item)} />
              </div>
              <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {resto.map(c => (
                  <div key={c.clave} className="min-w-0">
                    <dt className="text-xs text-texto-secundario">{c.titulo}</dt>
                    <dd className={cn('break-words', !inactivo && 'text-texto-primario')}>{c.render(item)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
