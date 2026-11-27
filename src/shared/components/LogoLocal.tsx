import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useConfiguracion } from '@/shared/store/useConfiguracion'
import { cn } from '@/shared/lib/cn'

const LOGO_FIJO = '/logo-taberna.png'

interface LogoLocalProps {
  /** Clases de tamaño y forma (por ejemplo "size-8 rounded-lg"). */
  className?: string
  alt?: string
}

/**
 * Logo del local. Orden: el configurado (logo_url); si la configuración todavía no se
 * leyó (login, sin sesión) el de la ruta pública del bucket; y si no carga, el archivo fijo.
 */
export function LogoLocal({ className, alt = '' }: LogoLocalProps) {
  const cargada = useConfiguracion((s) => s.cargada)
  const logoUrl = useConfiguracion((s) => s.config.logo_url)
  const [fallo, setFallo] = useState<string | null>(null)

  const deseada = logoUrl ?? (cargada ? null : supabase.storage.from('sgp-logo').getPublicUrl('actual').data.publicUrl)
  const src = deseada && deseada !== fallo ? deseada : LOGO_FIJO

  return (
    <img
      src={src}
      alt={alt}
      className={cn('shrink-0 object-cover', className)}
      onError={() => {
        if (src !== LOGO_FIJO) setFallo(src)
      }}
    />
  )
}
