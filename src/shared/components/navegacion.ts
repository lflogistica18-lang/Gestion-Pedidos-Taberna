// Lista única de ítems de navegación: la usan NavBar (celu), MenuLateral (≥ lg)
// y BarraSuperior (para mostrar la ruta de la pantalla actual).
// Depende de la configuración del local (Cocina visible o no).

import { BarChart3, ChefHat, ClipboardList, Package, Settings, ShoppingCart, type LucideIcon } from 'lucide-react'
import { useConfiguracion } from '@/shared/store/useConfiguracion'

export type SeccionMenu = 'operacion' | 'gestion' | 'ajustes'

export interface ItemNavegacion {
  to: string
  label: string
  icono: LucideIcon
  seccion: SeccionMenu
  /** false: no entra en la barra de abajo del celu (se llega desde el menú de usuario). */
  enBarraInferior?: boolean
}

export function itemsNavegacion(cocinaActiva: boolean): ItemNavegacion[] {
  return [
    { to: '/pos', label: 'Caja', icono: ShoppingCart, seccion: 'operacion' },
    ...(cocinaActiva ? [{ to: '/kds', label: 'Cocina', icono: ChefHat, seccion: 'operacion' } satisfies ItemNavegacion] : []),
    { to: '/products', label: 'Productos', icono: Package, seccion: 'gestion' },
    { to: '/orders', label: 'Historial', icono: ClipboardList, seccion: 'gestion' },
    { to: '/reports', label: 'Reportes', icono: BarChart3, seccion: 'gestion' },
    { to: '/config', label: 'Configuración', icono: Settings, seccion: 'ajustes', enBarraInferior: false },
  ]
}

/** Ítems según la configuración actual del local. */
export function useItemsNavegacion(): ItemNavegacion[] {
  const cocinaActiva = useConfiguracion((s) => s.config.cocina_activa)
  return itemsNavegacion(cocinaActiva)
}

export const TITULOS_SECCION: Record<SeccionMenu, string> = {
  operacion: 'Operación',
  gestion: 'Gestión',
  ajustes: 'Ajustes',
}

function itemDeRuta(items: ItemNavegacion[], pathname: string): ItemNavegacion | undefined {
  return items.find((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))
}

/** Título de la pantalla según la ruta; vacío si la ruta no está en la lista. */
export function tituloDeRuta(items: ItemNavegacion[], pathname: string): string {
  return itemDeRuta(items, pathname)?.label ?? ''
}

/** Sección del menú ("Operación", "Gestión") de la ruta; vacío si no está en la lista. */
export function seccionDeRuta(items: ItemNavegacion[], pathname: string): string {
  const item = itemDeRuta(items, pathname)
  return item ? TITULOS_SECCION[item.seccion] : ''
}
