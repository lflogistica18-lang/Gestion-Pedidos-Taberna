import { useEffect, useState } from 'react'

// Reloj en tiempo real. Es el único componente que se vuelve a dibujar cada
// segundo: el estado vive acá adentro para no arrastrar a la barra ni al layout.
export function Reloj() {
  const [ahora, setAhora] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const hora = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
  const fecha = ahora.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' })

  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="text-lg font-extrabold tabular-nums text-texto-primario">{hora}</span>
      <span className="text-[11px] font-semibold capitalize text-texto-secundario">{fecha}</span>
    </div>
  )
}
