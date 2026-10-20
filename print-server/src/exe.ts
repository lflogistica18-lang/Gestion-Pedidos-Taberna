/**
 * Punto de entrada del ejecutable de Windows (ImpresoraTaberna.exe).
 * Doble clic: si es la primera vez, asistente; si no, queda en marcha imprimiendo los pedidos.
 *
 * Opciones (para quien instala, el dueño no las necesita):
 *   --configurar      rehacer el asistente
 *   --quitar-inicio   sacar el arranque automático
 *   --prueba          imprimir un ticket de prueba y salir
 *   --impresoras      listar las impresoras de Windows y salir
 *   --simular         no imprime ni entra a internet: guarda los tickets en una carpeta (para probar)
 */
import { spawnSync } from 'node:child_process';
import { correrAsistente, imprimirPrueba } from './asistente.js';
import { iniciarCola } from './cola.js';
import { aConfigCompleta, carpetaDeDatos, leerConfigExe, urlYClave, type ConfigExe } from './configExe.js';
import { cerrarConsola, decir, pausa } from './consola.js';
import { listarImpresoras, quitarAccesoInicio } from './windows.js';

const TITULO = 'Impresora La Taberna';
const args = new Set(process.argv.slice(2).map((a) => a.toLowerCase()));
const simular = args.has('--simular') || args.has('--prueba-sin-imprimir');

function prepararVentana(): void {
  process.stdout.write(`\x1b]0;${TITULO}\x07`);
  if (process.platform === 'win32') {
    // Título clásico y salida en UTF-8 (para que se vean bien las ñ y los acentos).
    spawnSync('cmd.exe', ['/c', `title ${TITULO}`], { stdio: 'ignore', windowsHide: true });
    spawnSync('cmd.exe', ['/c', 'chcp 65001 >nul'], { stdio: ['inherit', 'ignore', 'ignore'], windowsHide: true });
  }
}

/** Línea para la ventana: sin emojis (algunas consolas de Windows los muestran como cuadraditos). */
function paraVentana(linea: string): string {
  return linea
    .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
    .replace(/(\]) {2,}/, '$1 ')
    .replace(/ {2,}/g, ' ')
    .trimEnd();
}

function salirConMensaje(msg: string): never {
  throw new Error(msg);
}

/** Devuelve true si el programa queda en marcha escuchando pedidos. */
async function principal(): Promise<boolean> {
  prepararVentana();

  if (args.has('--ayuda') || args.has('--help') || args.has('-h')) {
    decir(`${TITULO}\n`);
    decir('  (sin opciones)     queda esperando pedidos e imprimiéndolos');
    decir('  --configurar       volver a hacer el asistente (usuario, impresora)');
    decir('  --quitar-inicio    que deje de abrirse solo al prender la compu');
    decir('  --prueba           imprime un ticket de prueba y termina');
    decir('  --impresoras       muestra las impresoras de esta compu');
    decir('  --simular          prueba sin impresora ni internet');
    return false;
  }

  if (args.has('--quitar-inicio')) {
    const estaba = await quitarAccesoInicio();
    decir(estaba ? 'Listo: ya no se abre solo al prender la compu.' : 'No había nada que sacar: no estaba configurado el arranque automático.');
    return false;
  }

  if (args.has('--impresoras')) {
    const nombres = await listarImpresoras();
    decir('Impresoras de esta compu:');
    nombres.forEach((n, i) => decir(`  ${i + 1}. ${n}`));
    return false;
  }

  decir(`${TITULO}${simular ? ' (MODO PRUEBA)' : ''}\n`);

  const guardada = await leerConfigExe(simular);
  let config: ConfigExe;
  if (!guardada || args.has('--configurar')) {
    config = await correrAsistente({ simular, exe: process.execPath, previa: guardada?.config ?? null });
  } else {
    config = guardada.config;
  }

  if (args.has('--prueba') || simular) {
    decir(simular ? 'Modo prueba: genero el ticket de prueba sin mandarlo a la impresora…' : 'Mandando ticket de prueba…');
    await imprimirPrueba(config, simular);
    decir(simular ? 'Listo (modo prueba).' : 'Ticket de prueba enviado.');
    return false;
  }

  const cfg = aConfigCompleta(config);
  if (!urlYClave(config).url || !urlYClave(config).clave) {
    salirConMensaje('Este programa no trae la dirección de Supabase. Pedile a quien te lo pasó una versión nueva.');
  }

  decir(`Impresora: ${cfg.impresoraWindows}`);
  decir('Conectando con el sistema de pedidos…\n');
  await iniciarCola(cfg, {
    log: (l) => {
      const limpia = paraVentana(l);
      if (limpia) console.log(limpia);
    },
  });
  decir('\nEsperando pedidos…  (dejá esta ventana abierta; podés minimizarla)\n');
  return true;
}

// Si algo inesperado pasa, no cerramos: el local no puede quedarse sin impresión por un error suelto.
process.on('uncaughtException', (e) => console.error(`[error] Algo falló pero sigo funcionando: ${e instanceof Error ? e.message : String(e)}`));
process.on('unhandledRejection', (e) => console.error(`[error] Algo falló pero sigo funcionando: ${e instanceof Error ? e.message : String(e)}`));

try {
  const enMarcha = await principal();
  if (!enMarcha) {
    if (!simular && process.stdin.isTTY && !args.has('--ayuda') && !args.has('--help') && !args.has('-h')) {
      await pausa('\nApretá Enter para cerrar');
    }
    cerrarConsola();
    process.exit(0);
  }
  // En marcha: el programa sigue vivo por los timers y el canal de Supabase.
} catch (e) {
  console.error(`\nNo pude seguir: ${e instanceof Error ? e.message : String(e)}`);
  console.error(`(Carpeta de datos: ${carpetaDeDatos()})`);
  await pausa('\nApretá Enter para cerrar');
  process.exit(1);
}
