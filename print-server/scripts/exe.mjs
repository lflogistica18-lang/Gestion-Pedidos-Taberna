// Genera dist-exe/ImpresoraTaberna.exe (Windows x64, sin necesidad de instalar Node).
// Usa Bun (viene como devDependency): "bun build --compile" mete el runtime + el código en un solo .exe.
// La URL de Supabase y la clave anon (pública por diseño) se leen de ../.env (VITE_*) o de las
// variables de entorno SGP_SUPABASE_URL / SGP_SUPABASE_ANON_KEY, y se embeben en el build.
// NO se escriben en ningún archivo del repo.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function leerEnv(archivo) {
  const salida = {};
  let crudo = '';
  try {
    crudo = readFileSync(archivo, 'utf8');
  } catch {
    return salida;
  }
  for (const linea of crudo.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(linea);
    if (m) salida[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return salida;
}

const envFront = leerEnv(path.resolve(raiz, '..', '.env'));
const envLocal = leerEnv(path.resolve(raiz, '.env'));
const url = process.env.SGP_SUPABASE_URL || envFront.VITE_SUPABASE_URL || envLocal.SUPABASE_URL || '';
const clave = process.env.SGP_SUPABASE_ANON_KEY || envFront.VITE_SUPABASE_ANON_KEY || envLocal.SUPABASE_ANON_KEY || '';
if (!url || !clave) {
  console.error('Falta la URL o la clave anon de Supabase. Ponelas en ../.env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) o en SGP_SUPABASE_URL / SGP_SUPABASE_ANON_KEY.');
  process.exit(1);
}

const salidaDir = path.join(raiz, 'dist-exe');
mkdirSync(salidaDir, { recursive: true });
const salida = path.join(salidaDir, 'ImpresoraTaberna.exe');

// El paquete npm "bun" deja el ejecutable de la plataforma actual en bin/bun.exe (se llame así en Linux también).
const bun = path.join(raiz, 'node_modules', 'bun', 'bin', 'bun.exe');
const args = [
  'build', 'src/exe.ts',
  '--compile', '--target=bun-windows-x64', '--minify',
  '--outfile', salida,
  '--define', `process.env.SGP_SUPABASE_URL=${JSON.stringify(url)}`,
  '--define', `process.env.SGP_SUPABASE_ANON_KEY=${JSON.stringify(clave)}`,
];
const r = spawnSync(bun, args, { cwd: raiz, stdio: 'inherit' });
if (r.status !== 0) {
  console.error('No se pudo generar el .exe.');
  process.exit(r.status ?? 1);
}
console.log(`\nListo: ${salida} (${(statSync(salida).size / 1024 / 1024).toFixed(1)} MB)`);
