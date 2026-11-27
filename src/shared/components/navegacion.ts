// Lista única de ítems de navegación: la usan NavBar (celu), MenuLateral (≥ lg)
// y BarraSuperior (para mostrar la ruta de la pantalla actual).
// Depende de la configuración del local (Cocina visible o no) y del rol
// (el rol solo pedidos no ve Caja, Cocina, Productos ni Configuración).

import { ChefHat, ClipboardList, Package, PlusCircle, Settings, Users, Wallet, type LucideIcon } from 'lucide-react'
import { useConfiguracion } from '@/shared/store/useConfiguracion'
import { useAuth } from '@/modules/auth/hooks/useAuth'

export type SeccionMenu = 'operacion' | 'gestion' | 'ajustes'

export interface ItemNavegacion {
  to: string
  label: string
  icono: LucideIcon
  seccion: SeccionMenu
  /** false: no entra en la barra de abajo del celu (se llega desde el menú de usuario). */
  enBarraInferior?: boolean
  /** true: lo ve solo el admin (el rol solo pedidos no). */
  soloAdmin?: boolean
}

export function itemsNavegacion(cocinaActiva: boolean, esAdmin: boolean): ItemNavegacion[] {
  const todos: ItemNavegacion[] = [
    { to: '/reports', label: 'Caja', icono: Wallet, seccion: 'operacion', soloAdmin: true },
    { to: '/pos', label: 'Pedido +', icono: PlusCircle, seccion: 'operacion' },
    ...(cocinaActiva ? [{ to: '/kds', label: 'Cocina', icono: ChefHat, seccion: 'operacion', soloAdmin: true } satisfies ItemNavegacion] : []),
    { to: '/orders', label: 'Historial', icono: ClipboardList, seccion: 'gestion' },
    { to: '/products', label: 'Productos', icono: Package, seccion: 'gestion', soloAdmin: true },
    { to: '/personal', label: 'Personal', icono: Users, seccion: 'gestion', enBarraInferior: false, soloAdmin: true },
    { to: '/config', label: 'Configuración', icono: Settings, seccion: 'ajustes', enBarraInferior: false, soloAdmin: true },
  ]
  return esAdmin ? todos : todos.filter((i) => !i.soloAdmin)
}

/** Ítems según la configuración actual del local. */
export function useItemsNavegacion(): ItemNavegacion[] {
  const cocinaActiva = useConfiguracion((s) => s.config.cocina_activa)
  const { esAdmin } = useAuth()
  return itemsNavegacion(cocinaActiva, esAdmin)
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
