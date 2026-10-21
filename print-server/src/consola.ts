/**
 * Entrada por consola para el asistente: preguntas, contraseña sin eco y pausa.
 * Una sola interfaz de lectura para todo el programa (si hubiera varias se perderían líneas
 * cuando la entrada viene por tubería, que es como se prueba).
 */
import readline from 'node:readline';
let rl: readline.Interface | null = null;
const lineas: string[] = [];
let esperando: { ok: (l: string) => void; fallo: (e: Error) => void } | null = null;
let cerrada = false;

function iniciar(): readline.Interface {
  if (rl) return rl;
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: Boolean(process.stdin.isTTY),
  });
  rl.on('line', (l) => {
    if (esperando) {
      const e = esperando;
      esperando = null;
      e.ok(l);
    } else lineas.push(l);
  });
  rl.on('close', () => {
    cerrada = true;
    if (esperando) {
      const e = esperando;
      esperando = null;
      e.fallo(new Error('Se cerró la entrada de texto.'));
    }
  });
  return rl;
}

function leerLinea(): Promise<string> {
  iniciar();
  const ya = lineas.shift();
  if (ya !== undefined) return Promise.resolve(ya);
  if (cerrada) return Promise.reject(new Error('Se cerró la entrada de texto.'));
  return new Promise((ok, fallo) => {
    esperando = { ok, fallo };
  });
}

export function decir(texto = ''): void {
  console.log(texto);
}

export async function preguntar(texto: string, porDefecto?: string): Promise<string> {
  process.stdout.write(texto + (porDefecto ? ` [${porDefecto}]` : '') + ': ');
  const r = (await leerLinea()).trim();
  return r || porDefecto || '';
}

/**
 * Contraseña: se muestra mientras se escribe. Ocultarla con readline silenciado fallaba en la
 * consola de Windows (Bun): llegaba con el Enter pegado o vacía. La compu es del local y se
 * escribe una sola vez; se limpia el fin de línea por si la consola manda \r.
 */
export async function preguntarClave(texto: string): Promise<string> {
  process.stdout.write(texto + ': ');
  return (await leerLinea()).replace(/[\r\n]+$/, '');
}

/** Pregunta de sí/no. Devuelve true para "s". */
export async function confirmar(texto: string, porDefectoSi = true): Promise<boolean> {
  for (;;) {
    const r = (await preguntar(`${texto} (${porDefectoSi ? 'S/n' : 's/N'})`)).toLowerCase();
    if (r === '') return porDefectoSi;
    if (['s', 'si', 'sí', 'y'].includes(r)) return true;
    if (['n', 'no'].includes(r)) return false;
    decir('   Respondé "s" para sí o "n" para no.');
  }
}

export async function pausa(texto = 'Apretá Enter para cerrar'): Promise<void> {
  try {
    await preguntar(texto);
  } catch {
    /* entrada cerrada: nada que esperar */
  }
}

export function cerrarConsola(): void {
  rl?.close();
}
