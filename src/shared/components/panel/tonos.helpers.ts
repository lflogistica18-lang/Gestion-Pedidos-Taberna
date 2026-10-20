// =============================================================================
// tonos.helpers.ts — Tonos de estado para las piezas "pálidas" (AvisoEstado,
// TarjetaDato, TarjetaDatoMini) y para la Pastilla. Fondo suave + borde + texto
// fuerte del mismo tono. Los colores salen de los tokens `tono-*` de index.css,
// así el tema oscuro los redefine. Las clases van completas y estáticas porque
// Tailwind no ve los template strings.
// =============================================================================

export type TonoAviso = 'rojo' | 'ambar' | 'amarillo' | 'verde' | 'neutro'

export interface ClasesTono {
  /** Fondo pálido de la pieza. */
  fondo: string
  /** Borde del tono. */
  borde: string
  /** Color fuerte para etiquetas chicas y títulos. */
  fuerte: string
  /** Color del valor grande de una tarjeta. */
  valor: string
  /** Color del ícono. */
  icono: string
}

export const CLASES_TONO: Record<TonoAviso, ClasesTono> = {
  rojo: { fondo: 'bg-tono-rojo-fondo', borde: 'border-tono-rojo-borde', fuerte: 'text-tono-rojo-texto', valor: 'text-tono-rojo-texto', icono: 'text-tono-rojo-solido' },
  ambar: { fondo: 'bg-tono-ambar-fondo', borde: 'border-tono-ambar-borde', fuerte: 'text-tono-ambar-texto', valor: 'text-tono-ambar-texto', icono: 'text-tono-ambar-solido' },
  amarillo: { fondo: 'bg-tono-amarillo-fondo', borde: 'border-tono-amarillo-borde', fuerte: 'text-tono-amarillo-texto', valor: 'text-tono-amarillo-texto', icono: 'text-tono-amarillo-solido' },
  verde: { fondo: 'bg-tono-verde-fondo', borde: 'border-tono-verde-borde', fuerte: 'text-tono-verde-texto', valor: 'text-tono-verde-texto', icono: 'text-tono-verde-solido' },
  neutro: { fondo: 'bg-bg-principal', borde: 'border-borde-sutil', fuerte: 'text-texto-secundario', valor: 'text-texto-primario', icono: 'text-texto-secundario' },
}

// Tonos de la pastilla: fondo + borde + texto del tono y el punto sólido.
export type TonoPastilla = 'rojo' | 'ambar' | 'amarillo' | 'naranja' | 'verde' | 'azul' | 'neutro'

export const CLASES_PASTILLA: Record<TonoPastilla, { pastilla: string; punto: string }> = {
  rojo: { pastilla: 'border-tono-rojo-borde bg-tono-rojo-fondo text-tono-rojo-texto', punto: 'bg-tono-rojo-solido' },
  ambar: { pastilla: 'border-tono-ambar-borde bg-tono-ambar-fondo text-tono-ambar-texto', punto: 'bg-tono-ambar-solido' },
  amarillo: { pastilla: 'border-tono-amarillo-borde bg-tono-amarillo-fondo text-tono-amarillo-texto', punto: 'bg-tono-amarillo-solido' },
  naranja: { pastilla: 'border-tono-naranja-borde bg-tono-naranja-fondo text-tono-naranja-texto', punto: 'bg-tono-naranja-solido' },
  verde: { pastilla: 'border-tono-verde-borde bg-tono-verde-fondo text-tono-verde-texto', punto: 'bg-tono-verde-solido' },
  azul: { pastilla: 'border-tono-azul-borde bg-tono-azul-fondo text-tono-azul-texto', punto: 'bg-tono-azul-solido' },
  neutro: { pastilla: 'border-tono-neutro-borde bg-tono-neutro-fondo text-tono-neutro-texto', punto: 'bg-tono-neutro-solido' },
}
