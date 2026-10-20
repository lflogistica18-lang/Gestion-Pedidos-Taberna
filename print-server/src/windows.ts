/**
 * Cosas que solo existen en Windows: listar impresoras, mandar bytes RAW (ESC/POS) al spooler
 * por nombre (sin compartir la impresora) y el acceso directo de arranque automático.
 *
 * Todo se hace con powershell.exe (viene con Windows 10/11): el script viaja en base64
 * (-EncodedCommand) y los datos por variables de entorno, así no hay problemas de comillas
 * ni de política de ejecución, y no queda ningún archivo .ps1 suelto. No hay dependencias nativas.
 */
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export class ImpresoraNoDisponible extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ImpresoraNoDisponible';
  }
}

const NOMBRE_ACCESO = 'Impresora La Taberna.lnk';

interface ResultadoPs {
  code: number;
  stdout: string;
  stderr: string;
}

function ps(script: string, env: Record<string, string> = {}, timeoutMs = 30_000): Promise<ResultadoPs> {
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { env: { ...process.env, ...env }, windowsHide: true, timeout: timeoutMs, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        const e = err as (NodeJS.ErrnoException & { killed?: boolean; code?: number | string }) | null;
        if (e && e.code === 'ENOENT') {
          reject(new Error('No encuentro PowerShell. Este programa solo funciona en Windows.'));
          return;
        }
        if (e && e.killed) {
          reject(new Error(`Windows tardó más de ${timeoutMs / 1000} segundos en responder.`));
          return;
        }
        const code = e ? (typeof e.code === 'number' ? e.code : 1) : 0;
        resolve({ code, stdout: String(stdout), stderr: String(stderr) });
      },
    );
  });
}

// ---------------------------------------------------------------------------
// Listar impresoras
// ---------------------------------------------------------------------------

