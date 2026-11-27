// Arma el recibo PDF en el navegador. react-pdf pesa: se carga recién al generar un
// recibo (import dinámico), no al abrir la app. Fuente Helvetica de base (sin archivos).

import type { DatosRecibo } from './tipos'

export async function generarRecibo(datos: DatosRecibo): Promise<Blob> {
  const [{ pdf }, { ReciboPdf }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./ReciboPdf'),
  ])
  return pdf(ReciboPdf({ datos })).toBlob()
}
