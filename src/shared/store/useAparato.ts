import { create } from 'zustand'

// PROVISORIO-WIFI: sacar este store entero el día que haya impresora WiFi (todos los aparatos imprimen igual).
// Opción por aparato: ¿este celu/tablet/compu imprime los tickets? Es local (localStorage),
// no pasa por sgp.configuracion. Por defecto sí: si no hay nada guardado, todo funciona como siempre.

const CLAVE = 'sgp.aparato.imprime'

function leer(): boolean {
  try {
    return localStorage.getItem(CLAVE) !== 'no'
  } catch {
    return true
  }
}

function guardar(valor: boolean): void {
  try {
    localStorage.setItem(CLAVE, valor ? 'si' : 'no')
  } catch {
    // Sin almacenamiento (modo privado, etc.): la opción vale solo hasta recargar
  }
}

interface AparatoStore {
  imprimeAca: boolean
  setImprimeAca: (v: boolean) => void
}

export const useAparato = create<AparatoStore>((set) => ({
  imprimeAca: leer(),
  setImprimeAca: (v) => {
    guardar(v)
    set({ imprimeAca: v })
  },
}))