/** Nombres de las impresoras instaladas en Windows (como en Configuración → Impresoras y escáneres). */
export async function listarImpresoras(): Promise<string[]> {
  const r = await ps(
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Printer | Sort-Object Name | ForEach-Object { $_.Name }',
  );
  if (r.code !== 0) throw new Error(`No pude leer la lista de impresoras de Windows. ${r.stderr.trim()}`.trim());
  return r.stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

const NO_SON_TICKETERAS = /pdf|onenote|fax|xps|anydesk|writer|snagit|send to/i;
const PARECE_TICKETERA = /pos|80|receipt|thermal|termica|térmica|ticket|dmn|epson|tm-|xprinter|generic/i;

/** Sugiere la impresora más probable de ser la comandera (o null si no hay una clara). */
export function sugerirImpresora(nombres: string[]): string | null {
  const candidatas = nombres.filter((n) => !NO_SON_TICKETERAS.test(n));
  const parecidas = candidatas.filter((n) => PARECE_TICKETERA.test(n));
  if (parecidas.length === 1) return parecidas[0];
  if (parecidas.length === 0 && candidatas.length === 1) return candidatas[0];
  return parecidas[0] ?? null;
}

// ---------------------------------------------------------------------------
// Impresión RAW
// ---------------------------------------------------------------------------

const SCRIPT_RAW = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFO {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
  [DllImport("winspool.Drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern bool OpenPrinter(string name, out IntPtr h, IntPtr defaults);
  [DllImport("winspool.Drv", SetLastError = true)]
  static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern bool StartDocPrinter(IntPtr h, int level, [In] DOCINFO di);
  [DllImport("winspool.Drv", SetLastError = true)]
  static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.Drv", SetLastError = true)]
  static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.Drv", SetLastError = true)]
  static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.Drv", SetLastError = true)]
  static extern bool WritePrinter(IntPtr h, byte[] bytes, int count, out int written);

  // Devuelve "OK" o "ERR <codigo de Windows> <paso>".
  public static string Send(string printer, byte[] data) {
    IntPtr h;
    if (!OpenPrinter(printer, out h, IntPtr.Zero)) return "ERR " + Marshal.GetLastWin32Error() + " abrir";
    try {
      DOCINFO di = new DOCINFO();
      di.pDocName = "Ticket La Taberna";
      di.pDataType = "RAW";
      if (!StartDocPrinter(h, 1, di)) return "ERR " + Marshal.GetLastWin32Error() + " documento";
      try {
        if (!StartPagePrinter(h)) return "ERR " + Marshal.GetLastWin32Error() + " pagina";
        int written;
        bool ok = WritePrinter(h, data, data.Length, out written);
        int err = Marshal.GetLastWin32Error();
        EndPagePrinter(h);
        if (!ok || written != data.Length) return "ERR " + err + " escribir";
      } finally {
        EndDocPrinter(h);
      }
    } finally {
      ClosePrinter(h);
    }
    return "OK";
  }
}
"@
$bytes = [System.IO.File]::ReadAllBytes($env:TABERNA_ARCHIVO)
[RawPrinterHelper]::Send($env:TABERNA_IMPRESORA, $bytes)
`;

/** Errores de Windows (winspool) que significan "esa impresora no está". */
const ERR_NOMBRE_INVALIDO = 1801;
const ERR_NO_ENCONTRADA = [1801, 3012, 2, 1722];

/**
 * Manda los bytes al spooler de Windows como documento RAW (ESC/POS) a la impresora con ese nombre.
 * Lanza ImpresoraNoDisponible si la impresora no existe / no se puede abrir.
 */
export async function enviarRawWindows(buffer: Buffer, nombre: string): Promise<void> {
  if (process.platform !== 'win32') {
    throw new Error('Imprimir en una impresora de Windows solo funciona en Windows.');
  }
  const dir = await mkdtemp(path.join(os.tmpdir(), 'taberna-'));
  const archivo = path.join(dir, 'ticket.bin');
  try {
    await writeFile(archivo, buffer);
    const r = await ps(SCRIPT_RAW, { TABERNA_ARCHIVO: archivo, TABERNA_IMPRESORA: nombre }, 45_000);
    const salida = r.stdout.trim().split(/\r?\n/).pop() ?? '';
    if (r.code === 0 && salida === 'OK') return;
    const m = /^ERR (\d+) (\w+)/.exec(salida);
    if (m) {
      const codigo = Number(m[1]);
      if (m[2] === 'abrir' && (codigo === ERR_NOMBRE_INVALIDO || ERR_NO_ENCONTRADA.includes(codigo))) {
        throw new ImpresoraNoDisponible(
          `No encuentro la impresora '${nombre}'. ¿Está prendida y enchufada? (Si le cambiaste el nombre en Windows, volvé a correr el asistente con --configurar.)`,
        );
      }
      if (m[2] === 'abrir') {
        throw new ImpresoraNoDisponible(
          `Windows no me deja usar la impresora '${nombre}' (error ${codigo}). ¿Está prendida y enchufada?`,
        );
      }
      throw new Error(`Windows no pudo mandar el ticket a '${nombre}' (error ${codigo} al ${m[2]}).`);
    }
    throw new Error(`No se pudo imprimir en '${nombre}'. ${(r.stderr || r.stdout).trim().slice(0, 300)}`.trim());
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Arranque automático (carpeta Inicio del usuario)
// ---------------------------------------------------------------------------

/** Crea (o actualiza) el acceso directo en shell:startup que abre este programa al prender la compu. */
export async function crearAccesoInicio(exe: string): Promise<string> {
  const r = await ps(
    `$d = [Environment]::GetFolderPath('Startup')
$ruta = Join-Path $d $env:TABERNA_NOMBRE
$w = New-Object -ComObject WScript.Shell
$l = $w.CreateShortcut($ruta)
$l.TargetPath = $env:TABERNA_EXE
$l.WorkingDirectory = Split-Path -Parent $env:TABERNA_EXE
$l.Description = 'Impresora La Taberna'
$l.Save()
$ruta`,
    { TABERNA_EXE: exe, TABERNA_NOMBRE: NOMBRE_ACCESO },
  );
  if (r.code !== 0) throw new Error(`No pude crear el acceso directo de inicio. ${r.stderr.trim()}`.trim());
  return r.stdout.trim();
}

/** Borra el acceso directo de arranque automático. Devuelve true si existía. */
export async function quitarAccesoInicio(): Promise<boolean> {
  const r = await ps(
    `$ruta = Join-Path ([Environment]::GetFolderPath('Startup')) $env:TABERNA_NOMBRE
if (Test-Path $ruta) { Remove-Item $ruta -Force; 'QUITADO' } else { 'NO_ESTABA' }`,
    { TABERNA_NOMBRE: NOMBRE_ACCESO },
  );
  if (r.code !== 0) throw new Error(`No pude quitar el acceso directo de inicio. ${r.stderr.trim()}`.trim());
  return r.stdout.includes('QUITADO');
}
