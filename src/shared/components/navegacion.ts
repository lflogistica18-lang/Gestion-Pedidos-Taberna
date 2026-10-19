// Lista única de ítems de navegación: la usan NavBar (celu), MenuLateral (≥ lg)
// y BarraSuperior (para mostrar el título de la pantalla actual).

import { BarChart3, ChefHat, ClipboardList, Package, ShoppingCart, type LucideIcon } from 'lucide-react'
import { COCINA_ACTIVA } from '@/shared/lib/config'

export type SeccionMenu = 'operacion' | 'gestion'

export interface ItemNavegacion {
  to: string
  label: string
  icono: LucideIcon
  seccion: SeccionMenu
}

export const ITEMS_NAVEGACION: ItemNavegacion[] = [
  { to: '/pos', label: 'Caja', icono: ShoppingCart, seccion: 'operacion' },
  ...(COCINA_ACTIVA ? [{ to: '/kds', label: 'Cocina', icono: ChefHat, seccion: 'operacion' } satisfies ItemNavegacion] : []),
  { to: '/products', label: 'Productos', icono: Package, seccion: 'gestion' },
  { to: '/orders', label: 'Historial', icono: ClipboardList, seccion: 'gestion' },
  { to: '/reports', label: 'Reportes', icono: BarChart3, seccion: 'gestion' },
]

export const TITULOS_SECCION: Record<SeccionMenu, string> = {
  operacion: 'Operación',
  gestion: 'Gestión',
}

function itemDeRuta(pathname: string): ItemNavegacion | undefined {
  return ITEMS_NAVEGACION.find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))
}

/** Título de la pantalla según la ruta; vacío si la ruta no está en la lista. */
export function tituloDeRuta(pathname: string): string {
  return itemDeRuta(pathname)?.label ?? ''
}

/** Sección del menú ("Operación", "Gestión") de la ruta; vacío si no está en la lista. */
export function seccionDeRuta(pathname: string): string {
  const item = itemDeRuta(pathname)
  return item ? TITULOS_SECCION[item.seccion] : ''
}
