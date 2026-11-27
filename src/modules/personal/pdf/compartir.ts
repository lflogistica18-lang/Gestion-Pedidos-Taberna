/** Baja un archivo en el dispositivo (compu o celu). */
export function descargarArchivo(archivo: Blob, nombre: string): void {
  const url = URL.createObjectURL(archivo)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  // Se libera un rato después: algunos navegadores cancelan la descarga si la URL
  // desaparece en el mismo instante.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Comparte el PDF con el menú del celu (WhatsApp, etc.). Si el navegador no puede
 * compartir archivos, lo baja. Devuelve qué pasó; si la persona cancela, 'cancelado'.
 */
export async function compartirArchivo(archivo: Blob, nombre: string, titulo: string): Promise<'compartido' | 'descargado' | 'cancelado'> {
  const file = new File([archivo], nombre, { type: 'application/pdf' })
  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: titulo })
      return 'compartido'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelado'
      throw e
    }
  }
  descargarArchivo(archivo, nombre)
  return 'descargado'
}

export function nombreArchivoRecibo(empleada: string, semanaDesde: string): string {
  const limpio = empleada.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `recibo-${limpio || 'empleada'}-${semanaDesde}.pdf`
}
