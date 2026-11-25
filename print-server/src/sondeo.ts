// Lógica de tiempos del sondeo. Módulo PURO: sin Supabase y sin reloj real
// (el reloj y el "dormir" se inyectan), así se prueba con tiempo simulado.
//
// Regla de oro: un único ciclo encadenado. Termina una vuelta y recién ahí programa la
// siguiente; nunca hay dos pedidos a la base en vuelo desde el ciclo. Si falla, la espera
// crece hasta un tope de 5 minutos y ahí se queda hasta que una vuelta salga bien.
// (El bucle de reconexión de Realtime tiró la base compartida el 2026-11-21: ver README.)

export const SONDEO_MS = 4_000;
/** Espera tras 1, 2, 3... fallas seguidas. La última se repite para siempre (tope). */
export const ESPERA_FALLA_MS = [5_000, 10_000, 20_000, 40_000, 60_000, 120_000, 300_000];
/** Espera tras 1, 2, 3... logins fallidos. La última es el tope. */
export const ESPERA_LOGIN_MS = [30_000, 60_000, 120_000, 300_000];
/** Mínimo entre dos re-logins, pase lo que pase. */
export const MIN_ENTRE_LOGINS_MS = 60_000;
/** Pausa corta tras renovar la sesión con éxito, para probar de nuevo enseguida. */
export const ESPERA_TRAS_RELOGIN_MS = 2_000;
/** Cada cuánto como máximo se devuelven a pendiente los trabajos trabados. */
export const RESET_TRABADOS_MS = 60_000;

export type ResultadoVuelta = { ok: true } | { ok: false; sesion: boolean; motivo: string };

export function esperaTrasFalla(fallasSeguidas: number): number {
  return ESPERA_FALLA_MS[Math.min(Math.max(fallasSeguidas, 1), ESPERA_FALLA_MS.length) - 1];
}

export function esperaLogin(loginsFallidos: number): number {
  return ESPERA_LOGIN_MS[Math.min(Math.max(loginsFallidos, 1), ESPERA_LOGIN_MS.length) - 1];
}

/** ¿El error de la base es de sesión/autorización (y no de red)? Solo en ese caso se vuelve a loguear. */
export function esErrorDeSesion(e: { code?: string | null; message?: string | null; status?: number | null }): boolean {
  if (e.status === 401 || e.status === 403) return true;
  const code = (e.code ?? '').toUpperCase();
  if (code === 'PGRST301' || code === 'PGRST302' || code === 'PGRST303' || code === '42501') return true;
  return /jwt|token|not authenticated|unauthorized|permission denied|invalid claim|session/i.test(e.message ?? '');
}

export class PlanSondeo {
  fallas = 0;
  loginsFallidos = 0;
  ultimoLogin = -Infinity;

  /** Una vuelta salió bien. Devuelve true si veníamos fallando (hay que avisar "recuperada"). */
  alOk(): boolean {
    const venia = this.fallas > 0;
    this.fallas = 0;
    return venia;
  }

  /** Una vuelta falló. Devuelve cuánto esperar antes de la próxima. */
  alFallar(): number {
    this.fallas++;
    return esperaTrasFalla(this.fallas);
  }

  /** Nunca más de un re-login por minuto; con logins fallidos seguidos, respeta la espera creciente. */
  puedeRelogin(ahora: number): boolean {
    const minimo = this.loginsFallidos > 0 ? Math.max(MIN_ENTRE_LOGINS_MS, esperaLogin(this.loginsFallidos)) : MIN_ENTRE_LOGINS_MS;
    return ahora - this.ultimoLogin >= minimo;
  }

  registrarLogin(ahora: number, ok: boolean): void {
    this.ultimoLogin = ahora;
    this.loginsFallidos = ok ? 0 : this.loginsFallidos + 1;
  }
}

export interface DepsCiclo {
  ahora: () => number;
  dormir: (ms: number) => Promise<void>;
  /** Una vuelta completa (consulta de pendientes, y reseteo de trabados si toca). Un pedido a la vez. */
  vuelta: () => Promise<ResultadoVuelta>;
  /** Un intento de re-login. true si anduvo. */
  relogin: () => Promise<boolean>;
  detenido: () => boolean;
  /** Mensajes para la ventana. Se llama solo al empezar a fallar y al recuperarse. */
  aviso: (msg: string) => void;
}

export async function cicloSondeo(d: DepsCiclo): Promise<void> {
  const plan = new PlanSondeo();
  while (!d.detenido()) {
    let r: ResultadoVuelta;
    try {
      r = await d.vuelta();
    } catch (e) {
      r = { ok: false, sesion: false, motivo: e instanceof Error ? e.message : String(e) };
    }
    if (d.detenido()) return;

    if (r.ok) {
      if (plan.alOk()) d.aviso('Conexión recuperada');
      await d.dormir(SONDEO_MS);
      continue;
    }

    const primera = plan.fallas === 0;
    let espera = plan.alFallar();
    if (r.sesion && plan.puedeRelogin(d.ahora())) {
      let ok = false;
      try {
        ok = await d.relogin();
      } catch {
        ok = false;
      }
      plan.registrarLogin(d.ahora(), ok);
      espera = ok ? ESPERA_TRAS_RELOGIN_MS : Math.max(espera, esperaLogin(plan.loginsFallidos));
    }
    if (primera) d.aviso(`Sin conexión con el servidor (${r.motivo}). Reintento en ${Math.round(espera / 1000)} s`);
    await d.dormir(espera);
  }
}
