import { useState } from 'react'
import { mostrarToast } from '@/shared/components/panel'
import { useConfiguracion } from '@/shared/store/useConfiguracion'
import type { Empleado, PagoPersonal } from '@/types/database.types'
import { usePagos } from './usePagos'

/**
 * Abre el recibo guardado de un pago (link temporal). Si el pago está pagado pero nunca
 * llegó a guardarse el PDF, lo genera, lo guarda y lo abre. Los errores salen en un aviso.
 */
export function useAbrirRecibo(alCambiar: () => void) {
  const { emitirRecibo, urlRecibo } = usePagos()
  const local = useConfiguracion((s) => s.config.nombre_local)
  const [ocupado, setOcupado] = useState(false)

  const abrirUrl = (url: string) => {
    // Sin "noopener" para poder detectar si el navegador bloqueó la ventana
    if (!window.open(url, '_blank')) window.location.assign(url)
  }

  const abrir = async (pago: PagoPersonal, empleado: Pick<Empleado, 'nombre'>) => {
    setOcupado(true)
    try {
      let ruta = pago.recibo_ruta
      if (!ruta) {
        const r = await emitirRecibo(pago, empleado, local)
        if (r.error || !r.ruta) {
          mostrarToast(r.error ?? 'No se pudo generar el recibo', 'error')
          return
        }
        ruta = r.ruta
        alCambiar()
      }
      const { error, url } = await urlRecibo(ruta)
      if (error || !url) {
        mostrarToast(`No se pudo abrir el recibo: ${error ?? 'sin enlace'}`, 'error')
        return
      }
      abrirUrl(url)
    } finally {
      setOcupado(false)
    }
  }

  return { abrir, ocupado }
}
