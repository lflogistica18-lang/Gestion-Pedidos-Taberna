/**
 * config.json del .exe: dónde vive y cómo se lee/guarda.
 * Se busca primero al lado del .exe y después en %APPDATA%\ImpresoraTaberna\.
 * Se guarda siempre en %APPDATA%\ImpresoraTaberna\ (no se pierde si mueven o borran el .exe).
 *
 * La URL de Supabase y la clave anon (pública por diseño) NO se piden: vienen embebidas
 * en el .exe al compilarlo (scripts/exe.mjs). Si el config.json trae las suyas, mandan esas.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Config } from './config.js';

export interface ConfigExe {
  email: string;
  password: string;
  /** Nombre exacto de la impresora en Windows. */
  impresora: string;
  codepage: number;
  columnas: number;
  nombreLocal?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

// El build reemplaza estas expresiones por el texto literal (bun --define).
const URL_EMBEBIDA = process.env.SGP_SUPABASE_URL ?? '';
const CLAVE_EMBEBIDA = process.env.SGP_SUPABASE_ANON_KEY ?? '';

export function carpetaDelExe(): string {
  const nombre = path.basename(process.execPath).toLowerCase();
  const esRuntime = ['node', 'node.exe', 'bun', 'bun.exe'].includes(nombre);
  return esRuntime ? process.cwd() : path.dirname(process.execPath);
}

export function carpetaDeDatos(): string {
  const forzada = process.env.TABERNA_CONFIG_DIR;
  if (forzada) return forzada;
  const appdata = process.env.APPDATA;
  return appdata ? path.join(appdata, 'ImpresoraTaberna') : carpetaDelExe();
}

function nombreArchivo(simular: boolean): string {
  return simular ? 'config.simulado.json' : 'config.json';
}

export function rutaDondeGuardar(simular: boolean): string {
  return path.join(carpetaDeDatos(), nombreArchivo(simular));
}

export async function leerConfigExe(simular: boolean): Promise<{ config: ConfigExe; ruta: string } | null> {
  const candidatas = [path.join(carpetaDelExe(), nombreArchivo(simular)), rutaDondeGuardar(simular)];
  if (process.env.TABERNA_CONFIG_DIR) candidatas.shift(); // en pruebas, solo la carpeta indicada
  for (const ruta of candidatas) {
    let crudo: string;
    try {
      crudo = await readFile(ruta, 'utf8');
    } catch {
      continue;
    }
    try {
      const j = JSON.parse(crudo.replace(/^﻿/, '')) as Partial<ConfigExe>;
      if (j.email && j.password && j.impresora) {
        return {
          ruta,
          config: {
            email: j.email,
            password: j.password,
            impresora: j.impresora,
            codepage: Number.isInteger(j.codepage) ? (j.codepage as number) : 16,
            columnas: Number.isInteger(j.columnas) ? (j.columnas as number) : 48,
            nombreLocal: j.nombreLocal,
            supabaseUrl: j.supabaseUrl,
            supabaseAnonKey: j.supabaseAnonKey,
          },
        };
      }
    } catch {
      /* JSON roto: se trata como si no existiera y el asistente lo rehace */
    }
  }
  return null;
}

export async function guardarConfigExe(c: ConfigExe, simular: boolean): Promise<string> {
  const ruta = rutaDondeGuardar(simular);
  await mkdir(path.dirname(ruta), { recursive: true });
  await writeFile(ruta, JSON.stringify(c, null, 2) + '\n', 'utf8');
  return ruta;
}

export function urlYClave(c: Pick<ConfigExe, 'supabaseUrl' | 'supabaseAnonKey'>): { url: string; clave: string } {
  return { url: c.supabaseUrl || URL_EMBEBIDA, clave: c.supabaseAnonKey || CLAVE_EMBEBIDA };
}

/** Arma la Config completa que usa la cola a partir del config.json. */
export function aConfigCompleta(c: ConfigExe, simular = false): Config {
  const { url, clave } = urlYClave(c);
  return {
    supabaseUrl: url,
    supabaseAnonKey: clave,
    printEmail: c.email,
    printPassword: c.password,
    tipo: 'windows',
    impresoraWindows: c.impresora,
    ip: '',
    puerto: 9100,
    columnas: c.columnas,
    codepage: c.codepage,
    simular,
    nombreLocal: c.nombreLocal || 'La Taberna',
    dirSimulados: path.join(carpetaDeDatos(), 'simulados'),
  };
}
