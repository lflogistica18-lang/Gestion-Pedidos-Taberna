/** Asistente de primera vez (consola, en castellano): usuario, impresora, ticket de prueba, arranque automático. */
import { createClient } from '@supabase/supabase-js';
import { aConfigCompleta, guardarConfigExe, urlYClave, type ConfigExe } from './configExe.js';
import { confirmar, decir, preguntar, preguntarClave } from './consola.js';
import { CODEPAGE_WPC1252, EscPos } from './escpos.js';
import { imprimir } from './impresora.js';
import { explicarErrorLogin } from './cola.js';
import { crearAccesoInicio, listarImpresoras, sugerirImpresora } from './windows.js';

interface OpcionesAsistente {
  simular: boolean;
  /** Ruta del .exe para el acceso directo de inicio. */
  exe: string;
  /** Valores a proponer si se está rehaciendo la configuración. */
  previa?: ConfigExe | null;
}

/** Ticket de prueba: con ñ, acentos, ¿ ¡ y $ para comprobar que la tabla de caracteres está bien. */
export function ticketDePrueba(columnas: number, codepage: number, nombreLocal = 'La Taberna'): EscPos {
  const e = new EscPos(columnas, codepage);
  const ahora = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false });
  e.alinear('centro').negrita(true).texto(`${nombreLocal} — impresora lista`).negrita(false);
  e.separador();
  e.alinear('izq');
  e.texto('Pingüino, ñandú, camión, árbol, ¿café?');
  e.texto('ÁÉÍÓÚ áéíóú Ññ Üü ¡Hola! 20°C');
  e.fila('2 x Hamburguesa completa', '$12.500');
  e.fila('TOTAL', '$25.000');
  e.separador();
  e.alinear('centro').linea(ahora);
  e.linea('Si ves esto bien, ya está todo listo.');
  e.feed(4).cortar();
  return e;
}

/** Imprime el ticket de prueba (o lo simula). Lanza error si no se pudo mandar. */
export async function imprimirPrueba(c: ConfigExe, simular: boolean): Promise<void> {
  const e = ticketDePrueba(c.columnas, c.codepage, c.nombreLocal || 'La Taberna');
  await imprimir(e.build(), e.comoTexto(), 'prueba', aConfigCompleta(c, simular));
}

/** Prueba usuario y contraseña contra Supabase. Devuelve null si anda, o el motivo en castellano. */
async function probarLogin(email: string, password: string): Promise<string | null> {
  const { url, clave } = urlYClave({});
  if (!url || !clave) return 'este programa no trae la dirección de Supabase (avisale a quien te lo pasó)';
  const supabase = createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) return explicarErrorLogin(error?.message);
    const rol = (data.user?.app_metadata as { rol?: string } | undefined)?.rol;
    await supabase.auth.signOut().catch(() => undefined);
    if (rol !== 'taberna') return 'ese usuario existe pero no tiene permiso de impresión (rol "taberna")';
    return null;
  } catch (e) {
    return explicarErrorLogin(e instanceof Error ? e.message : String(e));
  }
}

async function pedirUsuario(opc: OpcionesAsistente): Promise<{ email: string; password: string }> {
  decir('PASO 1 de 3 — Usuario de impresión');
  decir('   Es el usuario que te dieron para este programa (no es el de la app de pedidos).');
  for (;;) {
    const email = await preguntar('   Email', opc.previa?.email);
    const password = await preguntarClave('   Contraseña (no se ve mientras escribís)');
    if (!email || !password) {
      decir('   Faltó el email o la contraseña. Probemos de nuevo.\n');
      continue;
    }
    if (opc.simular) {
      decir('   (modo prueba: no verifico el usuario contra internet)');
      return { email, password };
    }
    decir('   Verificando…');
    const problema = await probarLogin(email, password);
    if (!problema) {
      decir('   Usuario correcto.\n');
      return { email, password };
    }
    decir(`   No pude entrar: ${problema}.`);
    if (!(await confirmar('   ¿Probamos de nuevo?'))) throw new Error('Se canceló la configuración.');
    decir('');
  }
}

