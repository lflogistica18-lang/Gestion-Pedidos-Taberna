/**
 * Relevo: al abrirse, el .exe nuevo desplaza al viejo, para que quien lo usa solo descargue y haga doble clic.
 *   1. cierra otras instancias del programa que estén abiertas;
 *   2. si el acceso directo de inicio de Windows apunta a otro .exe, lo reapunta a este;
 *   3. renombra el .exe viejo (agrega -VIEJO-NO-ABRIR) para que nadie lo abra por error.
 * Nada de esto puede frenar el arranque: cada paso va por separado y, si falla, avisa y sigue.
 */
import path from 'node:path';
import { cerrarOtrasInstancias, crearAccesoInicio, leerDestinoAccesoInicio, renombrarComoViejo } from './windows.js';

/** Compara rutas de Windows sin distinguir mayúsculas y normalizadas. */
export function mismaRuta(a: string, b: string): boolean {
  const n = (x: string) => path.win32.normalize(x.trim()).replace(/[\\/]+$/, '').toLowerCase();
  return n(a) === n(b);
}

/** true si corre como .exe compilado (y no como node, bun o tsx). */
export function esEjecutableCompilado(execPath: string): boolean {
  const nombre = path.win32.basename(execPath.replace(/\//g, '\\')).toLowerCase();
  return !/^(node|bun|tsx)(\.exe)?$/.test(nombre);
}

export interface OpcionesRelevo {
  /** Ruta de este .exe. */
  exe: string;
  /** PID propio (no se cierra). */
  pid: number;
  /** Cómo mostrar un aviso a la persona. */
  avisar: (linea: string) => void;
  /** Carpeta de inicio (solo para pruebas; por defecto la real de Windows). */
  carpetaInicio?: string;
  /** Prefijo del nombre de proceso a cerrar (solo para pruebas; por defecto 'ImpresoraTaberna'). */
  patron?: string;
}

export async function relevarAnterior(o: OpcionesRelevo): Promise<void> {
  // 1. Otras instancias abiertas
  try {
    const cerradas = await cerrarOtrasInstancias(o.pid, o.patron);
    if (cerradas > 0) o.avisar('Cerré el programita anterior que estaba abierto.');
  } catch {
    o.avisar('No pude revisar si había otro programita abierto; sigo igual.');
  }

  // 2. Acceso directo de inicio
  let viejo: string | null = null;
  try {
    const destino = await leerDestinoAccesoInicio(o.carpetaInicio);
    if (destino && !mismaRuta(destino, o.exe)) {
      await crearAccesoInicio(o.exe, o.carpetaInicio);
      viejo = destino;
      o.avisar('Listo: al prender la compu se va a abrir este programita nuevo.');
    }
  } catch {
    o.avisar('No pude cambiar el arranque automático al programita nuevo; sigo igual.');
  }

  // 3. Renombrar el .exe viejo
  if (viejo && /\.exe$/i.test(viejo)) {
    try {
      const nuevo = await renombrarComoViejo(viejo);
      if (nuevo) o.avisar(`Guardé el programita anterior como ${path.win32.basename(nuevo)} (no hace falta abrirlo nunca más).`);
    } catch {
      o.avisar('No pude renombrar el programita anterior; sigo igual.');
    }
  }
}
