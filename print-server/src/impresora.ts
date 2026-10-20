import net from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ConfigImpresora } from './config.js';
import { enviarRawWindows } from './windows.js';

export { ImpresoraNoDisponible } from './windows.js';

const TIMEOUT_MS = 8000;

/** Manda bytes crudos a la impresora por TCP (AppSocket / "raw", normalmente puerto 9100). */
export function enviar(buffer: Buffer, ip: string, puerto: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let terminado = false;
    const fin = (err?: Error) => {
      if (terminado) return;
      terminado = true;
      socket.destroy();
      if (err) reject(err);
      else resolve();
    };

    socket.setTimeout(TIMEOUT_MS);
    socket.once('timeout', () =>
      fin(new Error(`Tiempo de espera agotado (${TIMEOUT_MS / 1000} s) conectando a la impresora ${ip}:${puerto}. ¿Está prendida y en la misma red?`)),
    );
    socket.once('error', (err: NodeJS.ErrnoException) => {
      const motivo =
        err.code === 'ECONNREFUSED'
          ? 'la impresora rechazó la conexión (revisá IP y puerto)'
          : err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH'
            ? 'no se llega a esa IP (¿misma red/WiFi?)'
            : err.code === 'ETIMEDOUT'
              ? 'no responde'
              : err.message;
      fin(new Error(`No se pudo conectar con la impresora ${ip}:${puerto}: ${motivo}`));
    });
    socket.connect(puerto, ip, () => {
      socket.end(buffer, () => {
        // Damos un instante para que el SO termine de vaciar el buffer antes de cerrar.
        setTimeout(() => fin(), 150);
      });
    });
  });
}

/**
 * Punto único de salida: imprime de verdad (por red o en una impresora de Windows), o en modo SIMULAR muestra el texto
 * y guarda el binario en ./simulados/<id>.bin.
 */
export async function imprimir(buffer: Buffer, texto: string, id: string, cfg: ConfigImpresora): Promise<void> {
  if (cfg.simular) {
    const dir = cfg.dirSimulados ?? path.resolve('simulados');
    await mkdir(dir, { recursive: true });
    const archivo = path.join(dir, `${id}.bin`);
    await writeFile(archivo, buffer);
    console.log(`\n┌──── TICKET SIMULADO (${id}) ────`);
    console.log(texto);
    console.log(`└──── binario guardado en ${archivo}\n`);
    return;
  }
  if (cfg.tipo === 'windows') {
    await enviarRawWindows(buffer, cfg.impresoraWindows);
    return;
  }
  await enviar(buffer, cfg.ip, cfg.puerto);
}
