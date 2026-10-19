import { Printer } from 'lucide-react'
import { AvisoEstado, Campo, ControlSegmentado, Entrada } from '@/shared/components/panel'
import type { ModoImpresion, PapelMm } from '@/shared/lib/config'
import { valorDe, type PropsSeccion } from '../secciones'
import { useGuardarSeccion } from '../hooks/useGuardarSeccion'
import { OpcionModoImpresion } from './OpcionModoImpresion'
import { TarjetaSeccion } from './TarjetaSeccion'
import { VistaPreviaTicket } from './VistaPreviaTicket'

const OPCIONES_PAPEL: { value: '80' | '58'; label: string }[] = [
  { value: '80', label: '80 mm' },
  { value: '58', label: '58 mm' },
]

export function SeccionImpresion({ config, borrador, onCambiar, onGuardado, bloqueado }: PropsSeccion) {
  const { guardando, guardar } = useGuardarSeccion(onGuardado)
  const modo = valorDe(config, borrador, 'modo_impresion')
  const papel = valorDe(config, borrador, 'papel_mm')
  const pie = valorDe(config, borrador, 'pie_ticket')
  const hayCambios = modo !== config.modo_impresion || papel !== config.papel_mm || pie !== config.pie_ticket

  function elegirModo(m: ModoImpresion) {
    onCambiar({ modo_impresion: m })
  }
  function elegirPapel(v: '80' | '58') {
    const p: PapelMm = v === '58' ? 58 : 80
    onCambiar({ papel_mm: p })
  }

  return (
    <TarjetaSeccion
      icono={<Printer size={16} />}
      titulo="Impresión"
      subtitulo="Cómo y en qué papel sale el ticket"
      hayCambios={hayCambios}
      guardando={guardando}
      motivoBloqueo={bloqueado ? 'Reintentá antes de guardar' : undefined}
      onGuardar={() => void guardar({ modo_impresion: modo, papel_mm: papel, pie_ticket: pie.trim() })}
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-6">
        <div className="min-w-0 space-y-5">
          <Campo etiqueta="Modo de impresión">
            <div role="radiogroup" aria-label="Modo de impresión" className="grid gap-2 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
              <OpcionModoImpresion
                titulo="Desde el celu (RawBT)"
                detalle="Se abre el diálogo de imprimir y se elige la comandera. No necesita compu."
                elegida={modo === 'navegador'}
                onElegir={() => elegirModo('navegador')}
              />
              <OpcionModoImpresion
                titulo="Print server en la compu"
                detalle="Sale solo al confirmar. La compu del local tiene que estar prendida con el programa abierto."
                elegida={modo === 'servidor'}
                onElegir={() => elegirModo('servidor')}
              />
            </div>
          </Campo>
          {modo === 'servidor' && (
            <AvisoEstado tono="ambar" titulo="Antes de activarlo">
              Instalá el print server en la compu (print-server/README.md) y aplicá la migración 011. Si no, los tickets van a quedar en la cola sin imprimirse.
            </AvisoEstado>
          )}
          <Campo etiqueta="Ancho del papel" ayuda="La mayoría de las comanderas son de 80 mm.">
            <ControlSegmentado opciones={OPCIONES_PAPEL} value={String(papel) === '58' ? '58' : '80'} onChange={elegirPapel} etiqueta="Ancho del papel" />
          </Campo>
          <Entrada
            etiqueta="Pie del ticket"
            maxLength={120}
            value={pie}
            onChange={(e) => onCambiar({ pie_ticket: e.target.value })}
            ayuda="Texto final, ej. ¡Gracias por su compra!"
          />
        </div>
        <VistaPreviaTicket nombreLocal={config.nombre_local} direccion={config.direccion} telefono={config.telefono} pie={pie} papel={papel} />
      </div>
    </TarjetaSeccion>
  )
}
