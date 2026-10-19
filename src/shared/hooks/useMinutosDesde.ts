import { useEffect, useState } from 'react'

// Minutos transcurridos desde una fecha ISO, actualizados cada 30 s.
// Leer Date.now() en el render es impuro (React Compiler lo rechaza) y además
// dejaba el "15m" congelado hasta el próximo re-render.
export function useMinutosDesde(iso: string): number {
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), 30_000)
    return () => clearInterval(intervalo)
  }, [])

  return Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 60000))
}
