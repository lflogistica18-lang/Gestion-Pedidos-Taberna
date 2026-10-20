import 'dotenv/config';

export interface ConfigImpresora {
  ip: string;
  puerto: number;
  columnas: number;
  codepage: number;
  simular: boolean;
  nombreLocal: string;
}

export interface Config extends ConfigImpresora {
  supabaseUrl: string;
  supabaseAnonKey: string;
  printEmail: string;
  printPassword: string;
}

function texto(nombre: string): string {
  return (process.env[nombre] ?? '').trim();
}

function entero(nombre: string, porDefecto: number, min: number, max: number, errores: string[]): number {
  const crudo = texto(nombre);
  if (crudo === '') return porDefecto;
  const n = Number(crudo);
  if (!Number.isInteger(n) || n < min || n > max) {
    errores.push(`${nombre} debe ser un número entero entre ${min} y ${max} (valor actual: "${crudo}")`);
    return porDefecto;
  }
  return n;
}

function salirSiHayErrores(errores: string[]): void {
  if (errores.length === 0) return;
  console.error('\n❌ Falta configurar o hay errores en el archivo .env:\n');
  for (const e of errores) console.error('   - ' + e);
  console.error('\nRevisá el archivo .env (hay un modelo en .env.example) y volvé a iniciar.\n');
  process.exit(1);
}

/** Lee y valida SOLO lo necesario para hablar con la impresora (lo usa la hoja de prueba). */
export function cargarConfigImpresora(): ConfigImpresora {
  const errores: string[] = [];
  const simular = ['true', '1', 'si', 'sí'].includes(texto('SIMULAR').toLowerCase());
  const ip = texto('IMPRESORA_IP');
  if (!ip && !simular) errores.push('Falta IMPRESORA_IP (la IP de la impresora, ej: 192.168.1.50)');
  const puerto = entero('IMPRESORA_PUERTO', 9100, 1, 65535, errores);
  const columnas = entero('COLUMNAS', 48, 16, 96, errores);
  const codepage = entero('CODEPAGE', 2, 0, 255, errores);
  salirSiHayErrores(errores);
  return { ip, puerto, columnas, codepage, simular, nombreLocal: texto('NOMBRE_LOCAL') || 'La Taberna' };
}

/** Lee y valida toda la configuración (servidor completo). */
export function cargarConfig(): Config {
  const errores: string[] = [];
  const supabaseUrl = texto('SUPABASE_URL');
  const supabaseAnonKey = texto('SUPABASE_ANON_KEY');
  const printEmail = texto('PRINT_EMAIL');
  const printPassword = process.env.PRINT_PASSWORD ?? '';
  if (!supabaseUrl) errores.push('Falta SUPABASE_URL');
  if (!supabaseAnonKey) errores.push('Falta SUPABASE_ANON_KEY (clave anon, nunca la service key)');
  if (!printEmail) errores.push('Falta PRINT_EMAIL (usuario de la app con rol taberna)');
  if (!printPassword) errores.push('Falta PRINT_PASSWORD');
  // Validamos también lo de la impresora; si falta algo se informa todo junto.
  const imp = validarImpresoraSinSalir(errores);
  salirSiHayErrores(errores);
  return { supabaseUrl, supabaseAnonKey, printEmail, printPassword, ...imp };
}

function validarImpresoraSinSalir(errores: string[]): ConfigImpresora {
  const simular = ['true', '1', 'si', 'sí'].includes(texto('SIMULAR').toLowerCase());
  const ip = texto('IMPRESORA_IP');
  if (!ip && !simular) errores.push('Falta IMPRESORA_IP (la IP de la impresora, ej: 192.168.1.50)');
  const puerto = entero('IMPRESORA_PUERTO', 9100, 1, 65535, errores);
  const columnas = entero('COLUMNAS', 48, 16, 96, errores);
  const codepage = entero('CODEPAGE', 2, 0, 255, errores);
  return { ip, puerto, columnas, codepage, simular, nombreLocal: texto('NOMBRE_LOCAL') || 'La Taberna' };
}
