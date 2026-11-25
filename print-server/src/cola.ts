import { createClient } from '@supabase/supabase-js';
import type { Config } from './config.js';
import { armarTicket, ticketComoTexto, type OpcionesTicket, type Pedido } from './ticket.js';
import { imprimir, ImpresoraNoDisponible } from './impresora.js';
import { cicloSondeo, esErrorDeSesion, esperaLogin, PausaImpresora, RESET_TRABADOS_MS, type ResultadoVuelta } from './sondeo.js';

const MAX_INTENTOS = 3;
const TRABADO_MS = 2 * 60_000;

interface TrabajoTomado {
  id: string;
  order_id: string;
  intentos: number;
}

function hora(): string {
  return new Date().toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour12: false,
  });
}
/** Por defecto escribe en consola; el .exe pasa su propia salida (sin emojis, en la ventana). */
let salida: (linea: string) => void = (linea) => console.log(linea);
function log(msg: string): void {
  salida(`[${hora()}] ${msg}`);
}

/** Traduce los errores técnicos de inicio de sesión a algo que se entienda. */
export function explicarErrorLogin(mensaje: string | undefined): string {
  const m = (mensaje ?? '').toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid_credentials')) {
    return 'el email o la contraseña no coinciden';
  }
  if (m.includes('fetch') || m.includes('network') || m.includes('econn') || m.includes('enotfound') || m.includes('timed out') || m.includes('unable to connect')) {
    return 'no hay internet o no se llega al servidor';
  }
  return mensaje ?? 'sin sesión';
}

export interface InterfazCola {
  /** Dónde escribir cada línea (por defecto, la consola). */
  log?: (linea: string) => void;
}
function msgError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function fallo(e: { code?: string | null; message?: string | null }): ResultadoVuelta {
  return { ok: false, sesion: esErrorDeSesion(e), motivo: explicarErrorLogin(e.message ?? undefined) };
}

