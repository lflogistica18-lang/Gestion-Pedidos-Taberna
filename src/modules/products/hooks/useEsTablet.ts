import { useEffect, useState } from 'react'

const CONSULTA = '(min-width: 768px)'

/** true desde `md` (768 px): tablet y compu. Se actualiza si se gira o se achica la ventana. */
export function useEsTablet(): boolean {
  const [esTablet, setEsTablet] = useState(() => window.matchMedia(CONSULTA).matches)

  useEffect(() => {
    const mq = window.matchMedia(CONSULTA)
    const alCambiar = () => setEsTablet(mq.matches)
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [])

  return esTablet
}
