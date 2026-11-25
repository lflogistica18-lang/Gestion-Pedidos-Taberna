// Prueba REAL contra Windows (powershell.exe), desde WSL o Windows. No corre sola:
//   TABERNA_PRUEBA_WINDOWS=1 npm run test:windows
// Trabaja solo dentro de C:\Users\Public\Documents\prueba-relevo-taberna\ y con nombres de proceso
// de prueba (ImpresoraTabernaPRUEBA*) que no coinciden con el programa real. No toca la carpeta de inicio real.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { relevarAnterior } from './relevo.js';
import { leerDestinoAccesoInicio, crearAccesoInicio } from './windows.js';

// Desde WSL, las variables de entorno solo llegan a powershell.exe si están listadas en WSLENV (en Windows no hace falta).
process.env.WSLENV = ['TABERNA_PID', 'TABERNA_PATRON', 'TABERNA_NOMBRE', 'TABERNA_EXE', 'TABERNA_RUTA', 'TABERNA_CARPETA_INICIO'].join(':');

const activo = process.env.TABERNA_PRUEBA_WINDOWS === '1';
const BASE_WIN = 'C:\\Users\\Public\\Documents\\prueba-relevo-taberna';
const BASE_FS = process.platform === 'win32' ? BASE_WIN : '/mnt/c/Users/Public/Documents/prueba-relevo-taberna';

function psSimple(script: string): string {
  const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8' });
  return (r.stdout ?? '').trim();
}

function lanzarFalso(exeWin: string): number {
  // Copia de ping.exe con nombre de prueba, oculta, corre hasta que la cierren.
  const salida = psSimple(
    `Copy-Item C:\\Windows\\System32\\PING.EXE '${exeWin}' -Force; (Start-Process -FilePath '${exeWin}' -ArgumentList '-t','127.0.0.1' -WindowStyle Hidden -PassThru).Id`,
  );
  return Number(salida.split(/\r?\n/).pop());
}

function vivo(pid: number): boolean {
  return psSimple(`if (Get-Process -Id ${pid} -ErrorAction SilentlyContinue) { 'SI' } else { 'NO' }`) === 'SI';
}

test('relevo real en Windows: cierra el viejo, reapunta el acceso y renombra', { skip: !activo }, async () => {
  const id = Date.now().toString(36);
  const dir = `${BASE_WIN}\\${id}`;
  const dirFs = `${BASE_FS}/${id}`;
  mkdirSync(`${dirFs}/inicio`, { recursive: true });
  mkdirSync(`${dirFs}/viejo`, { recursive: true });
  mkdirSync(`${dirFs}/nuevo`, { recursive: true });
  const viejoExe = `${dir}\\viejo\\ImpresoraTaberna.exe`;
  const nuevoExe = `${dir}\\nuevo\\ImpresoraTaberna.exe`;
  writeFileSync(`${dirFs}/viejo/ImpresoraTaberna.exe`, 'viejo');
  writeFileSync(`${dirFs}/viejo/ImpresoraTaberna-VIEJO-NO-ABRIR.exe`, 'ya existia'); // fuerza el número
  copyFileSync(`${dirFs}/viejo/ImpresoraTaberna.exe`, `${dirFs}/nuevo/ImpresoraTaberna.exe`);
  const inicio = `${dir}\\inicio`;
  await crearAccesoInicio(viejoExe, inicio);
  assert.equal(await leerDestinoAccesoInicio(inicio), viejoExe);

  // Un "viejo corriendo" (ping renombrado) y un "propio" que NO debe cerrarse.
  const pidViejo = lanzarFalso(`${dir}\\ImpresoraTabernaPRUEBA.exe`);
  const pidPropio = lanzarFalso(`${dir}\\ImpresoraTabernaPRUEBA2.exe`);
  assert.ok(pidViejo > 0 && pidPropio > 0);
  try {
    assert.equal(vivo(pidViejo), true);
    const avisos: string[] = [];
    await relevarAnterior({ exe: nuevoExe, pid: pidPropio, avisar: (l) => avisos.push(l), carpetaInicio: inicio, patron: 'ImpresoraTabernaPRUEBA' });
    console.log(avisos.join('\n'));

    assert.equal(vivo(pidViejo), false, 'el viejo se cerró');
    assert.equal(vivo(pidPropio), true, 'el propio sigue vivo');
    assert.equal(await leerDestinoAccesoInicio(inicio), nuevoExe, 'acceso reapuntado');
    assert.equal(existsSync(`${dirFs}/viejo/ImpresoraTaberna.exe`), false);
    assert.equal(existsSync(`${dirFs}/viejo/ImpresoraTaberna-VIEJO-NO-ABRIR-2.exe`), true, 'renombrado con número');
    assert.equal(avisos.length, 3);
    assert.equal(avisos[0], 'Cerré el programita anterior que estaba abierto.');
    assert.equal(avisos[1], 'Listo: al prender la compu se va a abrir este programita nuevo.');
    assert.equal(avisos[2], 'Guardé el programita anterior como ImpresoraTaberna-VIEJO-NO-ABRIR-2.exe (no hace falta abrirlo nunca más).');

    // Segunda vez: no hay nada que hacer, no escribe nada.
    const avisos2: string[] = [];
    await relevarAnterior({ exe: nuevoExe, pid: pidPropio, avisar: (l) => avisos2.push(l), carpetaInicio: inicio, patron: 'ImpresoraTabernaPRUEBA' });
    assert.deepEqual(avisos2, []);
  } finally {
    psSimple(`Stop-Process -Id ${pidViejo},${pidPropio} -Force -ErrorAction SilentlyContinue`);
  }
});

test('relevo real: sin acceso directo no crea nada', { skip: !activo }, async () => {
  const id = `sin-${Date.now().toString(36)}`;
  mkdirSync(`${BASE_FS}/${id}/inicio`, { recursive: true });
  const avisos: string[] = [];
  await relevarAnterior({
    exe: `${BASE_WIN}\\${id}\\nuevo.exe`,
    pid: process.pid,
    avisar: (l) => avisos.push(l),
    carpetaInicio: `${BASE_WIN}\\${id}\\inicio`,
    patron: 'ImpresoraTabernaPRUEBA',
  });
  assert.deepEqual(avisos, []);
  assert.equal(existsSync(`${BASE_FS}/${id}/inicio/Impresora La Taberna.lnk`), false);
});
