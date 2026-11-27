import { useState } from 'react'
import { Selector, mostrarToast } from '@/shared/components/panel'
import { useConfiguracion } from '@/shared/store/useConfiguracion'
import { DIAS_SEMANA } from '../lib/etiquetas'

/** Día de la semana en que se paga. Se guarda en la configuración del local. */
export function DiaDePago() {
  const diaPago = useConfiguracion((s) => s.config.dia_pago)
  const [guardando, setGuardando] = useState(false)

  const cambiar = async (valor: string) => {
    setGuardando(true)
    const { error } = await useConfiguracion.getState().guardar({ dia_pago: Number(valor) })
    setGuardando(false)
    if (error) mostrarToast(`No se pudo guardar el día de pago: ${error}`, 'error')
    else mostrarToast('Día de pago guardado', 'exito')
  }

  return (
    <div className="mb-4 rounded-xl border border-borde-sutil bg-bg-tarjeta p-4 shadow-tarjeta">
      <Selector
        etiqueta="Día de pago"
        ayuda="Cada semana de pago termina ese día. Las semanas ya guardadas no cambian."
        value={String(diaPago)}
        disabled={guardando}
        onChange={(e) => void cambiar(e.target.value)}
      >
        {DIAS_SEMANA.map((d, i) => <option key={d} value={i}>{d}</option>)}
      </Selector>
    </div>
  )
}
