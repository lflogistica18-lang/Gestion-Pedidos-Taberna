// Configuración de funcionalidades de la app

// Pantalla de Cocina (KDS). Apagada: la cocina trabaja con el ticket impreso que
// sale al confirmar cada pedido, y la caja marca "Entregado" desde Pedidos.
// El código del KDS sigue en src/modules/kds/ — para volver a usarlo, poner true.
export const COCINA_ACTIVA = false

// Cómo sale el ticket al confirmar un pedido:
// - 'navegador': se abre el diálogo de imprimir del celu/tablet. Con RawBT
//   instalado, la comandera WiFi aparece ahí como impresora.
// - 'servidor': la app deja el ticket en la cola (sgp.print_jobs) y el print
//   server de la PC del local lo imprime solo (ver print-server/README.md).
//   Requiere la migración 011.
export type ModoImpresion = 'navegador' | 'servidor'
export const MODO_IMPRESION: ModoImpresion = 'navegador'
