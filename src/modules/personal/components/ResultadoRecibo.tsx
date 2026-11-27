import { Download, FileText, Share2 } from 'lucide-react'
import { AvisoEstado, Boton, mostrarToast } from '@/shared/components/panel'
import { pesos } from '@/shared/lib/formato'
import type { PagoPersonal } from '@/types/database.types'
import { compartirArchivo, descargarArchivo, nombreArchivoRecibo } from '../pdf/compartir'

interface Props {
  pago: PagoPersonal
  empleada: string
  /** El PDF armado (para compartir o bajar); null si todavía no hay. */
  recibo: Blob | null
  errorRecibo: string | null
  generando: boolean
  /** Aviso que queda fijo (ej. no se pudieron marcar las novedades como descontadas). */
  aviso?: string | null
  onGenerar: () => void
  onCerrar: () => void
}

/** Pantalla que queda después de marcar pagado: el pago ya está registrado. */
export function ResultadoRecibo({ pago, empleada, recibo, errorRecibo, generando, aviso, onGenerar, onCerrar }: Props) {
  const nombre = nombreArchivoRecibo(empleada, pago.semana_desde)

  const compartir = async () => {
    if (!recibo) return
    try {
      const r = await compartirArchivo(recibo, nombre, `Recibo de ${empleada}`)
      if (r === 'descargado') mostrarToast('Tu navegador no comparte archivos: se bajó el recibo', 'info')
    } catch (e) {
      mostrarToast(`No se pudo compartir: ${e instanceof Error ? e.message : 'error desconocido'}`, 'error')
    }
  }

  return (
    <div className="space-y-4">
      <AvisoEstado tono="verde" titulo="Pago registrado">
        {empleada} cobra {pesos(pago.total_a_cobrar)}.
      </AvisoEstado>
      {aviso && <AvisoEstado tono="ambar" titulo="Falta marcar novedades">{aviso}</AvisoEstado>}
      {errorRecibo && (
        <AvisoEstado tono="rojo" titulo="No se pudo guardar el recibo">
          {errorRecibo} El pago ya quedó registrado: podés generar el recibo de nuevo.
        </AvisoEstado>
      )}
      <div className="flex flex-col gap-2">
        {recibo && !errorRecibo ? (
          <>
            <Boton variante="primario" onClick={() => void compartir()}><Share2 size={16} />Compartir</Boton>
            <Boton onClick={() => descargarArchivo(recibo, nombre)}><Download size={16} />Bajar</Boton>
          </>
        ) : (
          <Boton variante="primario" onClick={onGenerar} disabled={generando}>
            <FileText size={16} />{generando ? 'Generando…' : 'Generar recibo'}
          </Boton>
        )}
        <Boton onClick={onCerrar}>Cerrar</Boton>
      </div>
    </div>
  )
}
