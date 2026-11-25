import { create } from 'zustand'

// Estado del menú lateral (desde lg): expandido o recogido en un riel de íconos.
// Es una preferencia de este aparato (localStorage), no va a la base. Si no hay nada
// guardado, arranca recogido en pantallas angostas (tablet, < 1280 px) y expandido en compu.

const CLAVE = 'sgp.menu.recogido'
const ANCHO_COMPU = 1280

function leer(): boolean {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado === 'si') return true
    if (guardado === 'no') return false
  } catch {
    // Sin almacenamiento: se decide por el ancho de pantalla
  }
  return typeof window !== 'undefined' && window.innerWidth < ANCHO_COMPU
}

function guardar(valor: boolean): void {
  try {
    localStorage.setItem(CLAVE, valor ? 'si' : 'no')
  } catch {
    // Sin almacenamiento (modo privado, etc.): vale solo hasta recargar
  }
}

interface MenuStore {
  recogido: boolean
  alternar: () => void
}

export const useMenu = create<MenuStore>((set, get) => ({
  recogido: leer(),
  alternar: () => {
    const siguiente = !get().recogido
    guardar(siguiente)
    set({ recogido: siguiente })
  },
}))
