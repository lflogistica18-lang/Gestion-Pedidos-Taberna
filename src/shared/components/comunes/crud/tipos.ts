import type { ReactNode } from 'react'

/** Columna de la lista de CrudManager. La primera es la "principal": en celu hace de título de la tarjeta. */
export interface ColumnaCrud<T> {
  clave: string
  titulo: string
  /** Números y montos van a la derecha. */
  alinear?: 'der'
  render: (item: T) => ReactNode
}

/** Un registro puede estar inactivo (`active === false`): la lista lo atenúa y ofrece "Activar". */
export function estaInactivo(item: object): boolean {
  return 'active' in item && item.active === false
}
