import { MonitorSmartphone, Printer, Store, Wallet, type LucideIcon } from 'lucide-react'
import type { Configuracion } from '@/shared/lib/config'

// Las cuatro secciones de Configuración y los campos que guarda cada una.

export type SeccionId = 'local' | 'impresion' | 'pantallas' | 'pagos'

export interface DatosSeccion {
  id: SeccionId
  etiqueta: string
  icono: LucideIcon
  campos: (keyof Configuracion)[]
}

export const SECCIONES: DatosSeccion[] = [
  { id: 'local', etiqueta: 'Local', icono: Store, campos: ['nombre_local', 'direccion', 'telefono'] },
  { id: 'impresion', etiqueta: 'Impresión', icono: Printer, campos: ['modo_impresion', 'papel_mm', 'pie_ticket'] },
  { id: 'pantallas', etiqueta: 'Pantallas', icono: MonitorSmartphone, campos: ['cocina_activa'] },
  { id: 'pagos', etiqueta: 'Medios de pago', icono: Wallet, campos: ['medios_pago'] },
]

/** Valor en edición: el borrador si hay, si no el guardado. (null en el borrador es un valor.) */
export function valorDe<K extends keyof Configuracion>(
  config: Configuracion,
  borrador: Partial<Configuracion>,
  clave: K,
): Configuracion[K] {
  const b = borrador[clave]
  return b === undefined ? config[clave] : b
}

export function seccionConCambios(seccion: DatosSeccion, config: Configuracion, borrador: Partial<Configuracion>): boolean {
  return seccion.campos.some((k) => borrador[k] !== undefined && JSON.stringify(borrador[k]) !== JSON.stringify(config[k]))
}

export function sinCampos(borrador: Partial<Configuracion>, campos: (keyof Configuracion)[]): Partial<Configuracion> {
  const copia = { ...borrador }
  for (const k of campos) delete copia[k]
  return copia
}

export interface PropsSeccion {
  config: Configuracion
  borrador: Partial<Configuracion>
  onCambiar: (cambios: Partial<Configuracion>) => void
  /** Se llama cuando el guardado salió bien (la página limpia el borrador). */
  onGuardado: () => void
  /** true si no se pudo leer la configuración: no se deja guardar. */
  bloqueado: boolean
}
