import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import type { Config } from './config.js';
import { armarTicket, ticketComoTexto, type OpcionesTicket, type Pedido } from './ticket.js';
import { imprimir, ImpresoraNoDisponible } from './impresora.js';

const MAX_INTENTOS = 3;
const REINTENTO_LOGIN_MS = 30_000;
const SONDEO_MS = 60_000;
const TRABADO_MS = 2 * 60_000;
const BACKOFF_MS = [5_000, 10_000, 20_000, 60_000];

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

/** Arranca la cola. Devuelve una función para detenerla limpiamente. */
export async function iniciarCola(cfg: Config, ui: InterfazCola = {}): Promise<() => Promise<void>> {
  if (ui.log) salida = ui.log;
  const supabase = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    db: { schema: 'sgp' },
    auth: { persistSession: false, autoRefreshToken: true },
  });

  let detenido = false;
  let canal: RealtimeChannel | null = null;
  let intentoCanal = 0;
  let timerCanal: NodeJS.Timeout | null = null;
  let timerSondeo: NodeJS.Timeout | null = null;

  const enProceso = new Set<string>();
  let cadena: Promise<void> = Promise.resolve();

  // ---------- Login ----------
  /** Un intento de login. Si anda, deja la sesión lista también para el canal en tiempo real. */
  async function intentarLogin(): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cfg.printEmail,
        password: cfg.printPassword,
      });
      if (!error && data.session) {
        await supabase.realtime.setAuth(data.session.access_token);
        return null;
      }
      return explicarErrorLogin(error?.message);
    } catch (e) {
      return explicarErrorLogin(msgError(e));
    }
  }

  while (!detenido) {
    const motivo = await intentarLogin();
    if (!motivo) {
      log(`🔐 Sesión iniciada como ${cfg.printEmail}`);
      break;
    }
    log(`⚠️ No se pudo iniciar sesión (${motivo}). Reintento en ${REINTENTO_LOGIN_MS / 1000} s`);
    await dormir(REINTENTO_LOGIN_MS);
  }

  // ---------- Trabajos trabados ----------
  async function resetearTrabados(): Promise<void> {
    const limite = new Date(Date.now() - TRABADO_MS).toISOString();
    const { data, error } = await supabase
      .from('print_jobs')
      .update({ estado: 'pendiente', updated_at: new Date().toISOString() })
      .eq('estado', 'imprimiendo')
      .lt('updated_at', limite)
      .select('id');
    if (error) {
      log(`⚠️ Error reseteando trabajos trabados: ${error.message}`);
      return;
    }
    // Los que este mismo proceso está imprimiendo ahora no pueden estar vencidos (timeout 8 s).
    if (data && data.length > 0) log(`♻️ ${data.length} trabajo(s) trabado(s) devuelto(s) a pendiente`);
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
        // intentos y se reprueba en el próximo repaso (cada minuto) hasta que la impresora vuelva.
        log(`⚠️ ${e.message} El pedido #${p.order_number} queda esperando.`);
        await actualizar(job.id, { estado: 'pendiente', ultimo_error: e.message }, 'No se pudo devolver el trabajo a la cola');
        return;
      }
      await fallar(job, msgError(e));
      return;
    }

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

  async function procesarPendientes(): Promise<boolean> {
    if (detenido) return true;
    const { data, error } = await supabase
      .from('print_jobs')
      .select('id')
      .eq('estado', 'pendiente')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (error) {
      log(`⚠️ Error consultando pendientes: ${explicarErrorLogin(error.message)}. Sigo intentando.`);
      return false;
    }
    for (const fila of data ?? []) encolar(fila.id as string);
    return true;
  }

  /** Después de un corte largo de internet la sesión puede vencerse: se vuelve a entrar sola. */
  async function repasar(): Promise<void> {
    await resetearTrabados();
    if (!(await procesarPendientes())) {
      const motivo = await intentarLogin();
      if (!motivo) {
        log('🔐 Sesión renovada');
        await procesarPendientes();
      }
    }
  }

  // ---------- Realtime ----------
  function suscribir(): void {
    if (detenido) return;
    if (canal) void supabase.removeChannel(canal);
    canal = supabase
      .channel('cola-impresion')
      .on('postgres_changes', { event: 'INSERT', schema: 'sgp', table: 'print_jobs' }, (payload) => {
        const nuevo = payload.new as { id?: string; estado?: string };
        if (nuevo.id && (!nuevo.estado || nuevo.estado === 'pendiente')) encolar(nuevo.id);
      })
      .subscribe((status, err) => {
        if (detenido) return;
        if (status === 'SUBSCRIBED') {
          log('📡 Escuchando la cola de impresión');
          intentoCanal = 0;
          void procesarPendientes();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          const espera = BACKOFF_MS[Math.min(intentoCanal, BACKOFF_MS.length - 1)];
          intentoCanal++;
          log(`⚠️ Canal en tiempo real: ${status}${err ? ' (' + err.message + ')' : ''}. Reintento en ${espera / 1000} s`);
          if (timerCanal) clearTimeout(timerCanal);
          timerCanal = setTimeout(suscribir, espera);
        }
      });
  }

  // ---------- Arranque ----------
  await resetearTrabados();
  await procesarPendientes();
  suscribir();
  timerSondeo = setInterval(() => {
    void repasar().catch((e) => log(`⚠️ Error en el repaso periódico: ${msgError(e)}`));
  }, SONDEO_MS);

  const destino = cfg.tipo === 'windows' ? `impresora de Windows '${cfg.impresoraWindows}'` : `${cfg.ip}:${cfg.puerto}`;
  log(`🚀 Servidor de impresión listo${cfg.simular ? ' (MODO SIMULADO)' : ` → ${destino}`}`);

  return async () => {
    detenido = true;
    if (timerSondeo) clearInterval(timerSondeo);
    if (timerCanal) clearTimeout(timerCanal);
    // Esperamos (hasta 10 s) a que termine la impresión en curso.
    await Promise.race([cadena, dormir(10_000)]);
    await supabase.removeAllChannels();
  };
}