/** Arranca la cola. Devuelve una función para detenerla limpiamente. */
export async function iniciarCola(cfg: Config, ui: InterfazCola = {}): Promise<() => Promise<void>> {
  if (ui.log) salida = ui.log;
  const supabase = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    db: { schema: 'sgp' },
    // Sin renovación automática en segundo plano: la sesión se renueva solo desde el sondeo,
    // cuando la base contesta error de sesión (como mucho una vez por minuto). Sin Realtime.
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let detenido = false;
  let despertar: (() => void) | null = null;
  /** Espera que se puede cortar al detener el programa. */
  const dormirCortable = (ms: number) =>
    new Promise<void>((resolver) => {
      const t = setTimeout(() => {
        despertar = null;
        resolver();
      }, ms);
      despertar = () => {
        clearTimeout(t);
        despertar = null;
        resolver();
      };
    });
  let ultimoReseteo = 0;
  const pausa = new PausaImpresora();

  const enProceso = new Set<string>();
  let cadena: Promise<void> = Promise.resolve();

  // ---------- Login ----------
  /** Un intento de login. Devuelve null si anduvo, o el motivo del fallo. */
  async function intentarLogin(): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cfg.printEmail,
        password: cfg.printPassword,
      });
      if (!error && data.session) return null;
      return explicarErrorLogin(error?.message);
    } catch (e) {
      return explicarErrorLogin(msgError(e));
    }
  }

  // Login inicial: espera creciente 30 s, 1, 2 y 5 min (tope). El aviso sale solo la primera vez.
  for (let fallidos = 1; !detenido; fallidos++) {
    const motivo = await intentarLogin();
    if (!motivo) {
      log(fallidos > 1 ? `🔐 Sesión iniciada como ${cfg.printEmail} (conexión recuperada)` : `🔐 Sesión iniciada como ${cfg.printEmail}`);
      break;
    }
    const espera = esperaLogin(fallidos);
    if (fallidos === 1) log(`⚠️ No se pudo iniciar sesión (${motivo}). Reintento en ${espera / 1000} s (y cada vez más espaciado)`);
    await dormirCortable(espera);
  }

  // ---------- Trabajos trabados ----------
  async function resetearTrabados(): Promise<ResultadoVuelta> {
    const limite = new Date(Date.now() - TRABADO_MS).toISOString();
    const { data, error } = await supabase
      .from('print_jobs')
      .update({ estado: 'pendiente', updated_at: new Date().toISOString() })
      .eq('estado', 'imprimiendo')
      .lt('updated_at', limite)
      .select('id');
    if (error) return fallo(error);
    // Los que este mismo proceso está imprimiendo ahora no pueden estar vencidos (timeout 8 s).
    if (data && data.length > 0) log(`♻️ ${data.length} trabajo(s) trabado(s) devuelto(s) a pendiente`);
    return { ok: true };
  }

  // ---------- Configuración del local (pantalla Configuración de la app) ----------
  // Se lee en cada ticket: si alguien cambia el nombre o el papel, el próximo ticket
  // ya sale bien sin reiniciar. Si falla (o falta la migración 012), se usa el .env.
  async function opcionesDelLocal(): Promise<OpcionesTicket> {
    const base: OpcionesTicket = { nombreLocal: cfg.nombreLocal, columnas: cfg.columnas, codepage: cfg.codepage };
    const { data, error } = await supabase
      .from('configuracion')
      .select('nombre_local, direccion, telefono, papel_mm, pie_ticket')
      .maybeSingle();
    if (error || !data) {
      log(`⚠️ No se pudo leer la configuración del local (${error?.message ?? 'sin fila'}); uso el .env`);
      return base;
    }
    return {
      ...base,
      nombreLocal: data.nombre_local || base.nombreLocal,
      direccion: data.direccion,
      telefono: data.telefono,
      pie: data.pie_ticket ?? undefined,
      // 80 mm → 48 columnas (Font A); 58 mm → 32
      columnas: data.papel_mm === 58 ? 32 : 48,
    };
  }

  // ---------- Procesamiento de un trabajo ----------
  async function actualizar(id: string, cambios: Record<string, unknown>, contexto: string): Promise<boolean> {
    for (let i = 1; i <= 3; i++) {
      const { error } = await supabase
        .from('print_jobs')
        .update({ ...cambios, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (!error) return true;
      log(`⚠️ ${contexto} (trabajo ${id}, intento ${i}/3): ${error.message}`);
      if (i < 3) await dormir(1000);
    }
    return false;
  }

  async function fallar(job: TrabajoTomado, mensaje: string, definitivo = false): Promise<void> {
    const intentos = job.intentos + 1;
    const estado = definitivo || intentos >= MAX_INTENTOS ? 'error' : 'pendiente';
    log(`⚠️ Falló la impresión del trabajo ${job.id} (intento ${intentos}/${MAX_INTENTOS}): ${mensaje}${estado === 'error' ? ' — queda en ERROR' : ' — se reintentará'}`);
    await actualizar(job.id, { intentos, ultimo_error: mensaje, estado }, 'No se pudo registrar el fallo');
  }

  async function procesar(id: string): Promise<void> {
    // Impresora en pausa: no se toca la base. El trabajo sigue 'pendiente' y se retoma al terminar la pausa.
    if (pausa.activa(Date.now())) return;
    // Tomar de forma atómica: solo uno lo logra.
    const { data: tomado, error: errTomar } = await supabase
      .from('print_jobs')
      .update({ estado: 'imprimiendo', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('estado', 'pendiente')
      .select('id, order_id, intentos');
    if (errTomar) {
      log(`⚠️ No se pudo tomar el trabajo ${id}: ${errTomar.message}`);
      return;
    }
    if (!tomado || tomado.length === 0) return; // ya lo tomó otro
    const job = tomado[0] as TrabajoTomado;
    job.intentos = job.intentos ?? 0;

    const { data: pedido, error: errPedido } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', job.order_id)
      .single();
    if (errPedido || !pedido) {
      const noExiste = errPedido?.code === 'PGRST116' || !pedido;
      await fallar(job, `No se pudo leer el pedido ${job.order_id}: ${errPedido?.message ?? 'no existe'}`, noExiste);
      return;
    }

    const p = pedido as Pedido;
    const opciones = await opcionesDelLocal();
    try {
      await imprimir(armarTicket(p, opciones), ticketComoTexto(p, opciones), job.id, cfg);
    } catch (e) {
      if (e instanceof ImpresoraNoDisponible) {
        // Impresora apagada o desenchufada: no es culpa del pedido. Vuelve a la cola sin gastar
        // intentos y se activa una pausa creciente (30 s a 5 min) sin tomar trabajos hasta que la impresora vuelva.
        const { espera, primera } = pausa.alNoDisponible(Date.now());
        if (primera) log(`⚠️ La impresora no responde. Los tickets quedan esperando; reintento en ${Math.round(espera / 1000)} s`);
        await actualizar(job.id, { estado: 'pendiente', ultimo_error: e.message }, 'No se pudo devolver el trabajo a la cola');
        return;
      }
      await fallar(job, msgError(e));
      return;
    }

    if (pausa.alImprimirBien()) log('🖨️ La impresora volvió a imprimir');
    const ok = await actualizar(
      job.id,
      { estado: 'impreso', impreso_at: new Date().toISOString(), ultimo_error: null },
      'El ticket se imprimió pero no se pudo marcar como impreso',
    );
    log(ok ? `🧾 Pedido #${p.order_number} impreso` : `🧾 Pedido #${p.order_number} impreso (¡pero no se pudo marcar en la base!)`);
  }

  /** Encola en serie, sin duplicar ids que ya están en proceso. */
  function encolar(id: string): void {
    if (detenido || enProceso.has(id)) return;
    enProceso.add(id);
    cadena = cadena
      .then(() => procesar(id))
      .catch((e) => log(`⚠️ Error inesperado procesando ${id}: ${msgError(e)}`))
      .finally(() => {
        enProceso.delete(id);
      });
  }

  async function procesarPendientes(): Promise<ResultadoVuelta> {
    if (detenido) return { ok: true };
    const { data, error } = await supabase
      .from('print_jobs')
      .select('id')
      .eq('estado', 'pendiente')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (error) return fallo(error);
    for (const fila of data ?? []) encolar(fila.id as string);
    return { ok: true };
  }

  /** Una vuelta del sondeo: reseteo de trabados (como mucho 1 por minuto) y consulta de pendientes, de a una. */
  async function vuelta(): Promise<ResultadoVuelta> {
    // Con la impresora en pausa no se pide nada a la base.
    if (pausa.activa(Date.now())) return { ok: true };
    if (Date.now() - ultimoReseteo >= RESET_TRABADOS_MS) {
      ultimoReseteo = Date.now();
      const r = await resetearTrabados();
      if (!r.ok) return r;
    }
    return procesarPendientes();
  }

  // ---------- Sondeo (sin Realtime) ----------
  // Un único ciclo encadenado; ver sondeo.ts. Sin setInterval, sin canales, sin websocket.
  const ciclo = cicloSondeo({
    ahora: () => Date.now(),
    dormir: dormirCortable,
    vuelta,
    relogin: async () => (await intentarLogin()) === null,
    detenido: () => detenido,
    aviso: log,
  }).catch((e) => log(`⚠️ El sondeo se detuvo por un error inesperado: ${msgError(e)}`));

  const destino = cfg.tipo === 'windows' ? `impresora de Windows '${cfg.impresoraWindows}'` : `${cfg.ip}:${cfg.puerto}`;
  log(`🚀 Servidor de impresión listo${cfg.simular ? ' (MODO SIMULADO)' : ` → ${destino}`}`);

  return async () => {
    detenido = true;
    if (despertar) despertar();
    // Esperamos (hasta 10 s) a que termine la impresión en curso y el ciclo.
    await Promise.race([Promise.all([cadena, ciclo]), dormir(10_000)]);
  };
}