async function elegirImpresora(previa?: string): Promise<string> {
  decir('PASO 2 de 3 — Impresora');
  for (;;) {
    const nombres = await listarImpresoras();
    if (nombres.length === 0) {
      decir('   Windows no tiene ninguna impresora instalada.');
      decir('   Enchufá la impresora del local, prendela, esperá un minuto y probamos de nuevo.');
      await preguntar('   Apretá Enter cuando esté lista');
      continue;
    }
    decir('   Estas son las impresoras de esta compu:');
    nombres.forEach((n, i) => decir(`      ${i + 1}. ${n}`));
    const sugerida = (previa && nombres.includes(previa) ? previa : null) ?? sugerirImpresora(nombres);
    const idxSug = sugerida ? nombres.indexOf(sugerida) + 1 : 0;
    const resp = await preguntar(
      idxSug ? `   Escribí el número de la impresora del local (Enter = ${idxSug})` : '   Escribí el número de la impresora del local',
      idxSug ? String(idxSug) : undefined,
    );
    const n = Number(resp);
    if (Number.isInteger(n) && n >= 1 && n <= nombres.length) {
      decir(`   Elegiste: ${nombres[n - 1]}\n`);
      return nombres[n - 1];
    }
    decir(`   "${resp}" no es un número de la lista. Probemos de nuevo.\n`);
  }
}

/** Devuelve la configuración guardada. Lanza Error si la persona cancela. */
export async function correrAsistente(opc: OpcionesAsistente): Promise<ConfigExe> {
  decir('==============================================');
  decir('  Impresora La Taberna — primera configuración');
  decir('==============================================');
  decir(opc.simular ? '  (MODO PRUEBA: no se imprime ni se guarda nada real)\n' : '  Son 3 pasos y tardás un par de minutos.\n');

  const { email, password } = await pedirUsuario(opc);
  let impresora = await elegirImpresora(opc.previa?.impresora);

  const config = (): ConfigExe => ({
    ...(opc.previa ?? {}),
    email,
    password,
    impresora,
    codepage: opc.previa?.codepage ?? CODEPAGE_WPC1252,
    columnas: opc.previa?.columnas ?? 48,
  });

  decir('PASO 3 de 3 — Ticket de prueba');
  for (;;) {
    decir(`   Mando un ticket de prueba a "${impresora}"…`);
    try {
      await imprimirPrueba(config(), opc.simular);
      if (await confirmar('   ¿Salió bien el ticket? (con las ñ y los acentos bien escritos)')) break;
      decir('   Si salió pero con símbolos raros, avisá a quien te instaló esto.');
    } catch (e) {
      decir(`   No pude imprimir: ${e instanceof Error ? e.message : String(e)}`);
    }
    const r = (await preguntar('   Escribí "r" para reintentar, "o" para elegir otra impresora, o "c" para cancelar', 'r')).toLowerCase();
    if (r === 'c') throw new Error('Se canceló la configuración.');
    if (r === 'o') impresora = await elegirImpresora(impresora);
  }

  const final = config();
  const ruta = await guardarConfigExe(final, opc.simular);
  decir(`\n   Configuración guardada en: ${ruta}`);

  if (opc.simular) {
    decir('   (modo prueba: no creo el acceso directo de inicio)\n');
  } else {
    try {
      await crearAccesoInicio(opc.exe);
      decir('   Listo: este programa se va a abrir solo cada vez que prendas la compu.');
      decir('   (Para sacar eso: ImpresoraTaberna.exe --quitar-inicio)\n');
    } catch (e) {
      decir(`   No pude dejarlo en el inicio de Windows: ${e instanceof Error ? e.message : String(e)}`);
      decir('   Igual funciona: solo tendrás que abrirlo a mano al prender la compu.\n');
    }
  }
  return final;
}
