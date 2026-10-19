import { cargarConfig } from './config.js';
import { iniciarCola } from './cola.js';

const cfg = cargarConfig();
console.log(`\n🖨️  Servidor de impresión — ${cfg.nombreLocal}`);

let detener: (() => Promise<void>) | null = null;
let cerrando = false;

async function cerrar(senal: string): Promise<void> {
  if (cerrando) return;
  cerrando = true;
  console.log(`\nRecibida señal ${senal}, cerrando...`);
  try {
    await detener?.();
  } catch (e) {
    console.error('Error al cerrar:', e);
  }
  process.exit(0);
}
process.on('SIGINT', () => void cerrar('SIGINT'));
process.on('SIGTERM', () => void cerrar('SIGTERM'));

// Si pasa algo inesperado, salimos con error: iniciar.bat lo reinicia solo.
process.on('uncaughtException', (e) => {
  console.error('❌ Error no controlado:', e);
  process.exit(1);
});
process.on('unhandledRejection', (e) => {
  console.error('❌ Promesa rechazada sin manejar:', e);
  process.exit(1);
});

detener = await iniciarCola(cfg);
