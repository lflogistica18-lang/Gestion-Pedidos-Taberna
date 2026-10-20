// Estado de error — con boton para reintentar

import { AvisoEstado, Boton } from '@/shared/components/panel'

interface Props {
  mensaje: string
  onReintentar: () => void
}

export function EstadoError({ mensaje, onReintentar }: Props) {
  return (
    <div className="px-4 py-8">
      <AvisoEstado
        tono="rojo"
        titulo="Ocurrió un error"
        accion={<Boton variante="contorneado" onClick={onReintentar}>Reintentar</Boton>}
      >
        {mensaje}
      </AvisoEstado>
    </div>
  )
}
