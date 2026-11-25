import { registerSW } from 'virtual:pwa-register'

const CADA_30_MIN = 30 * 60 * 1000
const MINIMO_ENTRE_CHEQUEOS = 5 * 60 * 1000

/**
 * Registra el service worker y busca versiones nuevas de la app.
 * En modo autoUpdate la página se recarga sola cuando el SW nuevo toma el control.
 * Si algo falla, la app sigue funcionando igual.
 */
export function actualizarApp(): void {
  try {
    registerSW({
      immediate: true,
      onRegisteredSW(_urlSw, registration) {
        if (!registration) return
        let ultimoChequeo = Date.now()

        const chequear = () => {
          ultimoChequeo = Date.now()
          registration.update().catch((e) => {
            console.warn('[SGP] No se pudo buscar actualización:', e)
          })
        }

        setInterval(chequear, CADA_30_MIN)

        document.addEventListener('visibilitychange', () => {
          if (
            document.visibilityState === 'visible' &&
            Date.now() - ultimoChequeo >= MINIMO_ENTRE_CHEQUEOS
          ) {
            chequear()
          }
        })
      },
      onRegisterError(error) {
        console.warn('[SGP] No se pudo registrar el service worker:', error)
      },
    })
  } catch (e) {
    console.warn('[SGP] Error al iniciar la actualización automática:', e)
  }
}
