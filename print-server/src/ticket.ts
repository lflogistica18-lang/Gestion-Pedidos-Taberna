import { EscPos, envolver } from './escpos.js';

export interface ItemPedido {
  product_name: string;
  unit_price: number | string;
  quantity: number;
  subtotal: number | string;
  notes?: string | null;
}

export interface Pedido {
  id?: string;
  order_number: number;
  type: 'local' | 'delivery' | 'directo' | string;
  payment_method: 'efectivo' | 'debito' | 'transferencia' | string;
  total: number | string;
  notes?: string | null;
  customer_name?: string | null;
  delivery_address?: string | null;
  created_at: string;
  order_items?: ItemPedido[] | null;
}

export interface OpcionesTicket {
  nombreLocal: string;
  columnas: number;
  codepage: number;
}

const ZONA = 'America/Argentina/Buenos_Aires';

const TIPOS: Record<string, string> = { local: 'Local', delivery: 'Delivery', directo: 'Directo' };
const PAGOS: Record<string, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  transferencia: 'Déb / Transfer',
};

function conMiles(entero: string): string {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Formato es-AR: $1.234 si es entero, $1.234,50 si no. */
export function formatoPlata(valor: number | string): string {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '$?';
  const signo = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (Number.isInteger(abs)) return `${signo}$${conMiles(String(abs))}`;
  const [ent, dec] = abs.toFixed(2).split('.');
  return `${signo}$${conMiles(ent)},${dec}`;
}

/** dd/mm/aaaa hh:mm en hora de Buenos Aires. */
export function formatoFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const partes = new Intl.DateTimeFormat('es-AR', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? '';
  return `${p('day')}/${p('month')}/${p('year')} ${p('hour')}:${p('minute')}`;
}

function construir(pedido: Pedido, op: OpcionesTicket): EscPos {
  const e = new EscPos(op.columnas, op.codepage);

  e.alinear('centro').negrita(true).texto(op.nombreLocal).negrita(false);
  e.doble(true).texto(`PEDIDO #${pedido.order_number}`).doble(false);
  e.alinear('izq');
  e.linea(formatoFecha(pedido.created_at));
  e.negrita(true).linea(`Tipo: ${TIPOS[pedido.type] ?? pedido.type}`).negrita(false);
  e.linea(`Pago: ${PAGOS[pedido.payment_method] ?? pedido.payment_method}`);
  if (pedido.customer_name?.trim()) e.texto(`Cliente: ${pedido.customer_name}`);
  if (pedido.delivery_address?.trim()) {
    e.negrita(true).texto(`Dirección: ${pedido.delivery_address}`).negrita(false);
  }
  e.separador();

  for (const it of pedido.order_items ?? []) {
    e.fila(`${it.quantity} x ${it.product_name}`, formatoPlata(it.subtotal));
    if (it.quantity > 1) e.linea(`    ${formatoPlata(it.unit_price)} c/u`);
    if (it.notes?.trim()) {
      envolver(it.notes, op.columnas - 6).forEach((l, i) => e.linea((i === 0 ? '    > ' : '      ') + l));
    }
  }
  e.separador();

  if (pedido.notes?.trim()) {
    e.negrita(true).linea('NOTAS:').negrita(false);
    e.texto(pedido.notes);
    e.feed(1);
  }

  // En doble tamaño entran columnas/2 caracteres por línea.
  e.doble(true).fila('TOTAL', formatoPlata(pedido.total)).doble(false);
  e.feed(1);
  e.alinear('centro').linea('¡Gracias por su compra!').alinear('izq');
  e.feed(4);
  e.cortar();
  return e;
}

/** Función pura: pedido -> bytes ESC/POS listos para mandar a la impresora. */
export function armarTicket(pedido: Pedido, opciones: OpcionesTicket): Buffer {
  return construir(pedido, opciones).build();
}

/** Mismo ticket, como texto legible (modo simulado y verificación). */
export function ticketComoTexto(pedido: Pedido, opciones: OpcionesTicket): string {
  return construir(pedido, opciones).comoTexto();
}
