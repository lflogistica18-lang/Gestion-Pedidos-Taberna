// =============================================================================
// toast.helpers.ts — Avisos breves (toasts) sin contexto: un almacén simple que
// se puede llamar desde cualquier lado con `mostrarToast(texto, tono)`.
// El <ContenedorToasts/> (montado una vez en Layout) los dibuja.
// =============================================================================

export type TonoToast = 'exito' | 'error' | 'info'

export interface ItemToast {
  id: number
  texto: string
  tono: TonoToast
}

const DURACION_MS = 4000

let siguienteId = 0
let items: ItemToast[] = []
const oyentes = new Set<() => void>()

function avisar() {
  oyentes.forEach((oyente) => oyente())
}

export function mostrarToast(texto: string, tono: TonoToast = 'exito'): void {
  const id = siguienteId++
  items = [...items, { id, texto, tono }]
  avisar()
  setTimeout(() => cerrarToast(id), DURACION_MS)
}

export function cerrarToast(id: number): void {
  items = items.filter((t) => t.id !== id)
  avisar()
}

/** Para useSyncExternalStore. */
export function suscribirToasts(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => { oyentes.delete(oyente) }
}

export function leerToasts(): ItemToast[] {
  return items
}
