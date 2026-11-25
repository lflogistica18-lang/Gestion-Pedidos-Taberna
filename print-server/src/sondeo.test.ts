import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cicloSondeo, esErrorDeSesion, esperaLogin, esperaTrasFalla, type ResultadoVuelta } from './sondeo.js';

const MIN = 60_000;

/** Reloj falso: dormir solo avanza el tiempo simulado. Corta cuando pasa el límite. */
function simular(limiteMs: number, estado: () => 'ok' | 'caida' | 'sesion', loginAnda: () => boolean) {
  let t = 0;
  let enVuelo = 0;
  let maxEnVuelo = 0;
  let consultas = 0;
  let logins = 0;
  const horas: number[] = [];
  const avisos: string[] = [];
  const entrar = () => {
    enVuelo++;
    maxEnVuelo = Math.max(maxEnVuelo, enVuelo);
  };
  const run = cicloSondeo({
    ahora: () => t,
    dormir: async (ms) => {
      t += ms;
    },
    detenido: () => t >= limiteMs,
    aviso: (m) => avisos.push(m),
    vuelta: async (): Promise<ResultadoVuelta> => {
      entrar();
      consultas++;
      horas.push(t);
      await Promise.resolve();
      t += 50; // la consulta tarda 50 ms
      enVuelo--;
      const e = estado();
      if (e === 'ok') return { ok: true };
      return { ok: false, sesion: e === 'sesion', motivo: e === 'sesion' ? 'sesión vencida' : 'sin internet' };
    },
    relogin: async () => {
      entrar();
      logins++;
      await Promise.resolve();
      t += 50;
      enVuelo--;
      return loginAnda();
    },
  });
  return { run, datos: () => ({ consultas, logins, maxEnVuelo, avisos, horas, t }) };
}

test('a) todo bien: ~150 consultas en 10 minutos y nunca dos en vuelo', async () => {
  const s = simular(10 * MIN, () => 'ok', () => true);
  await s.run;
  const d = s.datos();
  assert.ok(d.consultas >= 140 && d.consultas <= 152, `consultas=${d.consultas}`);
  assert.equal(d.maxEnVuelo, 1);
  assert.equal(d.logins, 0);
  assert.equal(d.avisos.length, 0);
  console.log(`  consultas en 10 min: ${d.consultas}, máx. en vuelo: ${d.maxEnVuelo}`);
});

test('b) base caída 1 hora: menos de 30 pedidos en total y un solo aviso', async () => {
  const s = simular(60 * MIN, () => 'caida', () => true);
  await s.run;
  const d = s.datos();
  assert.ok(d.consultas + d.logins < 30, `pedidos=${d.consultas + d.logins}`);
  assert.equal(d.logins, 0, 'un error de red no debe disparar logins');
  assert.equal(d.maxEnVuelo, 1);
  assert.equal(d.avisos.length, 1);
  assert.match(d.avisos[0], /^Sin conexión con el servidor/);
  console.log(`  pedidos en 1 h caída: ${d.consultas + d.logins} (consultas ${d.consultas}, logins ${d.logins})`);
});

test('c) tras recuperarse vuelve a 4 s y avisa una sola vez (la base cae 5 min y vuelve)', async () => {
  let t = 0;
  const avisos: string[] = [];
  const horasOk: number[] = [];
  await cicloSondeo({
    ahora: () => t,
    dormir: async (ms) => {
      t += ms;
    },
    detenido: () => t >= 20 * MIN,
    aviso: (m) => avisos.push(m),
    vuelta: async () => {
      if (t < 5 * MIN) return { ok: false, sesion: false, motivo: 'sin internet' };
      horasOk.push(t);
      return { ok: true };
    },
    relogin: async () => true,
  });
  assert.deepEqual(avisos.map((a) => a.slice(0, 22)), ['Sin conexión con el se', 'Conexión recuperada']);
  for (let i = 1; i < horasOk.length; i++) assert.equal(horasOk[i] - horasOk[i - 1], 4_000);
  console.log(`  primer ok a los ${horasOk[0] / 1000} s, luego cada 4 s (${horasOk.length} vueltas buenas)`);
});

test('d) error de sesión permanente 1 hora (clave mal o usuario bloqueado): menos de 20 logins', async () => {
  const s = simular(60 * MIN, () => 'sesion', () => false);
  await s.run;
  const d = s.datos();
  assert.ok(d.logins < 20, `logins=${d.logins}`);
  assert.ok(d.logins >= 1);
  assert.ok(d.consultas + d.logins < 40, `pedidos=${d.consultas + d.logins}`);
  assert.equal(d.maxEnVuelo, 1);
  assert.equal(d.avisos.length, 1);
  console.log(`  logins en 1 h: ${d.logins}, consultas: ${d.consultas}`);
});

test('re-login que anda: renueva la sesión y se recupera', async () => {
  let vencida = true;
  const s = simular(10 * MIN, () => (vencida ? 'sesion' : 'ok'), () => {
    vencida = false;
    return true;
  });
  await s.run;
  const d = s.datos();
  assert.equal(d.logins, 1);
  assert.deepEqual(d.avisos.map((a) => a.slice(0, 15)), ['Sin conexión co', 'Conexión recupe']);
});

test('escalones de espera y tope de 300 s', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 50].map(esperaTrasFalla), [5, 10, 20, 40, 60, 120, 300, 300, 300].map((x) => x * 1000));
  assert.deepEqual([1, 2, 3, 4, 9].map(esperaLogin), [30, 60, 120, 300, 300].map((x) => x * 1000));
});

test('clasificación de errores de sesión', () => {
  assert.equal(esErrorDeSesion({ code: 'PGRST301', message: 'JWT expired' }), true);
  assert.equal(esErrorDeSesion({ message: 'JWT expired' }), true);
  assert.equal(esErrorDeSesion({ code: '42501', message: 'permission denied for table print_jobs' }), true);
  assert.equal(esErrorDeSesion({ message: 'TypeError: fetch failed' }), false);
  assert.equal(esErrorDeSesion({ message: 'ENOTFOUND' }), false);
});
